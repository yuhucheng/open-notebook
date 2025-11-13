import asyncio
import json
import os
import uuid
from pathlib import Path
from typing import Dict, Optional, List, Union

from esperanto import AIFactory
from langgraph.graph import END, START, StateGraph
from loguru import logger
from moviepy import AudioFileClip, concatenate_audioclips

from podcast_creator.nodes import (
    route_audio_generation,
)
from podcast_creator.speakers import load_speaker_config
from podcast_creator.episodes import load_episode_config
from podcast_creator.state import PodcastState
from podcast_creator.core import Outline, Segment, Dialogue, Transcript

from open_notebook.config import DATA_FOLDER

# Import speech script domain models
try:
    from open_notebook.domain.speech_script import SpeechScript, OutlineSection
    SPEECH_SCRIPT_AVAILABLE = True
except ImportError:
    logger.warning("Speech script domain models not available, speech graph functionality will be limited")
    SPEECH_SCRIPT_AVAILABLE = False


class PodcastSpeechState(PodcastState):
    """Extended state for speech script based podcast generation"""
    speech_script_id: str


async def combine_audio_files(
    audio_dir: Union[Path, str], final_filename: str, final_output_dir: Union[Path, str]
) -> Dict:
    """
    Combines multiple audio files into a single MP3 file using moviepy.
    Expects 'audio_segments_data' in inputs: a list of strings, where each string is a path to an audio file.
    Also expects 'final_filename' in inputs: a string for the desired output filename (e.g., "podcast_episode.mp3").
    Example input: {
        "audio_segments_data": ["path/to/audio1.mp3", "path/to/audio2.mp3"],
        "final_filename": "my_podcast.mp3"
    }
    Output: {"combined_audio_path": "podcasts/episodes/episode_name/audio/my_podcast.mp3"}
    """
    logger.info("[Custom Audio Function] combine_audio_files called.")
    if isinstance(audio_dir, str):
        audio_dir = Path(audio_dir)
    if isinstance(final_output_dir, str):
        final_output_dir = Path(final_output_dir)

    list_of_audio_paths = sorted(audio_dir.glob("*.mp3"))
    output_filename_from_input = final_filename

    logger.debug(f"Found {len(list_of_audio_paths)} audio files to combine")

    if not list_of_audio_paths:
        logger.warning(
            "combine_audio_files: No audio segment data (list of paths) provided."
        )
        return {"combined_audio_path": "ERROR: No audio segment data"}

    if not isinstance(list_of_audio_paths, list):
        logger.error(
            "combine_audio_files: 'audio_segments_data' is not a list. Received: {type(list_of_audio_paths)}"
        )
        return {
            "combined_audio_path": "ERROR: audio_segments_data must be a list of file paths"
        }

    clips = []
    valid_clips = []
    for i, file_path in enumerate(list_of_audio_paths):
        if not isinstance(file_path, Path):
            logger.warning(
                "combine_audio_files: Item {i} in audio_segments_data is not a string path: {file_path}. Skipping."
            )
            continue

        try:
            if file_path.exists() and file_path.is_file():
                clips.append(AudioFileClip(str(file_path)))
                valid_clips.append(clips[-1])  # Keep track of valid clips for later
            else:
                logger.error(
                    "combine_audio_files: File not found or not a file: {file_path}"
                )
        except Exception as e:
            logger.error(
                "combine_audio_files: Error loading audio clip {file_path}: {e}"
            )

    if not clips:
        logger.error("combine_audio_files: No valid audio clips could be loaded.")
        return {"combined_audio_path": "ERROR: No valid clips"}

    try:
        # Ensure all clips are closed after concatenation, even if it fails during the process.
        # MoviePy's concatenate_audioclips might not close source clips if it errors out mid-way.
        final_clip = concatenate_audioclips(clips)
    except Exception as e:
        logger.error(f"Error during concatenate_audioclips: {e}")
        for clip_obj in clips:
            try:
                clip_obj.close()
            except Exception as close_exc:
                logger.debug(f"Error closing clip during error handling: {close_exc}")
        return {"combined_audio_path": f"ERROR: Concatenation failed - {e}"}

    output_dir = final_output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    # Use the filename from input if provided, otherwise generate one.
    if output_filename_from_input and isinstance(output_filename_from_input, str):
        # Basic sanitization for filename (optional, depending on how robust it needs to be)
        # For now, assume it's a simple filename like 'episode.mp3'
        output_filename = Path(
            output_filename_from_input
        ).name  # Use only the filename part
        if not output_filename.endswith(".mp3"):
            output_filename += ".mp3"  # Ensure .mp3 extension
    else:
        output_filename = f"combined_{uuid.uuid4().hex}.mp3"
        logger.warning(
            f"'final_filename' not provided or invalid in inputs. Using generated name: {output_filename}"
        )

    output_path = output_dir / output_filename

    try:
        final_clip.write_audiofile(str(output_path), codec="mp3")
        logger.info(f"Successfully combined audio to: {output_path}")

        try:
            relative_path = str(output_path.relative_to(""))
            logger.info(f"Combined audio relative path: {relative_path}")
            return {
                "combined_audio_path": relative_path,
                "original_segments_count": len(valid_clips),
                "total_duration_seconds": final_clip.duration,
            }
        except ValueError:
            # 如果无法计算相对路径（例如路径不在 DATA_FOLDER 下），返回绝对路径
            logger.warning(f"Could not create relative path for {output_path}, using absolute path")
            return {
                "combined_audio_path": str(output_path.resolve()),
                "original_segments_count": len(valid_clips),
                "total_duration_seconds": final_clip.duration,
            }
    except Exception as e:
        logger.error(f"Error writing final audio file {output_path}: {e}")
        return {"combined_audio_path": f"ERROR: Failed to write output audio - {e}"}
    finally:
        final_clip.close()  # Close the final concatenated clip
        for clip_obj in clips:  # Ensure all source clips are closed
            try:
                clip_obj.close()
            except Exception as close_exc:
                logger.debug(f"Error closing source clip: {close_exc}")


