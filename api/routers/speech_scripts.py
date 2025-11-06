from pathlib import Path
from typing import List
from urllib.parse import unquote, urlparse

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from loguru import logger
from pydantic import BaseModel

from api.speech_script_service import (
    SpeechScriptGenerationRequest,
    SpeechScriptResponse,
    SpeechScriptService,
    OutlineSectionResponse,
)

router = APIRouter()


class SpeechScriptListResponse(BaseModel):
    """演讲稿列表响应"""
    speech_scripts: List[SpeechScriptResponse]


class SpeechScriptDetailResponse(BaseModel):
    """演讲稿详情响应"""
    speech_script: SpeechScriptResponse
    outline_sections: List[OutlineSectionResponse]


def _resolve_image_path(image_path: str) -> Path:
    """解析图片路径"""
    if image_path.startswith("file://"):
        parsed = urlparse(image_path)
        return Path(unquote(parsed.path))
    return Path(image_path)


@router.post("/speech-scripts/generate", response_model=dict)
async def generate_speech_script(request: SpeechScriptGenerationRequest):
    """
    生成演讲稿
    从PPT文件创建演讲稿，包含大纲和讲稿生成
    """
    try:
        job_id = await SpeechScriptService.create_speech_script(request)

        return {
            "job_id": job_id,
            "status": "submitted",
            "message": f"演讲稿生成任务已提交: '{request.name}'",
        }

    except Exception as e:
        logger.error(f"Error generating speech script: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"生成演讲稿失败: {str(e)}"
        )


@router.get("/speech-scripts/jobs/{job_id}")
async def get_speech_script_job_status(job_id: str):
    """获取演讲稿生成任务状态"""
    try:
        status_data = await SpeechScriptService.get_job_status(job_id)
        return status_data

    except Exception as e:
        logger.error(f"Error fetching speech script job status: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"获取任务状态失败: {str(e)}"
        )


@router.get("/speech-scripts", response_model=List[SpeechScriptResponse])
async def list_speech_scripts():
    """列出所有演讲稿"""
    try:
        speech_scripts = await SpeechScriptService.list_speech_scripts()
        return speech_scripts

    except Exception as e:
        logger.error(f"Error listing speech scripts: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"获取演讲稿列表失败: {str(e)}"
        )


@router.get("/speech-scripts/{speech_script_id}")
async def get_speech_script(speech_script_id: str):
    """获取指定演讲稿及其大纲讲稿"""
    try:
        speech_script_data = await SpeechScriptService.get_speech_script(speech_script_id)

        # 构建响应
        speech_script = SpeechScriptResponse(
            id=speech_script_data["id"],
            name=speech_script_data["name"],
            description=speech_script_data.get("description"),
            source_id=speech_script_data["source_id"],
            auxiliary_sources=speech_script_data["auxiliary_sources"],
            auxiliary_notebooks=speech_script_data["auxiliary_notebooks"],
            status=speech_script_data["status"],
            created=speech_script_data.get("created"),
            updated=speech_script_data.get("updated"),
            job_status=speech_script_data.get("job_status"),
            outline_sections_count=len(speech_script_data["outline_sections"]),
        )

        outline_sections = [
            OutlineSectionResponse(**section_data)
            for section_data in speech_script_data["outline_sections"]
        ]

        return {
            "speech_script": speech_script,
            "outline_sections": outline_sections,
        }

    except Exception as e:
        logger.error(f"Error fetching speech script: {str(e)}")
        raise HTTPException(status_code=404, detail=f"演讲稿不存在: {str(e)}")


@router.get("/speech-scripts/{speech_script_id}/images/{section_id}")
async def get_outline_section_image(speech_script_id: str, section_id: str):
    """获取大纲讲稿对应的PPT页面图片"""
    try:
        # 获取大纲讲稿信息
        speech_script_data = await SpeechScriptService.get_speech_script(speech_script_id)

        # 查找对应的section
        section_data = None
        for section in speech_script_data["outline_sections"]:
            if section["id"] == section_id:
                section_data = section
                break

        if not section_data or not section_data.get("image_path"):
            raise HTTPException(status_code=404, detail="图片不存在")

        image_path = _resolve_image_path(section_data["image_path"])
        if not image_path.exists():
            raise HTTPException(status_code=404, detail="图片文件不存在")

        return FileResponse(
            image_path,
            media_type="image/png",  # 假设是PNG格式，可根据实际情况调整
            filename=f"slide_{section_data['page_number']}.png",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching outline section image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取图片失败: {str(e)}")


@router.put("/speech-scripts/{speech_script_id}/sections/{section_id}/order")
async def update_outline_section_order(
    speech_script_id: str,
    section_id: str,
    order_data: dict
):
    """更新大纲讲稿排序"""
    try:
        new_order = order_data.get("order_index")
        if new_order is None or not isinstance(new_order, int):
            raise HTTPException(status_code=400, detail="无效的排序索引")

        await SpeechScriptService.update_outline_section_order(section_id, new_order)

        return {"message": "排序更新成功", "section_id": section_id, "order_index": new_order}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating outline section order: {str(e)}")
        raise HTTPException(status_code=500, detail=f"更新排序失败: {str(e)}")


@router.put("/speech-scripts/{speech_script_id}")
async def update_speech_script(
    speech_script_id: str,
    update_data: dict
):
    """更新演讲稿信息"""
    try:
        name = update_data.get("name")
        description = update_data.get("description")

        if name is None and description is None:
            raise HTTPException(status_code=400, detail="至少需要提供name或description中的一个")

        result = await SpeechScriptService.update_speech_script(
            speech_script_id=speech_script_id,
            name=name,
            description=description
        )

        return {"message": "演讲稿更新成功", **result}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating speech script: {str(e)}")
        raise HTTPException(status_code=500, detail=f"更新演讲稿失败: {str(e)}")


@router.put("/speech-scripts/{speech_script_id}/sections/{section_id}")
async def update_outline_section(
    speech_script_id: str,
    section_id: str,
    update_data: dict
):
    """更新大纲讲稿内容"""
    try:
        title = update_data.get("title")
        outline = update_data.get("outline")
        script = update_data.get("script")

        if title is None and outline is None and script is None:
            raise HTTPException(status_code=400, detail="至少需要提供title、outline或script中的一个")

        result = await SpeechScriptService.update_outline_section(
            section_id=section_id,
            title=title,
            outline=outline,
            script=script
        )

        return {"message": "大纲讲稿更新成功", **result}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating outline section: {str(e)}")
        raise HTTPException(status_code=500, detail=f"更新大纲讲稿失败: {str(e)}")


@router.delete("/speech-scripts/{speech_script_id}")
async def delete_speech_script(speech_script_id: str):
    """删除演讲稿及其所有大纲讲稿"""
    try:
        await SpeechScriptService.delete_speech_script(speech_script_id)

        return {"message": "演讲稿删除成功", "speech_script_id": speech_script_id}

    except Exception as e:
        logger.error(f"Error deleting speech script: {str(e)}")
        raise HTTPException(status_code=500, detail=f"删除演讲稿失败: {str(e)}")
