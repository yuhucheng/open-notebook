import json
from pathlib import Path
from typing import Dict, Optional, List, Union

from langgraph.graph import END, START, StateGraph
from loguru import logger

from podcast_creator.nodes import (
    combine_audio_node,
    generate_all_audio_node,
    route_audio_generation,
)
from podcast_creator.speakers import load_speaker_config
from podcast_creator.episodes import load_episode_config
from podcast_creator.state import PodcastState
from podcast_creator.core import Outline, Segment, Dialogue, Transcript

# Import speech script domain models
try:
    from open_notebook.domain.speech_script import SpeechScript, OutlineSection
except ImportError:
    logger.warning("Speech script domain models not available, speech graph functionality will be limited")


class PodcastSpeechState(PodcastState):
    """Extended state for speech script based podcast generation"""
    speech_script_id: str


async def generate_speech_outline_node(state: PodcastSpeechState, config) -> Dict:
    """Generate outline from speech script outline sections"""
    logger.info("Starting speech outline generation")

    speech_script_id = state["speech_script_id"]

    # Get speech script and outline sections
    speech_script = await SpeechScript.get(speech_script_id)
    if not speech_script:
        raise ValueError(f"Speech script {speech_script_id} not found")

    outline_sections = await speech_script.get_outline_sections()
    if not outline_sections:
        raise ValueError(f"No outline sections found for speech script {speech_script_id}")

    # Convert outline sections to segments
    segments = []
    for section in outline_sections:
        # Map section to segment - use title as name, outline as description
        segment = Segment(
            name=section.title,
            description=section.outline,
            size="medium"  # Default size, could be made configurable
        )
        segments.append(segment)

    outline = Outline(segments=segments)

    logger.info(f"Generated speech outline with {len(segments)} segments from speech script")

    return {"outline": outline}


async def generate_speech_transcript_node(state: PodcastSpeechState, config) -> Dict:
    """Generate transcript from speech script outline sections"""
    logger.info("Starting speech transcript generation")

    assert state.get("outline") is not None, "outline must be provided"
    assert state.get("speaker_profile") is not None, "speaker_profile must be provided"

    speech_script_id = state["speech_script_id"]
    speaker_profile = state["speaker_profile"]
    outline = state["outline"]

    # Get speech script and outline sections
    speech_script = await SpeechScript.get(speech_script_id)
    if not speech_script:
        raise ValueError(f"Speech script {speech_script_id} not found")

    outline_sections = await speech_script.get_outline_sections()

    # Get speaker names for validation
    speaker_names = speaker_profile.get_speaker_names()
    if not speaker_names:
        raise ValueError("No speakers configured in speaker profile")

    # Convert each outline section to dialogue segments
    transcript = []
    for i, section in enumerate(outline_sections):
        # Use the script content as dialogue
        dialogue_text = section.script.strip()
        if not dialogue_text:
            logger.warning(f"Empty script content for section {section.title}, skipping")
            continue

        # For speech scripts, we'll use the first available speaker
        # In a real implementation, you might want to alternate speakers or use speaker detection
        speaker = speaker_names[0]  # Use first speaker as default

        dialogue = Dialogue(
            speaker=speaker,
            dialogue=dialogue_text
        )
        transcript.append(dialogue)

        logger.info(f"Added dialogue segment {i+1} for section: {section.title}")

    logger.info(f"Generated speech transcript with {len(transcript)} dialogue segments")

    return {"transcript": transcript}


logger.info("Creating speech-based podcast generation graph")

# Define the speech graph
speech_workflow = StateGraph(PodcastSpeechState)

# Add nodes - use speech-specific nodes for outline and transcript generation
speech_workflow.add_node("generate_outline", generate_speech_outline_node)
speech_workflow.add_node("generate_transcript", generate_speech_transcript_node)
speech_workflow.add_node("generate_all_audio", generate_all_audio_node)
speech_workflow.add_node("combine_audio", combine_audio_node)