async def custom_combine_audio_node(state, config) -> Dict:
    """自定义音频合并节点，返回相对路径"""
    logger.info("Starting custom audio combination")

    clips_dir = state["output_dir"] / "clips"
    audio_dir = state["output_dir"] / "audio"

    # Combine audio files using custom function
    result = await combine_audio_files(
        clips_dir, f"{state['episode_name']}.mp3", audio_dir
    )

    # 处理结果
    if result["combined_audio_path"].startswith("ERROR"):
        logger.error(f"Audio combination failed: {result['combined_audio_path']}")
        return {"final_output_file_path": None}

    final_path = Path(result["combined_audio_path"])

    logger.info(f"Custom combined audio saved to: {final_path}")

    return {"final_output_file_path": final_path}


async def custom_generate_single_audio_clip(dialogue_info: Dict) -> Path:
    """生成单个音频片段（自定义实现）"""
    dialogue = dialogue_info["dialogue"]
    index = dialogue_info["index"]
    output_dir = dialogue_info["output_dir"]
    tts_provider = dialogue_info["tts_provider"]
    tts_model_name = dialogue_info["tts_model"]
    voices = dialogue_info["voices"]
    speech_speed = dialogue_info.get("speech_speed", 1.0)

    logger.info(f"[Custom Audio] Generating audio clip {index:04d} for {dialogue.speaker}")

    # 创建 clips 目录
    clips_dir = output_dir / "clips"
    clips_dir.mkdir(exist_ok=True, parents=True)

    # 生成文件名
    filename = f"{index:04d}.mp3"
    clip_path = clips_dir / filename

    # 创建 TTS 模型
    tts_model = AIFactory.create_text_to_speech(tts_provider, tts_model_name)

    # 生成音频
    await tts_model.agenerate_speech(
        text=dialogue.dialogue, voice=voices[dialogue.speaker], output_file=clip_path, speed=speech_speed
    )

    logger.info(f"[Custom Audio] Generated audio clip: {clip_path}")

    return clip_path


