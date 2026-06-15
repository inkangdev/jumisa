"""FastAPI 애플리케이션 부트스트랩 (웹 서버 진입점).

백엔드의 AppApplication 에 대응 — 앱 생성·미들웨어 설정·라우터 등록·실행만 담당하고,
실제 엔드포인트는 controller 계층(ai.controller.ai_controller)에 있다.

개발: 레포 루트에서  python -m ai.app   (기본 :8000)
프론트(vite)는 /ai 요청을 이 서버로 프록시한다 (frontend/vite.config.ts).
"""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .controller.ai_controller import router as ai_router

app = FastAPI(title="jumisa AI 주식전망")

# 개발은 vite 프록시(/ai → 8000)라 동일 출처지만, 직접 호출도 허용해 둔다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)


def main() -> None:
    import uvicorn

    # Render 는 $PORT 주입. 로컬은 AI_PORT, 둘 다 없으면 8000.
    port = int(os.environ.get("PORT") or os.environ.get("AI_PORT") or "8000")
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