# Define edges - same flow as original graph
speech_workflow.add_edge(START, "generate_outline")
speech_workflow.add_edge("generate_outline", "generate_transcript")
speech_workflow.add_conditional_edges(
    "generate_transcript", route_audio_generation, ["generate_all_audio"]
)
speech_workflow.add_edge("generate_all_audio", "combine_audio")
speech_workflow.add_edge("combine_audio", END)

speech_graph = speech_workflow.compile()


async def create_podcast_from_speech_script(
    speech_script_id: str,
    briefing: Optional[str] = None,
    episode_name: Optional[str] = None,
    output_dir: Optional[str] = None,
    speaker_config: Optional[str] = None,
    episode_profile: Optional[str] = None,
    briefing_suffix: Optional[str] = None,
) -> Dict:
    """
    High-level function to create a podcast from speech script using the LangGraph workflow

    Args:
        speech_script_id: ID of the speech script to use
        briefing: Podcast briefing/instructions (optional with episode_profile)
        episode_name: Name of the episode (required)
        output_dir: Output directory path (required)
        speaker_config: Speaker configuration name (optional with episode_profile)
        episode_profile: Episode profile name to use for defaults
        briefing_suffix: Additional briefing text to append to profile default

    Returns:
        Dict with results including final audio path
    """
    # Resolve parameters using episode profile if provided
    if episode_profile:
        episode_config = load_episode_config(episode_profile)

        # Use episode profile defaults for missing parameters
        speaker_config = speaker_config or episode_config.speaker_config

        # Resolve briefing with episode profile logic
        if briefing:
            # Explicit briefing overrides everything
            resolved_briefing = briefing
        elif briefing_suffix:
            # Combine default briefing with suffix
            resolved_briefing = f"{episode_config.default_briefing}\n\nAdditional focus: {briefing_suffix}"
        else:
            # Use default briefing from profile
            resolved_briefing = episode_config.default_briefing
    else:
        # Use provided parameters or defaults
        speaker_config = speaker_config or "ai_researchers"
        resolved_briefing = briefing or ""

    # Validate required parameters
    if not speech_script_id:
        raise ValueError("speech_script_id is required")
    if not episode_name:
        raise ValueError("episode_name is required")
    if not output_dir:
        raise ValueError("output_dir is required")
    if not speaker_config:
        raise ValueError("speaker_config is required (either directly or via episode_profile)")
    if not resolved_briefing:
        raise ValueError("briefing is required (either directly, via episode_profile, or with briefing_suffix)")

    # Load speaker profile
    speaker_profile = load_speaker_config(speaker_config)

    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True, parents=True)

    # Validate speech script exists and has content
    speech_script = await SpeechScript.get(speech_script_id)
    if not speech_script:
        raise ValueError(f"Speech script {speech_script_id} not found")

    outline_sections = await speech_script.get_outline_sections()
    if not outline_sections:
        raise ValueError(f"No outline sections found for speech script {speech_script_id}")

    # Create initial state - note: content and num_segments are not used in speech-based generation
    initial_state = PodcastSpeechState(
        content="",  # Not used in speech-based generation
        briefing=resolved_briefing,
        num_segments=len(outline_sections),  # Use number of outline sections
        outline=None,
        transcript=[],
        audio_clips=[],
        final_output_file_path=None,
        output_dir=output_path,
        episode_name=episode_name,
        speaker_profile=speaker_profile,
        speech_script_id=speech_script_id,
    )

    # Create configuration - no need for outline/transcript providers since we use speech script content
    config = {
        "configurable": {}
    }

    # Create and run the graph
    result = await speech_graph.ainvoke(initial_state, config=config)

    # Save outputs
    if result["outline"]:
        outline_path = output_path / "outline.json"
        outline_path.write_text(result["outline"].model_dump_json())

    if result["transcript"]:
        transcript_path = output_path / "transcript.json"
        transcript_path.write_text(
            json.dumps([d.model_dump() for d in result["transcript"]], indent=2)
        )

    return {
        "outline": result["outline"],
        "transcript": result["transcript"],
        "final_output_file_path": result["final_output_file_path"],
        "audio_clips_count": len(result["audio_clips"]),
        "output_dir": output_path,
    }
