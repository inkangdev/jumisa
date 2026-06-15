"""AI 컨트롤러 — 프론트(React)의 'AI 질문' 팝업이 호출하는 HTTP 엔드포인트(라우터).

앱 부트스트랩은 `ai.app` 가 담당하고, 여기서는 라우트만 정의한다 (백엔드의 *Controller 와 동일 역할).

POST /ai/ask  { "question": "삼성전자 지금 사도 돼?" }
  → { ok, stock_related, message, stock_code, stock_name, outlook, verdict, confidence, answer }
"""

from __future__ import annotations

import dataclasses

from fastapi import APIRouter
from pydantic import BaseModel

from ..config.settings import ConfigError, load_settings
from ..service.qa_service import answer_question

router = APIRouter(prefix="/ai")


class AskBody(BaseModel):
    question: str


@router.get("/health")
def health() -> dict:
    return {"ok": True}


@router.post("/ask")
def ask(body: AskBody) -> dict:
    try:
        settings = load_settings()
    except ConfigError as exc:
        return {"ok": False, "stock_related": False, "message": f"서버 설정 오류: {exc}"}

    try:
        result = answer_question(settings, body.question)
    except Exception as exc:  # DB/API 오류는 사용자에게 메시지로
        return {"ok": False, "stock_related": False, "message": f"처리 중 오류가 발생했어요: {exc}"}

    return {"ok": True, **dataclasses.asdict(result)}
