import time
import io
import base64
from pathlib import Path
from typing import List, Optional, Dict, Any
import fitz  # PyMuPDF for PDF/PPT processing
from PIL import Image

from loguru import logger
from pydantic import BaseModel
from surreal_commands import CommandInput, CommandOutput, command

from open_notebook.config import DATA_FOLDER
from open_notebook.database.repository import repo_query, ensure_record_id
from open_notebook.domain.speech_script import SpeechScript, OutlineSection
from api.transformations_service import transformations_service
from api.models_service import models_service


def encode_image_to_base64(image_path: Path) -> str:
    """
    将图片文件转换为base64编码字符串
    """
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        logger.error(f"Failed to encode image {image_path}: {e}")
        raise


class SpeechScriptGenerationInput(CommandInput):
    speech_script_id: str
    source_id: str
    auxiliary_sources: List[str]
    auxiliary_notebooks: List[str]


class SpeechScriptGenerationOutput(CommandOutput):
    success: bool
    speech_script_id: str
    outline_sections_count: int
    processing_time: float
    error_message: Optional[str] = None


async def extract_ppt_pages(source_id: str, output_dir: Path) -> List[Path]:
    """
    从PPT文件中提取页面图片
    """
    try:
        # 获取source文件路径
        logger.info(f"Querying source: {source_id}")
        source_result = await repo_query(
            "SELECT * FROM source WHERE id = $source_id",
            {"source_id": ensure_record_id(source_id)}
        )
        logger.info(f"Query result: {source_result}")
        if not source_result:
            raise ValueError(f"Source {source_id} not found")

        source_data = source_result[0]
        asset = source_data.get("asset", {})
        file_path = asset.get("file_path")

        if not file_path:
            raise ValueError(f"No file path found for source {source_id}")

        # 解析文件路径
        if file_path.startswith("file://"):
            from urllib.parse import unquote, urlparse
            parsed = urlparse(file_path)
            file_path = unquote(parsed.path)

        file_path = Path(file_path)
        if not file_path.exists():
            raise ValueError(f"File not found: {file_path}")

        # 使用PyMuPDF处理PDF/PPT文件
        doc = fitz.open(str(file_path))
        image_paths = []

        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x scaling for better quality

            # 转换为PIL Image
            img = Image.open(io.BytesIO(pix.tobytes()))
            image_path = output_dir / f"slide_{page_num + 1}.png"
            img.save(image_path, "PNG")
            image_paths.append(image_path)

        doc.close()
        return image_paths

    except Exception as e:
        logger.error(f"Failed to extract PPT pages: {e}")
        raise


