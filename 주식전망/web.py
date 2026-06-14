"""FastAPI 서버 — 프론트(React)의 'AI 질문' 팝업이 호출하는 HTTP 엔드포인트.

개발: 레포 루트에서  python -m 주식전망.web   (기본 :8000)
프론트(vite)는 /ai 요청을 이 서버로 프록시한다 (frontend/vite.config.ts).

POST /ai/ask  { "question": "삼성전자 지금 사도 돼?" }
  → { ok, stock_related, message, stock_code, stock_name, outlook, verdict, confidence, answer }
"""

from __future__ import annotations

import dataclasses
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import ConfigError, load_settings
from .qa import answer_question

app = FastAPI(title="jumisa 주식전망 AI")

# 개발은 vite 프록시(/ai → 8000)라 동일 출처지만, 직접 호출도 허용해 둔다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskBody(BaseModel):
    question: str


@app.get("/ai/health")
def health() -> dict:
    return {"ok": True}


@app.post("/ai/ask")
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


def main() -> None:
    import uvicorn

    # Render 는 $PORT 주입. 로컬은 AI_PORT, 둘 다 없으면 8000.
    port = int(os.environ.get("PORT") or os.environ.get("AI_PORT") or "8000")
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
