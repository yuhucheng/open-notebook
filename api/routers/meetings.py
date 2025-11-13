import os
from typing import List, Optional
from datetime import datetime, timedelta

from esperanto import AIFactory
from fastapi import APIRouter, HTTPException, Query
from loguru import logger
from api.models import MeetingCreate, MeetingResponse

from api.models import (
    DefaultModelsResponse,
    ModelCreate,
    ModelResponse,
    ProviderAvailabilityResponse,
)
from open_notebook.domain.models import DefaultModels, Model
from open_notebook.exceptions import InvalidInputError
from api.meeting_service import MeetingService

router = APIRouter()

def get_default_time_range():
    """获取默认时间范围：最近一个月"""
    now = datetime.now()
    """当天开始时间"""
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    begin_time = int(today_start.timestamp() * 1000) 
    """一个月后开始时间"""
    one_month_after = today_start + timedelta(days=30)
    end_time = int(one_month_after.timestamp() * 1000) 
    return begin_time, end_time

@router.get("/meetings", response_model=List[MeetingResponse])
async def get_meetings(
    begin_time: Optional[int] = Query(None, description="开始时间（毫秒时间戳）"),
    end_time: Optional[int] = Query(None, description="结束时间（毫秒时间戳）")
):
    """Get all meetings. 默认查询最近一个月的会议"""
    if begin_time is None or end_time is None:
        default_begin, default_end = get_default_time_range()
        begin_time = begin_time if begin_time is not None else default_begin
        end_time = end_time if end_time is not None else default_end
    
    result = await MeetingService.list_meetings(begin_time, end_time)
    return result

@router.delete("/meetings/{id}")
async def delete_meeting(id: str):
    """Delete a meeting."""
    result = await MeetingService.delete_meeting(id)
    return result

@router.post("/meetings", response_model=MeetingResponse)
async def create_meeting(meeting: MeetingCreate):
    """Create a meeting."""
    result = await MeetingService.create_meeting(meeting)
    return MeetingResponse(**result)