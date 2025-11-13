from typing import Any, Dict, List, Optional
import os
import uuid
import json
import asyncio
from datetime import datetime
from pathlib import Path

import httpx
from fastapi import HTTPException
from loguru import logger
from pydantic import BaseModel
from surreal_commands import get_command_status

from open_notebook.database.repository import repo_query
from open_notebook.domain import meeting_speech
from open_notebook.domain.meeting_speech import MeetingSpeech
from api.models import MeetingCreate, MeetingResponse

class MeetingService:
    """会议服务层"""

    @staticmethod
    def _get_api_config() -> Dict[str, str]:
        """从环境变量获取 API 配置，如果没有则使用默认值（用于测试）"""
        return {
            "base_url": os.getenv(
                "MEETING_API_BASE_URL", 
                "https://web-teams.test.maxhub.vip/api-meeting"
            ),
            "token": os.getenv(
                "MEETING_API_TOKEN",
                "36a9b7d3-6654-4521-90de-49bae92fe89d"
            ),
            "user_id": os.getenv(
                "MEETING_API_USER_ID",
                "08d3c58e-5da9-43b7-98c4-81300b29b236"
            ),
            "company_id": os.getenv(
                "MEETING_API_COMPANY_ID",
                "7d1d81b5-ae6e-4210-8961-e7a05524d82f"
            ),
            "org_code": os.getenv(
                "MEETING_API_ORG_CODE",
                "405533858"
            ),
            "staff_id": os.getenv(
                "MEETING_API_STAFF_ID",
                "3043bc40-2dd3-477e-b5c3-694038247ac0"
            ),
        }

    @staticmethod
    def _build_request_headers(config: Dict[str, str]) -> Dict[str, str]:
        """构建请求头"""
        return {
            # "authorization": f"Bearer {config['token']}",
            "x-auth-userid": config["user_id"],
            "x-company-id": config["company_id"],
            "x-isp-traceid": str(uuid.uuid4()).replace("-", ""),  # 生成新的 traceid
            "x-org-code": config["org_code"],
            "x-staff-id": config["staff_id"],
            "Content-Type": "application/json",
        }

    @staticmethod
    def _build_request_data(request: MeetingCreate) -> Dict[str, Any]:
        """构建请求体"""
        return {
            "isRepeatMeeting": False,
            "staffId": "",
            "subject": request.theme,  # 使用请求中的主题
            "isPublic": 1,
            "beginTime": request.start_time,  # 使用请求中的开始时间
            "endTime": request.end_time,  # 使用请求中的结束时间
            "recurrence": {
                "range": {
                    "startDate": "",
                    "endDate": ""
                },
                "pattern": {
                    "type": "DAILY",
                    "daysOfWeek": []
                }
            },
            "roomBookingForms": [],
            "address": "",
            "members": {
                "staffIdList": []
            },
            "content": "",
            "noticeLabels": ["on_time", "before_5"],
            "meetingFolderAddForms": [],
            "reason": "",
            "extend": None,
            "meetingAllocationForm": {
                "meetingTypes": [5],
                "password": "",
                "recording": False,
                "muteNewParticipat": False
            }
        }

    @staticmethod
    async def _call_meeting_api(
        api_url: str,
        method: str,
        config: Dict[str, str],
        headers: Dict[str, str],
        request_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """调用外部会议 API"""
        api_url = f"{config['base_url']}" + api_url
        logger.info(f"Calling meeting API: {api_url}")
        logger.debug(f"Request data: {json.dumps(request_data, indent=2)}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            if method == "POST":
                response = await client.post(
                    api_url,
                    headers=headers,
                    json=request_data
                )
            elif method == "GET":
                response = await client.get(
                    api_url,
                    headers=headers
                )
            elif method == "PUT":
                response = await client.put(
                    api_url,
                    headers=headers
                )
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            # DELETE 请求可能没有响应体
            try:
                api_response = response.json()
                logger.info(f"Meeting API response: {api_response}")
            except Exception:
                api_response = {}
                logger.info(f"Meeting API response: {response.status_code}")

        return api_response

    @staticmethod
    async def create_meeting(request: MeetingCreate) -> Dict[str, Any]:
        """创建会议并调用外部 API"""
        try:
            # 获取 API 配置
            config = MeetingService._get_api_config()
            
            # 构建请求头和请求体
            headers = MeetingService._build_request_headers(config)
            request_data = MeetingService._build_request_data(request)
            
            # 调用外部 API
            api_response = await MeetingService._call_meeting_api(
                "/api/user/v2/meetings/actions/schedule", "POST", config, headers, request_data
            )

            # 创建会议记录（为每个 speech_id 创建一条记录）
             # 从 API 响应中提取会议信息
            meeting_no = api_response.get("data").get("meetingNo")  or ""
            meeting_code = api_response.get("data").get("meetingCode") or str(uuid.uuid4())
            
            for postcat_id in request.postcat_ids:
                meeting_speech = MeetingSpeech(
                    meeting_id=meeting_no,
                    postcat_id=postcat_id
                )
                await meeting_speech.save()
            
            # 启动异步任务获取会议详情得到会议号插入
            asyncio.create_task(MeetingService.save_meeting_code(meeting_no))


            return {
                "id": meeting_no,
                "theme": request.theme,
                "start_time": request.start_time,
                "end_time": request.end_time,
                "postcat_ids": request.postcat_ids,
                "meeting_code": meeting_code,
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"Meeting API HTTP error: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Meeting API error: {e.response.text}"
            )
        except httpx.RequestError as e:
            logger.error(f"Meeting API request error: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect to meeting API: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Failed to create meeting: {e}")
            logger.exception(e)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create meeting: {str(e)}",
            )

    @staticmethod
    async def save_meeting_code(meeting_no: str) -> Dict[str, Any]:
        # 先睡眠5秒
        await asyncio.sleep(6)
        """获取会议详情"""
        try:
            # 获取 API 配置
            config = MeetingService._get_api_config()
            
            # 构建请求头和请求体
            headers = MeetingService._build_request_headers(config)
            request_data = {}
            
            # 调用外部 API
            api_url = f"/api/user/v2/meetings/{meeting_no}"
            api_response = await MeetingService._call_meeting_api(
                api_url, "GET", config, headers, request_data
            )
            data = api_response.get("data")
            thirdPartyMeetingViewList = data.get("thirdPartyMeetingViewList")
            meeting_code = thirdPartyMeetingViewList[0].get("accessNumber") or "" if thirdPartyMeetingViewList else ""
            #  "meeting_code": "会议号码:184833917" 格式化:184833917
            meeting_code = meeting_code.replace("会议号码:", "")
            meeting_speech_list = await MeetingSpeech.get_by_meeting_id(meeting_no)
            for speech_dict in meeting_speech_list:
                # 将字典转换为 MeetingSpeech 对象
                speech = MeetingSpeech(**speech_dict)
                speech.meeting_code = meeting_code
                await speech.save()
                logger.info(f"save speech meeting_code: {speech}")
            return api_response
        except Exception as e:
            logger.error(f"Failed to get meeting detail: {e}")
            return None

    @staticmethod
    async def list_meetings(begin_time: int, end_time: int) -> List[Dict[str, Any]]:
        """列出所有会议"""
        try:
           # 获取 API 配置
            config = MeetingService._get_api_config()
            
            # 构建请求头和请求体
            headers = MeetingService._build_request_headers(config)
            request_data = {}
            
            # 调用外部 API
            api_url = f"/api/user/meeting-records/list?beginTime={begin_time}&endTime={end_time}"
            api_response = await MeetingService._call_meeting_api(
                api_url, "GET", config, headers, request_data
            )

            api_response_data = api_response.get("data")
            response_meetings = []
            for meeting_data in api_response_data:
                meeting_info = meeting_data.get("meeting", {})
                meeting_no = meeting_info.get("meetingNo") or ""
                if meeting_info.get("status") != "BEFORE" :
                    continue
                response_meetings.append({
                    "id": meeting_no,
                    "theme": meeting_info.get("subject") or "",
                    "start_time": meeting_info.get("beginTime") or 0,
                    "end_time": meeting_info.get("endTime") or 0,
                    "meeting_code": meeting_info.get("meetingCode") or meeting_no,  # 如果没有 meetingCode，使用 meeting_no
                    "postcat_ids": []
                })

            for meeting in response_meetings:
                meeting_speeches = await MeetingSpeech.get_by_meeting_id(meeting.get("id"))
                for speech in meeting_speeches:
                    postcat_id = speech.get("postcat_id")
                    if postcat_id:
                        meeting["postcat_ids"].append(postcat_id)
                    if speech.get("meeting_code"):
                        meeting["meeting_code"] = speech.get("meeting_code")

            return response_meetings

        except Exception as e:
            logger.error(f"Failed to list meetings: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to list meetings: {str(e)}"
            )


    @staticmethod
    async def delete_meeting(id: str) -> bool:
        """删除会议"""
        try:
            # 获取 API 配置
            config = MeetingService._get_api_config()
            
            # 构建请求头和请求体
            headers = MeetingService._build_request_headers(config)
            request_data = {}
            
            # 调用外部 API 删除会议
            api_url = f"/api/user/meetings/{id}/state/cancel?effectiveType=1"
            api_response = await MeetingService._call_meeting_api(
                api_url, "PUT", config, headers, request_data
            )
            return True

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to delete meeting {id}: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to delete meeting: {str(e)}"
            )