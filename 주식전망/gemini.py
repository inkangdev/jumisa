"""Gemini(무료 등급) 호출 — DB 사실 + Google 검색 grounding(뉴스 자체 수집) → 주가 전망 + 매매 의견.

- 뉴스는 Gemini 의 Google 검색 grounding 으로 모델이 직접 수집한다(클라이언트가 실행할 것 없음).
- 자유질문이 '주식 관련'인지 판별 + 종목 추출도 Gemini 로 한다(classify_stock_question).
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass

from google import genai
from google.genai import types

from .config import Settings
from .models import StockContext
from .prompt import SYSTEM_PROMPT, build_user_prompt

_OUTLOOK_RE = re.compile(r"전망:\s*(상승|하락|중립)")
_VERDICT_RE = re.compile(r"판단:\s*(매수|매도|관망)")
_CONFIDENCE_RE = re.compile(r"확신도:\s*(상|중|하)")

_CLASSIFY_SYSTEM = """\
너는 입력 메시지가 '특정 주식/종목에 대한 투자 판단(매수·매도·전망·주가)' 질문인지 분류한다.
- 주식·투자와 무관한 일반 질문이면 stock_related=false.
- 관련된 질문이면 stock_related=true 이고, 언급된 한국 상장 종목의 회사명(또는 6자리 종목코드)을 company 에 넣는다.
- 종목이 특정되지 않으면 company 는 빈 문자열("").
반드시 아래 JSON 한 줄만 출력한다(설명·코드펜스 금지):
{"stock_related": true/false, "company": "회사명 또는 6자리코드 또는 빈문자열"}
"""


@dataclass
class Advice:
    stock_code: str
    stock_name: str | None
    outlook: str | None          # 상승 | 하락 | 중립 | None(파싱 실패)
    verdict: str | None          # 매수 | 매도 | 관망 | None(파싱 실패)
    confidence: str | None       # 상 | 중 | 하 | None
    text: str                    # 모델이 생성한 전체 분석 본문


def _client(settings: Settings) -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


def _strip_json(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = t.strip("`")
        # ```json ... ``` 형태에서 앞 'json' 라벨 제거
        if t[:4].lower() == "json":
            t = t[4:]
    return t.strip()


def classify_stock_question(settings: Settings, question: str) -> tuple[bool, str]:
    """질문이 주식 관련인지 + 종목명/코드 추출. (Gemini, 검색 없이)"""
    resp = _client(settings).models.generate_content(
        model=settings.model,
        contents=question,
        config=types.GenerateContentConfig(
            system_instruction=_CLASSIFY_SYSTEM,
            response_mime_type="application/json",
        ),
    )
    try:
        data = json.loads(_strip_json(resp.text or "{}"))
    except (json.JSONDecodeError, TypeError):
        data = {}
    return bool(data.get("stock_related")), str(data.get("company") or "").strip()


def generate_advice(settings: Settings, ctx: StockContext, question: str | None = None) -> Advice:
    user_prompt = build_user_prompt(ctx, question=question)
    resp = _client(settings).models.generate_content(
        model=settings.model,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            # Google 검색 grounding → 최신 뉴스를 모델이 직접 수집
            tools=[types.Tool(google_search=types.GoogleSearch())],
        ),
    )
    text = (resp.text or "").strip()

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
