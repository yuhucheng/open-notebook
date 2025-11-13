from typing import Any, ClassVar, Dict, List, Optional
from datetime import datetime

from pydantic import Field

from open_notebook.database.repository import repo_query
from open_notebook.domain.base import ObjectModel


class MeetingSpeech(ObjectModel):
    """
    会议id与speech关系
    """

    table_name: ClassVar[str] = "meeting_speech"

    meeting_id: str = Field(..., description="会议id")
    postcat_id: Optional[str] = Field(None, description="博客id")
    meeting_code: Optional[str] = Field(None, description="会议号")
    created: Optional[datetime] = Field(default_factory=datetime.now, description="创建时间")
    updated: Optional[datetime] = Field(default_factory=datetime.now, description="更新时间")

    class Config:
        arbitrary_types_allowed = True

    def _prepare_save_data(self) -> dict:
        """Prepare data for saving to database"""
        data = super()._prepare_save_data()
        return data

    @classmethod
    async def get_by_meeting_id(cls, meeting_id : str ) -> List[Dict[str, Any]]:
        """获取会议对应的所有博客id"""
        # 查询 meeting_speech 表获取该会议的所有关联记录
        query = f"SELECT * FROM {cls.table_name} WHERE meeting_id = $meeting_id"
        results = await repo_query(query, {"meeting_id": meeting_id})

        if not results:
            return []

        return results

    

