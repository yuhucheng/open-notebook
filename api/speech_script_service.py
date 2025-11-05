from typing import Any, Dict, List, Optional
import os
import uuid
from pathlib import Path

from fastapi import HTTPException
from loguru import logger
from pydantic import BaseModel
from surreal_commands import get_command_status

from open_notebook.database.repository import repo_query
from open_notebook.domain.speech_script import SpeechScript, OutlineSection


class SpeechScriptGenerationRequest(BaseModel):
    """演讲稿生成请求"""

    name: str
    description: Optional[str] = None
    source_id: str
    auxiliary_sources: List[str] = []
    auxiliary_notebooks: List[str] = []


class SpeechScriptResponse(BaseModel):
    """演讲稿响应"""

    id: str
    name: str
    description: Optional[str] = None
    source_id: str
    auxiliary_sources: List[str]
    auxiliary_notebooks: List[str]
    status: str
    created: Optional[str] = None
    updated: Optional[str] = None
    job_status: Optional[str] = None
    outline_sections_count: int = 0


class OutlineSectionResponse(BaseModel):
    """大纲讲稿响应"""

    id: str
    speech_script_id: str
    page_number: int
    title: str
    outline: str
    script: str
    image_path: Optional[str] = None
    order_index: int
    created: Optional[str] = None
    updated: Optional[str] = None