async def custom_generate_all_audio_node(state, config) -> Dict:
    """生成所有音频片段（自定义实现）"""
    transcript = state["transcript"]
    output_dir = state["output_dir"]
    total_segments = len(transcript)

    # 从环境变量获取批次大小，默认为 1
    batch_size = int(os.getenv("TTS_BATCH_SIZE", "1"))
    logger.info(f"[Custom Audio] Using TTS batch size: {batch_size}")

    assert state.get("speaker_profile") is not None, "speaker_profile must be provided"

    # 获取 TTS 配置
    speaker_profile = state["speaker_profile"]
    tts_provider = speaker_profile.tts_provider
    tts_model = speaker_profile.tts_model
    voices = speaker_profile.get_voice_mapping()
    speech_speed = getattr(speaker_profile, 'speech_speed', 1.0)

    logger.info(
        f"[Custom Audio] Generating {total_segments} audio clips in sequential batches of {batch_size}"
    )

    all_clip_paths = []

    # 按批次顺序处理
    for batch_start in range(0, total_segments, batch_size):
        batch_end = min(batch_start + batch_size, total_segments)
        batch_number = batch_start // batch_size + 1
        total_batches = (total_segments + batch_size - 1) // batch_size

        logger.info(
            f"[Custom Audio] Processing batch {batch_number}/{total_batches} (clips {batch_start}-{batch_end - 1})"
        )

        # 创建此批次的任务
        batch_tasks = []
        for i in range(batch_start, batch_end):
            dialogue_info = {
                "dialogue": transcript[i],
                "index": i,
                "output_dir": output_dir,
                "tts_provider": tts_provider,
                "tts_model": tts_model,
                "voices": voices,
                "speech_speed": speech_speed,
            }
            task = custom_generate_single_audio_clip(dialogue_info)
            batch_tasks.append(task)

        # 并发处理此批次（但在下一批次前等待）
        batch_clip_paths = await asyncio.gather(*batch_tasks)
        all_clip_paths.extend(batch_clip_paths)

        logger.info(f"[Custom Audio] Completed batch {batch_number}/{total_batches}")

        # 在批次间添加小延迟以确保 API 限制安全
        if batch_end < total_segments:
            await asyncio.sleep(1)

    logger.info(f"[Custom Audio] Generated all {len(all_clip_paths)} audio clips")

    return {"audio_clips": all_clip_paths}


async def custom_generate_speech_outline_node(state, config) -> Dict:
    """Generate outline from speech script outline sections"""
    if not SPEECH_SCRIPT_AVAILABLE:
        raise ImportError("Speech script functionality not available")

    logger.info("[Custom Speech] Starting speech outline generation")

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

    logger.info(f"[Custom Speech] Generated speech outline with {len(segments)} segments from speech script")

    return {"outline": outline}


async def custom_generate_speech_transcript_node(state, config) -> Dict:
    """Generate transcript from speech script outline sections"""
    if not SPEECH_SCRIPT_AVAILABLE:
        raise ImportError("Speech script functionality not available")

    logger.info("[Custom Speech] Starting speech transcript generation")

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
            logger.warning(f"[Custom Speech] Empty script content for section {section.title}, skipping")
            continue

        # For speech scripts, we'll use the first available speaker
        # In a real implementation, you might want to alternate speakers or use speaker detection
        speaker = speaker_names[0]  # Use first speaker as default

        dialogue = Dialogue(
            speaker=speaker,
            dialogue=dialogue_text
        )
        transcript.append(dialogue)

        logger.info(f"[Custom Speech] Added dialogue segment {i+1} for section: {section.title}")

    logger.info(f"[Custom Speech] Generated speech transcript with {len(transcript)} dialogue segments")

    return {"transcript": transcript}


logger.info("Creating speech-based podcast generation graph")

# Define the speech graph
speech_workflow = StateGraph(PodcastSpeechState)

# Add nodes - use speech-specific nodes for outline and transcript generation
speech_workflow.add_node("generate_outline", custom_generate_speech_outline_node)
speech_workflow.add_node("generate_transcript", custom_generate_speech_transcript_node)
speech_workflow.add_node("generate_all_audio", custom_generate_all_audio_node)
speech_workflow.add_node("combine_audio", custom_combine_audio_node)

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