async def generate_outlines_from_pages(source_id: str, image_paths: List[Path], auxiliary_content: str = "", description: str = "") -> List[Dict[str, Any]]:
    """
    为所有页面一次性生成大纲和讲稿，确保演讲的连续性
    使用AI模型生成实际内容
    """
    try:
        # 获取source文件路径
        source_result = await repo_query(
            "SELECT * FROM source WHERE id = $source_id",
            {"source_id": ensure_record_id(source_id)}
        )
        if not source_result:
            raise ValueError(f"Source {source_id} not found")

        source_data = source_result[0]
        asset = source_data.get("asset", {})
        file_path = asset.get("file_path")

        if not file_path:
            raise ValueError(f"No file path found for source {source_id}")

        # 解析文件路径
        if file_path.startswith("file://"):
            from urllib.parse import unquote, urlparse
            parsed = urlparse(file_path)
            file_path = unquote(parsed.path)

        file_path = Path(file_path)
        if not file_path.exists():
            raise ValueError(f"File not found: {file_path}")

        # 获取默认的transformation模型
        models = models_service.get_all_models(model_type="language")
        if not models:
            raise ValueError("No language models available")

        model_id = models[0].id  # 使用第一个可用的语言模型

        # 提取每页的文本内容
        doc = fitz.open(str(file_path))
        page_texts = []
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text()
            page_texts.append({
                "page_number": page_num + 1,
                "text": text.strip() if text.strip() else f"第{page_num + 1}页 (无文本内容)",
                "filename": image_paths[page_num].name if page_num < len(image_paths) else f"slide_{page_num + 1}.png"
            })
        doc.close()

        # 构建提示词
        prompt = (
            "你是一个专业的演讲稿撰写助手。请基于提供的PPT页面内容，为整个演讲生成连贯的大纲和讲稿。"
            "要求：1. 分析所有页面的内容，理解演讲的整体结构和逻辑流程 "
            "2. 为每一页生成：- 标题：简洁明了，反映页面核心内容 - 大纲：详细描述页面内容要点 "
            "- 讲稿：自然的演讲语言，确保前后页面的连贯性 "
            "3. 演讲稿要符合演讲的逻辑顺序，前后呼应 "
            "4. 语言要生动、自然，适合口头表达 "
            f"5. 必须为所有输入的页面生成对应的内容，输出页数必须与输入页数完全一致，不能少于或多于输入的页面数量 "
            f"6. 如果提供了辅助内容，请适当融入讲稿中 {f'辅助内容：{auxiliary_content}' if auxiliary_content else ''} "
            f"7. 如果提供了演讲稿描述，请按照描述风格来生成演讲稿 {f'演讲稿描述：{description}' if description else ''} "
            "请以JSON格式返回结果，必须返回完整的JSON结构，不能被截断，而且你需要检查最终返回的数据是否满足JSON格式，"
            "不能生成非JSON字符串的内容（如```json```），格式如下："
            "{'pages': [{'page_number': 1, 'title': '页面标题', 'outline': '页面大纲内容', 'script': '演讲稿内容'}, ...]}"
        )

        # 构建文本输入，包含每页的文本内容
        text_input = f"演讲稿生成任务：{prompt} 共有 {len(page_texts)} 页PPT内容需要分析："

        # 将页面文本信息格式化为JSON字符串
        import json
        page_texts_json = json.dumps(page_texts, ensure_ascii=False)
        text_input += f"\n页面内容（JSON格式）：{page_texts_json}"

        # 创建临时的transformation来处理这个任务
        transformation = transformations_service.create_transformation(
            name="speech_script_generation",
            title="演讲稿生成",
            description="基于PPT内容生成连贯的演讲稿大纲和讲稿",
            prompt=prompt,
            apply_default=False
        )

        # 执行transformation，最多重试3次
        pages_data = []
        max_retries = 3

        for attempt in range(max_retries):
            try:
                logger.info(f"Attempt {attempt + 1}/{max_retries} to generate speech script content")

                # 执行transformation
                result = transformations_service.execute_transformation(
                    transformation_id=transformation.id,
                    input_text=text_input,
                    model_id=model_id
                )

                # 解析结果
                if isinstance(result, list) and result:
                    result_text = result[0].get("output", "")
                elif isinstance(result, dict):
                    result_text = result.get("output", "")
                else:
                    result_text = str(result)

                # 尝试解析JSON结果
                import json
                logger.info(f"Result text: {result_text}")
                parsed_result = json.loads(result_text)
                pages_data = parsed_result.get("pages", [])

                # 如果成功解析且有数据，跳出重试循环
                if pages_data:
                    logger.info(f"Successfully parsed JSON result with {len(pages_data)} pages on attempt {attempt + 1}")
                    break
                else:
                    logger.warning(f"Parsed JSON result but no pages data found on attempt {attempt + 1}")
                    if attempt == max_retries - 1:
                        raise ValueError("No pages data in JSON result")

            except Exception as e:
                logger.warning(f"Attempt {attempt + 1}/{max_retries} failed: {e}")
                if attempt == max_retries - 1:
                    # 所有重试都失败，生成默认内容
                    logger.error(f"All {max_retries} attempts failed, using default content")
                    pages_data = []
                    for i, image_path in enumerate(image_paths, 1):
                        pages_data.append({
                            "page_number": i,
                            "title": f"第{i}页 - {image_path.name}",
                            "outline": f"第{i}页主要内容概述生成失败",
                            "script": f"这是第{i}页的演讲稿内容生成失败"
                        })

        # 确保返回的数据格式正确
        outlines_data = []
        for page_data in pages_data:
            page_num = page_data.get("page_number", 1)
            outlines_data.append({
                "title": page_data.get("title", f"第{page_num}页"),
                "outline": page_data.get("outline", f"第{page_num}页内容概述"),
                "script": page_data.get("script", f"第{page_num}页的演讲稿内容"),
            })
        logger.info(f"Outlines data: {outlines_data}")
        transformations_service.delete_transformation(transformation.id)
        return outlines_data

    except Exception as e:
        logger.error(f"Failed to generate outlines for all pages: {e}")
        # 返回默认内容
        return [
            {
                "title": f"第{i+1}页",
                "outline": f"第{i+1}页内容概述生成失败",
                "script": f"第{i+1}页的演讲稿生成失败",
            }
            for i in range(len(image_paths))
        ]


