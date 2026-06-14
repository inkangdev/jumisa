"""자유 질문 → (주식 관련 판별 → 종목 추출/매칭 → 전망+매매의견).

프론트의 'AI 질문' 팝업이 보내는 자유 텍스트를 처리한다.
주식/투자와 무관한 질문은 거절하고, 관련 질문이면 언급된 종목을 DB에서 찾아
Gemini 로 전망·매매의견을 만든다.
"""

from __future__ import annotations

from dataclasses import dataclass

from .config import Settings
from .db import fetch_stock_context, resolve_stock
from .gemini import classify_stock_question, generate_advice


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


def answer_question(settings: Settings, question: str) -> QAResult:
    q = question.strip()
    if not q:
        return QAResult(stock_related=False, message="질문을 입력해 주세요.")

    stock_related, company = classify_stock_question(settings, q)
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