class SpeechScriptService:
    """演讲稿服务层"""

    @staticmethod
    async def create_speech_script(request: SpeechScriptGenerationRequest) -> str:
        """创建演讲稿并提交生成任务"""
        try:
            # 验证source_id是否存在（这里可以添加更多验证逻辑）
            # TODO: 添加source验证逻辑

            # 创建演讲稿记录
            speech_script = SpeechScript(
                name=request.name,
                description=request.description,
                source_id=request.source_id,
                auxiliary_sources=request.auxiliary_sources,
                auxiliary_notebooks=request.auxiliary_notebooks,
                status="processing"
            )
            await speech_script.save()

            # 准备生成任务参数
            command_args = {
                "speech_script_id": str(speech_script.id),
                "source_id": request.source_id,
                "auxiliary_sources": request.auxiliary_sources,
                "auxiliary_notebooks": request.auxiliary_notebooks,
            }

            # 确保命令模块已导入
            try:
                import commands.speech_commands  # noqa: F401
            except ImportError as import_err:
                logger.error(f"Failed to import speech commands: {import_err}")
                raise ValueError("Speech commands not available")

            # 直接保存command到数据库（绕过surreal_commands的submit_command问题）
            from datetime import datetime
            job_id = f"command:{uuid.uuid4().hex[:20]}"
            command_data = {
                "name": "generate_speech_script",  # Worker期望 'name' 字段，而不是 'command_name'
                "app": "open_notebook",
                "args": command_args,
                "status": "new",  # Worker期望 'new' 状态，而不是 'pending'
                "created": datetime.now().isoformat(),  # Worker期望 'created' 而不是 'created_at'
                "updated": datetime.now().isoformat(),
            }

            logger.info(f"Creating command record: {job_id}")

            try:
                # 使用 record ID 格式直接指定表名和ID
                # SurrealDB语法：CREATE table:id 或 CREATE ONLY table:id CONTENT {...}
                command_result = await repo_query(
                    "CREATE type::thing('command', $command_id) CONTENT $data",
                    {
                        "command_id": job_id.replace("command:", ""),  # 只传递ID部分，不包括表名
                        "data": command_data
                    }
                )
                logger.info(f"repo_query result: {command_result}")
                
                # 验证command是否真的被创建
                verify_result = await repo_query(
                    "SELECT * FROM type::thing('command', $command_id)",
                    {"command_id": job_id.replace("command:", "")}
                )
                if verify_result:
                    logger.info(f"✅ Command verified in database: {verify_result[0]['id']}")
                else:
                    logger.error(f"❌ Command not found after creation: {job_id}")
                    raise ValueError("Command was not persisted to database")
                    
            except Exception as db_error:
                logger.error(f"Database error creating command: {db_error}")
                raise ValueError(f"Database error: {db_error}")

            if not command_result:
                logger.error("Failed to create command record - no result")
                raise ValueError("Failed to create command record")

            logger.info(f"Command record created successfully: {command_result[0]['id']}")

            # 更新演讲稿的command字段
            speech_script.command = job_id
            await speech_script.save()

            job_id_str = str(job_id)
            logger.info(f"Submitted speech script generation job: {job_id_str} for '{request.name}'")
            return job_id_str

        except Exception as e:
            logger.error(f"Failed to create speech script: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create speech script: {str(e)}",
            )

    @staticmethod
    async def get_job_status(job_id: str) -> Dict[str, Any]:
        """获取演讲稿生成任务状态"""
        try:
            status = await get_command_status(job_id)
            return {
                "job_id": job_id,
                "status": status.status if status else "unknown",
                "result": status.result if status else None,
                "error_message": getattr(status, "error_message", None)
                if status
                else None,
                "created": str(status.created)
                if status and hasattr(status, "created") and status.created
                else None,
                "updated": str(status.updated)
                if status and hasattr(status, "updated") and status.updated
                else None,
                "progress": getattr(status, "progress", None) if status else None,
            }
        except Exception as e:
            logger.error(f"Failed to get speech script job status: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to get job status: {str(e)}"
            )

    @staticmethod
    async def list_speech_scripts() -> List[Dict[str, Any]]:
        """列出所有演讲稿"""
        try:
            speech_scripts = await SpeechScript.get_all_with_sections()

            response_scripts = []
            for script_data in speech_scripts:
                # 获取job状态
                job_status = None
                if script_data.get("command"):
                    try:
                        job_status = await SpeechScript(
                            id=script_data["id"], **script_data
                        ).get_job_status()
                    except Exception:
                        job_status = "unknown"

                # 计算大纲讲稿数量
                outline_sections = script_data.get("outline_sections", [])
                outline_sections_count = len(outline_sections) if outline_sections else 0

                response_scripts.append({
                    "id": str(script_data["id"]),
                    "name": script_data["name"],
                    "description": script_data.get("description"),
                    "source_id": script_data["source_id"],
                    "auxiliary_sources": script_data.get("auxiliary_sources", []),
                    "auxiliary_notebooks": script_data.get("auxiliary_notebooks", []),
                    "status": script_data["status"],
                    "created": str(script_data.get("created")) if script_data.get("created") else None,
                    "updated": str(script_data.get("updated")) if script_data.get("updated") else None,
                    "job_status": job_status,
                    "outline_sections_count": outline_sections_count,
                })

            return response_scripts

        except Exception as e:
            logger.error(f"Failed to list speech scripts: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to list speech scripts: {str(e)}"
            )

    @staticmethod
    async def get_speech_script(speech_script_id: str) -> Dict[str, Any]:
        """获取指定演讲稿及其大纲讲稿"""
        try:
            speech_script = await SpeechScript.get(speech_script_id)
            if not speech_script:
                raise HTTPException(status_code=404, detail="Speech script not found")

            # 获取大纲讲稿
            outline_sections = await OutlineSection.get_by_speech_script(speech_script_id)

            # 获取job状态
            job_status = None
            if speech_script.command:
                try:
                    job_status = await speech_script.get_job_status()
                except Exception:
                    job_status = "unknown"

            return {
                "id": str(speech_script.id),
                "name": speech_script.name,
                "description": speech_script.description,
                "source_id": speech_script.source_id,
                "auxiliary_sources": speech_script.auxiliary_sources,
                "auxiliary_notebooks": speech_script.auxiliary_notebooks,
                "status": speech_script.status,
                "created": str(speech_script.created) if speech_script.created else None,
                "updated": str(speech_script.updated) if speech_script.updated else None,
                "job_status": job_status,
                "outline_sections": [
                    {
                        "id": str(section.id),
                        "speech_script_id": section.speech_script_id,
                        "page_number": section.page_number,
                        "title": section.title,
                        "outline": section.outline,
                        "script": section.script,
                        "image_path": section.image_path,
                        "order_index": section.order_index,
                        "created": str(section.created) if section.created else None,
                        "updated": str(section.updated) if section.updated else None,
                    }
                    for section in outline_sections
                ],
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get speech script {speech_script_id}: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to get speech script: {str(e)}"
            )

    @staticmethod
    async def delete_speech_script(speech_script_id: str) -> bool:
        """删除演讲稿及其所有大纲讲稿"""
        try:
            speech_script = await SpeechScript.get(speech_script_id)
            if not speech_script:
                raise HTTPException(status_code=404, detail="Speech script not found")

            # 删除所有大纲讲稿
            outline_sections = await OutlineSection.get_by_speech_script(speech_script_id)
            for section in outline_sections:
                # 删除图片文件
                if section.image_path:
                    try:
                        image_path = Path(section.image_path)
                        if image_path.exists():
                            image_path.unlink()
                            logger.info(f"Deleted image file: {image_path}")
                    except Exception as e:
                        logger.warning(f"Failed to delete image file {section.image_path}: {e}")

                await section.delete()

            # 删除演讲稿
            await speech_script.delete()

            logger.info(f"Deleted speech script: {speech_script_id}")
            return True

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to delete speech script {speech_script_id}: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to delete speech script: {str(e)}"
            )

    @staticmethod
    async def update_outline_section_order(section_id: str, new_order: int) -> bool:
        """更新大纲讲稿排序"""
        try:
            success = await OutlineSection.update_order(section_id, new_order)
            if not success:
                raise HTTPException(status_code=404, detail="Outline section not found")
            return True
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to update outline section order: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to update order: {str(e)}"
            )