async def get_auxiliary_content(auxiliary_sources: List[str], auxiliary_notebooks: List[str]) -> str:
    """
    获取辅助内容
    """
    auxiliary_content = []
    max_length = 100000  # 10万字符限制

    # 获取辅助source内容
    for source_id in auxiliary_sources:
        try:
            source_result = await repo_query(
                "SELECT * FROM source WHERE id = $source_id",
                {"source_id": ensure_record_id(source_id)}
            )
            if source_result:
                source_data = source_result[0]
                title = source_data.get("title", "")
                content = source_data.get("full_text", "")
                if content:
                    content_item = f"Source: {title}\nContent: {content[:10000]}..."
                    # 检查添加后是否超过长度限制
                    if len(" ".join(auxiliary_content + [content_item])) <= max_length:
                        auxiliary_content.append(content_item)
                    else:
                        logger.info(f"Content length would exceed {max_length} characters, skipping remaining auxiliary sources")
                        break
        except Exception as e:
            logger.warning(f"Failed to get auxiliary source content: {e}")

    # 获取辅助notebook内容
    for notebook_id in auxiliary_notebooks:
        try:
            # 这里可以实现获取notebook相关内容的逻辑
            # 暂时跳过
            pass
        except Exception as e:
            logger.warning(f"Failed to get auxiliary notebook content: {e}")

    return " ".join(auxiliary_content)


@command("generate_speech_script", app="open_notebook")
async def generate_speech_script_command(
    input_data: SpeechScriptGenerationInput,
) -> SpeechScriptGenerationOutput:
    """
    生成演讲稿：PPT分页切片 → 生成大纲 → 生成讲稿
    """
    start_time = time.time()

    try:
        logger.info(f"Starting speech script generation for script: {input_data.speech_script_id}")

        # 1. 获取演讲稿记录
        speech_script = await SpeechScript.get(input_data.speech_script_id)
        if not speech_script:
            raise ValueError(f"Speech script {input_data.speech_script_id} not found")

        # 2. 创建输出目录
        output_dir = Path(f"{DATA_FOLDER}/speech_scripts/{input_data.speech_script_id}")
        output_dir.mkdir(parents=True, exist_ok=True)
        images_dir = output_dir / "images"
        images_dir.mkdir(exist_ok=True)

        logger.info(f"Created output directory: {output_dir}")

        # 3. 提取PPT页面图片
        logger.info("Extracting PPT pages...")
        image_paths = await extract_ppt_pages(input_data.source_id, images_dir)
        logger.info(f"Extracted {len(image_paths)} pages from PPT")

        # 4. 获取辅助内容
        auxiliary_content = await get_auxiliary_content(
            input_data.auxiliary_sources,
            input_data.auxiliary_notebooks
        )

        # 5. 为所有页面一次性生成大纲和讲稿，确保演讲连续性
        logger.info(f"Generating content for all {len(image_paths)} pages at once")
        outlines_data = await generate_outlines_from_pages(input_data.source_id, image_paths, auxiliary_content, speech_script.description)

        # 6. 创建大纲讲稿记录
        outline_sections = []
        for page_num, (image_path, content) in enumerate(zip(image_paths, outlines_data), 1):
            outline_section = OutlineSection(
                speech_script_id=input_data.speech_script_id,
                page_number=page_num,
                title=content["title"],
                outline=content["outline"],
                script=content["script"],
                image_path=str(image_path),
                order_index=page_num - 1,  # 从0开始的排序索引
            )
            await outline_section.save()
            outline_sections.append(outline_section)

        # 7. 更新演讲稿状态
        speech_script.status = "completed"
        await speech_script.save()

        processing_time = time.time() - start_time
        logger.info(
            f"Successfully generated speech script: {speech_script.id} "
            f"with {len(outline_sections)} outline sections in {processing_time:.2f}s"
        )

        return SpeechScriptGenerationOutput(
            success=True,
            speech_script_id=input_data.speech_script_id,
            outline_sections_count=len(outline_sections),
            processing_time=processing_time,
        )

    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"Speech script generation failed: {e}")
        logger.exception(e)

        # 更新演讲稿状态为失败
        try:
            speech_script = await SpeechScript.get(input_data.speech_script_id)
            if speech_script:
                speech_script.status = "failed"
                await speech_script.save()
        except Exception as update_error:
            logger.error(f"Failed to update speech script status: {update_error}")

        return SpeechScriptGenerationOutput(
            success=False,
            speech_script_id=input_data.speech_script_id,
            outline_sections_count=0,
            processing_time=processing_time,
            error_message=str(e)
        )
