"""StockContext → Claude 프롬프트(시스템/유저) 구성. (AI 주식전망)

- 시스템: 역할·출력 형식·면책 규정. 전망(상승/하락/중립) + 매매의견(매수/매도/관망).
- 유저: DB 사실(fact) 표 + "웹에서 최신 뉴스를 직접 수집해 분석하라" 지시.
  뉴스는 DB 에 없으므로 모델이 web_search 툴로 직접 모은다.
"""

from __future__ import annotations

from .models import StockContext

SYSTEM_PROMPT = """\
당신은 한국 주식 모의투자 서비스 'jumisa' 의 AI 주식전망 애널리스트다.
사용자가 특정 종목에 대해 물으면, 향후 주가 방향성을 전망하고 그에 따른 매매 의견을 함께 제시한다.

원칙:
1. 제공된 DB 사실(현재가·PER/PBR·재무지표)을 근거의 출발점으로 삼는다. 숫자를 지어내지 말 것.
2. 최신 뉴스·이슈는 검색(Google)으로 직접 찾아 수집한다. (해당 종목명/코드, 실적, 공시, 업종 동향 등)
3. 향후 주가 방향성을 상승 / 하락 / 중립 중 하나로 전망한다. (단기~중기 기준)
4. 그 전망에 따른 매매 의견을 매수 / 매도 / 관망 중 하나로 제시한다. 확신도(상/중/하)도 함께.
5. 근거와 리스크를 균형 있게 제시한다. 한쪽 정보만 보고 단정하지 않는다.
6. 모든 답변은 한국어로 작성한다.

매우 중요 — 출력 형식:
- 첫 줄은 반드시 기계가 파싱할 수 있게 다음 형식으로만 쓴다:
  `전망: <상승|하락|중립> | 판단: <매수|매도|관망> | 확신도: <상|중|하>`
- 그 다음 줄부터 사람이 읽는 분석을 쓴다. 권장 섹션:
  ## 핵심 전망 / ## 근거 / ## 리스크 / ## 매매 의견 / ## 참고한 뉴스(출처 링크)

면책: 이것은 모의투자 교육용 참고 의견이며 실제 투자 권유가 아니다. 마지막 줄에 이 면책 문구를 반드시 포함한다.
"""


def _fmt(value: object, suffix: str = "") -> str:
    if value is None:
        return "정보없음"
    return f"{value}{suffix}"


def build_user_prompt(ctx: StockContext, question: str | None = None) -> str:
    m = ctx.master
    lines: list[str] = []
    lines.append(f"# 분석 대상 종목: {m.name or '(이름없음)'} ({m.stock_code})")
    if question:
        lines.append("")
        lines.append(f"## 사용자 질문\n{question.strip()}")
        lines.append("(아래 분석은 이 질문에 답하는 형태로 작성한다.)")
    lines.append("")
    lines.append("## DB 에 적재된 사실 (기준 데이터)")
    lines.append(f"- 시장/업종: {_fmt(m.market)} / {_fmt(m.sector)}")
    lines.append(f"- 증권구분: {_fmt(m.security_type)} · 시총규모: {_fmt(m.cap_size_class)}")
    lines.append(f"- 상장주식수: {_fmt(m.listed_shares, '주')}")

    flags = []
    if not m.is_tradable:
        flags.append("거래불가")
    if m.is_admin_issue:
        flags.append("관리종목")
    if m.is_trading_halt:
        flags.append("거래정지")
    if m.is_liquidation:
        flags.append("정리매매")
    if m.market_warning:
        flags.append(f"시장경고:{m.market_warning}")
    lines.append(f"- 거래상태 경고: {', '.join(flags) if flags else '특이사항 없음'}")

    p = ctx.latest_price
    lines.append("")
    lines.append("### 최신 시세 (1시간 단위 적재)")
    if p:
        lines.append(
            f"- 기준시각: {p.snapshot_at} · 현재가: {_fmt(p.current_price, '원')} "
            f"(전일대비 {_fmt(p.prev_day_diff, '원')}, 등락률 {_fmt(p.change_rate, '%')})"
        )
        lines.append(
            f"- 시/고/저: {_fmt(p.open_price)} / {_fmt(p.high_price)} / {_fmt(p.low_price)} · "
            f"누적거래량: {_fmt(p.accum_volume)} · 시총: {_fmt(p.market_cap_eokwon, '억원')}"
        )
    else:
        lines.append("- 시세 적재 없음 (가격 정보 부재 — 평가 시 명시할 것)")

    d = ctx.latest_daily
    lines.append("")
    lines.append("### 최신 일봉 가치지표")
    if d:
        lines.append(
            f"- 기준일: {d.base_date} · 종가: {_fmt(d.close_price, '원')} · "
            f"PER: {_fmt(d.per)} · PBR: {_fmt(d.pbr)}"
        )
        lines.append(
            f"- EPS: {_fmt(d.eps)} · BPS: {_fmt(d.bps)} · "
            f"52주 최고/최저: {_fmt(d.w52_high)} / {_fmt(d.w52_low)}"
        )
    else:
        lines.append("- 일봉/가치지표 적재 없음")

    lines.append("")
    lines.append("### 최근 재무 (연간/분기, 단위 억원·%)")
    if ctx.financials:
        for f in ctx.financials:
            lines.append(
                f"- {f.base_ym}: 매출 {_fmt(f.revenue_eok)} · 영업이익 {_fmt(f.op_profit_eok)} · "
                f"순이익 {_fmt(f.net_income_eok)} · ROE {_fmt(f.roe, '%')} · 부채비율 {_fmt(f.debt_ratio, '%')}"
            )
    else:
        lines.append("- 재무 적재 없음")

    lines.append("")
    lines.append("## 요청")
    lines.append(
        "위 DB 사실을 기준으로 삼되, **검색으로 이 종목의 최신 뉴스·실적·공시·업종 이슈를 직접 찾아**서 "
        "종합한 뒤, 향후 주가를 **상승 / 하락 / 중립** 중 하나로 전망하고, 그에 따른 **매수 / 매도 / 관망** "
        "매매 의견과 근거·리스크를 제시하라."
    )
    return "\n".join(lines)
