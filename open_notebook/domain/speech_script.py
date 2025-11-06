from typing import Any, ClassVar, Dict, List, Optional, Union
from datetime import datetime

from pydantic import Field, field_validator
from surrealdb import RecordID

from open_notebook.database.repository import ensure_record_id, repo_query
from open_notebook.domain.base import ObjectModel


class SpeechScript(ObjectModel):
    """
    演讲稿 - 基于PPT文件的演讲稿生成和管理
    """

    table_name: ClassVar[str] = "speech_script"

    name: str = Field(..., description="演讲稿名称")
    description: Optional[str] = Field(None, description="演讲稿描述")
    source_id: str = Field(..., description="基准PPT文件的source ID")
    auxiliary_sources: List[str] = Field(default_factory=list, description="辅助source IDs")
    auxiliary_notebooks: List[str] = Field(default_factory=list, description="辅助notebook IDs")
    status: str = Field(default="draft", description="状态: draft, processing, completed, failed")
    created: Optional[datetime] = Field(default_factory=datetime.now, description="创建时间")
    updated: Optional[datetime] = Field(default_factory=datetime.now, description="更新时间")
    command: Optional[Union[str, RecordID]] = Field(
        default=None, description="Link to surreal-commands job"
    )

    class Config:
        arbitrary_types_allowed = True

    async def get_job_status(self) -> Optional[str]:
        """Get the status of the associated command"""
        if not self.command:
            return None

        try:
            from surreal_commands import get_command_status

            status = await get_command_status(str(self.command))
            return status.status if status else "unknown"
        except Exception:
            return "unknown"

    @field_validator("command", mode="before")
    @classmethod
    def parse_command(cls, value):
        if isinstance(value, str):
            return ensure_record_id(value)
        return value

    def _prepare_save_data(self) -> dict:
        """Override to ensure command field is always RecordID format for database"""
        data = super()._prepare_save_data()

        # Ensure command field is RecordID format if not None
        if data.get("command") is not None:
            data["command"] = ensure_record_id(data["command"])

        return data

    @classmethod
    async def get_all_with_sections(cls, order_by: str = "created desc") -> List[Dict[str, Any]]:
        """获取所有演讲稿及其大纲讲稿"""
        # 先获取所有演讲稿
        scripts_query = f"SELECT * FROM speech_script ORDER BY {order_by}"
        scripts = await repo_query(scripts_query)

        if not scripts:
            return []

        # 为每个演讲稿获取对应的outline_sections
        scripts_with_sections = []
        for script in scripts:
            script_id = script["id"]
            # 查询对应的outline_sections
            sections = await repo_query(
                "SELECT * FROM outline_section WHERE speech_script_id = $speech_script_id ORDER BY order_index",
                {"speech_script_id": script_id}
            )

            # 将sections添加到script中
            script["outline_sections"] = sections if sections else []
            scripts_with_sections.append(script)

        return scripts_with_sections


class OutlineSection(ObjectModel):
    """
    大纲讲稿 - 每个PPT页对应的大纲和讲稿
    """

    table_name: ClassVar[str] = "outline_section"

    speech_script_id: str = Field(..., description="所属演讲稿ID")
    page_number: int = Field(..., description="PPT页码")
    title: str = Field(..., description="大纲标题")
    outline: str = Field(..., description="大纲内容")
    script: str = Field(..., description="讲稿内容")
    image_path: Optional[str] = Field(None, description="PPT页面图片路径")
    order_index: int = Field(..., description="排序索引")
    created: Optional[datetime] = Field(default_factory=datetime.now, description="创建时间")
    updated: Optional[datetime] = Field(default_factory=datetime.now, description="更新时间")

    @field_validator("page_number", "order_index")
    @classmethod
    def validate_positive(cls, v):
        if v < 0:
            raise ValueError("Page number and order index must be non-negative")
        return v

    @classmethod
    async def get_by_speech_script(cls, speech_script_id: str) -> List["OutlineSection"]:
        """获取指定演讲稿的所有大纲讲稿，按order_index排序"""
        result = await repo_query(
            "SELECT * FROM outline_section WHERE speech_script_id = $speech_script_id ORDER BY order_index",
            {"speech_script_id": speech_script_id}
        )
        if result:
            return [cls(**item) for item in result]
        return []

    @classmethod
    async def update_order(cls, section_id: str, new_order: int) -> bool:
        """更新大纲讲稿的排序"""
        try:
            result = await repo_query(
                "UPDATE outline_section SET order_index = $order WHERE id = $id",
                {"id": section_id, "order": new_order}
            )
            return len(result) > 0
        except Exception:
            return False
