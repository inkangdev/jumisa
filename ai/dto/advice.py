"""AI 출력 DTO — 전망/매매의견 결과 구조.

- Advice: 모델이 생성한 전망·판단·확신도 + 본문 (service.gemini_client 가 만든다).
- QAResult: 프론트 'AI 질문' 응답 형태 (service.qa_service 가 만든다).
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Advice:
    stock_code: str
    stock_name: str | None
    outlook: str | None          # 상승 | 하락 | 중립 | None(파싱 실패)
    verdict: str | None          # 매수 | 매도 | 관망 | None(파싱 실패)
    confidence: str | None       # 상 | 중 | 하 | None
    text: str                    # 모델이 생성한 전체 분석 본문


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
