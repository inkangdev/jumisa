"""Claude 호출 — DB 사실 + web_search(뉴스 자체 수집) → 주가 전망 + 매매 의견.

web_search 는 Anthropic 서버사이드 툴이라 클라이언트가 실행할 게 없다. 다만 서버 툴 루프가
10회 한도에 닿으면 stop_reason='pause_turn' 으로 끊기므로, 그 경우 대화를 재전송해 이어간다.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

import anthropic

from .config import Settings
from .models import StockContext
from .prompt import SYSTEM_PROMPT, build_user_prompt

# 뉴스 수집용 웹 검색 서버 툴 (동적 필터링 지원 버전).
_WEB_SEARCH_TOOL = {"type": "web_search_20260209", "name": "web_search"}

_MAX_CONTINUATIONS = 6          # pause_turn 재개 상한 (무한루프 방지)
_MAX_TOKENS = 8000

_OUTLOOK_RE = re.compile(r"전망:\s*(상승|하락|중립)")
_VERDICT_RE = re.compile(r"판단:\s*(매수|매도|관망)")
_CONFIDENCE_RE = re.compile(r"확신도:\s*(상|중|하)")


@dataclass
class Advice:
    stock_code: str
    stock_name: str | None
    outlook: str | None          # 상승 | 하락 | 중립 | None(파싱 실패)
    verdict: str | None          # 매수 | 매도 | 관망 | None(파싱 실패)
    confidence: str | None       # 상 | 중 | 하 | None
    text: str                    # 모델이 생성한 전체 분석 본문


def _extract_text(content) -> str:
    return "".join(block.text for block in content if getattr(block, "type", None) == "text")


def generate_advice(settings: Settings, ctx: StockContext, question: str | None = None) -> Advice:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    user_prompt = build_user_prompt(ctx, question=question)
    messages = [{"role": "user", "content": user_prompt}]

    response = None
    for _ in range(_MAX_CONTINUATIONS + 1):
        response = client.messages.create(
            model=settings.model,
            max_tokens=_MAX_TOKENS,
            system=SYSTEM_PROMPT,
            thinking={"type": "adaptive"},
            output_config={"effort": settings.effort},
            tools=[_WEB_SEARCH_TOOL],
            messages=messages,
        )
        if response.stop_reason != "pause_turn":
            break
        # 서버 툴 루프가 끊긴 경우: 어시스턴트 응답을 그대로 붙여 재전송하면 서버가 이어서 진행.
        messages = [
            {"role": "user", "content": user_prompt},
            {"role": "assistant", "content": response.content},
        ]

    assert response is not None
    text = _extract_text(response.content).strip()

    outlook_m = _OUTLOOK_RE.search(text)
    verdict_m = _VERDICT_RE.search(text)
    conf_m = _CONFIDENCE_RE.search(text)

    return Advice(
        stock_code=ctx.master.stock_code,
        stock_name=ctx.master.name,
        outlook=outlook_m.group(1) if outlook_m else None,
        verdict=verdict_m.group(1) if verdict_m else None,
        confidence=conf_m.group(1) if conf_m else None,
        text=text,
    )
