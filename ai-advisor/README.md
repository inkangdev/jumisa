# ai-advisor — AI 주식전망 (jumisa)

AI에게 질문해서 **주가 전망과 사고/팔지** 답변을 받는 신규 Python 프로젝트.

종목코드를 주면:

1. jumisa 백엔드와 **동일한 Supabase Postgres** 에서 그 종목의 사실(현재가·PER/PBR·재무지표 등)을 읽고,
2. **Claude(`claude-opus-4-8`) + web_search 서버 툴**로 최신 뉴스·공시·실적을 *AI가 직접 검색*해 종합한 뒤,
3. **주가 전망(상승/하락/중립)** + **매매 의견(매수/매도/관망)** + 확신도 + 근거 + 리스크를 한국어로 반환한다.

> ⚠️ 모의투자 교육용 참고 의견이며 실제 투자 권유가 아님.

## 설계 메모

- 기획서 `docs/기능정의서_v1.2.md` §1 "뉴스/AI 분석"(Claude API로 종목 현황 요약)의 연장선.
- 뉴스 데이터는 DB에 적재하지 않는다 — 모델이 web_search 로 매 호출 시 직접 수집한다.
- 읽는 테이블: `stock`, `stock_price_snapshot`, `stock_daily`, `stock_financials` (읽기 전용).

## 설치

```bash
cd ai-advisor
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## 설정

DB는 백엔드와 같은 것을 쓰므로, 레포 루트 `.env`(백엔드용)에 `ANTHROPIC_API_KEY` 만 추가하면
ai-advisor 가 루트 `.env` 를 자동으로 읽는다. ai-advisor 만 따로 돌리려면:

```bash
cp .env.example .env   # 값 채우기 (SUPABASE_DB_* + ANTHROPIC_API_KEY)
```

| 변수 | 설명 |
| --- | --- |
| `SUPABASE_DB_URL` | 백엔드와 동일 (JDBC 형식 그대로 가능) |
| `SUPABASE_DB_USER` / `SUPABASE_DB_PASSWORD` | DB 자격증명 |
| `ANTHROPIC_API_KEY` | Claude API 키 |
| `AI_ADVISOR_MODEL` (선택) | 기본 `claude-opus-4-8` |
| `AI_ADVISOR_EFFORT` (선택) | `low`/`medium`/`high`/`max`, 기본 `medium` |

## 사용

```bash
python -m ai_advisor 005930              # 삼성전자
python -m ai_advisor 005930 --effort high
python -m ai_advisor 000660 --model claude-opus-4-8
```

출력 첫 줄은 파싱용 `전망: <상승|하락|중립> | 판단: <매수|매도|관망> | 확신도: <상|중|하>`, 이후 사람이 읽는 분석.

## 구조

```
ai_advisor/
  config.py    환경변수 로딩 (JDBC→libpq 변환, .env 탐색)
  models.py    DB 행 → dataclass (StockContext)
  db.py        psycopg 로 종목 1건의 마스터/시세/일봉/재무 조회
  prompt.py    StockContext → 시스템/유저 프롬프트 (전망+매매의견, 웹검색 지시 포함)
  advisor.py   Claude 호출 (web_search, pause_turn 재개) → Advice(전망/판단/확신도)
  cli.py       python -m ai_advisor <종목코드>
```
