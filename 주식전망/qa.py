"""자유 질문 → (주식 관련 판별 → 종목 추출/매칭 → 전망+매매의견).

프론트의 'AI 질문' 팝업이 보내는 자유 텍스트를 처리한다.
주식/투자와 무관한 질문은 거절하고, 관련 질문이면 언급된 종목을 DB에서 찾아
claude.generate_advice 로 전망·매매의견을 만든다.
"""

from __future__ import annotations

import json
from dataclasses import dataclass

import anthropic

from .claude import generate_advice
from .config import Settings
from .db import fetch_stock_context, resolve_stock

_CLASSIFY_SYSTEM = """\
너는 입력 메시지가 '특정 주식/종목에 대한 투자 판단(매수·매도·전망·주가)' 질문인지 분류한다.
- 주식·투자와 무관한 일반 질문이면 stock_related=false.
- 관련된 질문이면 stock_related=true 이고, 언급된 한국 상장 종목의 회사명(또는 6자리 종목코드)을 company 에 넣는다.
- 종목이 특정되지 않으면 company 는 빈 문자열("").
회사명은 정식 종목명에 가깝게 정규화한다(예: "삼성" → "삼성전자" 가 명확하면 그렇게, 모호하면 입력 그대로).
"""

_CLASSIFY_SCHEMA = {
    "type": "object",
    "properties": {
        "stock_related": {"type": "boolean"},
        "company": {"type": "string"},
    },
    "required": ["stock_related", "company"],
    "additionalProperties": False,
}


@dataclass
class QAResult:
    stock_related: bool
    message: str | None = None       # 처리 못 한 이유(거절/종목없음 등)
    stock_code: str | None = None
    stock_name: str | None = None
    outlook: str | None = None       # 상승 | 하락 | 중립
    verdict: str | None = None       # 매수 | 매도 | 관망
    confidence: str | None = None    # 상 | 중 | 하
    answer: str | None = None        # 전체 분석 본문


def _classify(settings: Settings, question: str) -> tuple[bool, str]:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    resp = client.messages.create(
        model=settings.model,
        max_tokens=300,
        system=_CLASSIFY_SYSTEM,
        output_config={"format": {"type": "json_schema", "schema": _CLASSIFY_SCHEMA}},
        messages=[{"role": "user", "content": question}],
    )
    text = next((b.text for b in resp.content if getattr(b, "type", None) == "text"), "{}")
    data = json.loads(text)
    return bool(data.get("stock_related")), str(data.get("company") or "").strip()


def answer_question(settings: Settings, question: str) -> QAResult:
    q = question.strip()
    if not q:
        return QAResult(stock_related=False, message="질문을 입력해 주세요.")

    stock_related, company = _classify(settings, q)
    if not stock_related:
        return QAResult(
            stock_related=False,
            message="주식/투자 관련 질문만 답변할 수 있어요. 종목명을 넣어 물어봐 주세요. (예: \"삼성전자 지금 사도 돼?\")",
        )
    if not company:
        return QAResult(
            stock_related=True,
            message="어떤 종목인지 알려주세요. (예: \"삼성전자 전망 어때?\")",
        )

    resolved = resolve_stock(settings, company)
    if resolved is None:
        return QAResult(
            stock_related=True,
            message=f"'{company}' 종목을 DB에서 찾지 못했어요. 종목명을 정확히 입력해 주세요.",
        )

    code, name = resolved
    ctx = fetch_stock_context(settings, code)
    advice = generate_advice(settings, ctx, question=q)
    return QAResult(
        stock_related=True,
        stock_code=code,
        stock_name=name,
        outlook=advice.outlook,
        verdict=advice.verdict,
        confidence=advice.confidence,
        answer=advice.text,
    )
