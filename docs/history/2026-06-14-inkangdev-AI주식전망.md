# AI 주식전망 (신규 Python 프로젝트) — 2026-06-14 (inkangdev)

브랜치: `claude/claude-md-reader-jj6zox`

"AI에게 질문해서 주식을 사고/팔지 답변을 받는 어플리케이션" 을 **레포 내 신규 Python 프로젝트**(`ai/`)로 개발한다. DB는 백엔드와 **동일한 Supabase Postgres** 를 그대로 사용한다.

## 결정 사항 (사용자 합의)

- 형태: 주미사 레포 안에 **별도 Python 프로젝트** 신규 개발. 기존 Kotlin 백엔드/React 프론트와 분리.
  - 폴더명은 `backend`/`frontend`/`batch` 와 같은 **'역할' 한 단어**로: `ai/` (내부 파이썬 패키지 `advisor`). (※ 초기 `ai-advisor` 에서 변경 — 다른 폴더들과 성격/카테고리 일치)
- DB: 동일 Supabase Postgres (`SUPABASE_DB_*` 재사용, 읽기 전용).
- 입력: **이미 DB에 적재된 종목 데이터** + **뉴스는 AI가 web_search 로 직접 수집**.
- 모델: **Claude `claude-opus-4-8`** (Anthropic API). adaptive thinking + effort=medium(기본).

기획서 `docs/기능정의서_v1.2.md` §1 "뉴스/AI 분석"(Claude API로 종목 현황 요약, 화면 미정의)의 연장선.

## 구현

```
ai/
  requirements.txt        anthropic / psycopg[binary] / python-dotenv
  .env.example            SUPABASE_DB_* + ANTHROPIC_API_KEY
  README.md
  advisor/
    config.py    환경변수 로딩. JDBC URL(jdbc:) → libpq 변환, 루트 .env 자동 탐색
    models.py    StockMaster/PriceSnapshot/DailyValuation/Financials → StockContext
    db.py        psycopg 로 종목 1건: stock + 최신 stock_price_snapshot + 최신 stock_daily + 최근 stock_financials(4행)
    prompt.py    StockContext → 시스템/유저 프롬프트. "web_search 로 최신 뉴스 직접 수집" 지시 포함
    advisor.py   Claude 호출. tools=[web_search_20260209], stop_reason=pause_turn 재개 루프. 결과 파싱
    cli.py       python -m advisor <종목코드> [--effort] [--model]
    __main__.py
```

### 동작

1. 종목코드 → DB에서 마스터/시세/일봉(PER·PBR·EPS·BPS·52주)/재무(매출·영업이익·순이익·ROE·부채비율) 조회.
2. 이 사실을 프롬프트 기준으로 삼고, Claude 가 **web_search 서버 툴**로 종목 뉴스·공시·실적·업종 이슈를 직접 검색.
3. 출력 첫 줄 `전망: <상승|하락|중립> | 판단: <매수|매도|관망> | 확신도: <상|중|하>` (파싱용) + 이후 분석(핵심전망/근거/리스크/매매의견/참고뉴스) + 면책 문구.

> 네이밍/출력 정정(사용자 요청): "AI 매매의견" → **"AI 주식전망"**. 출력은 **주가 전망(상승/하락/중립) + 매매 의견(매수/매도/관망)** 둘 다 제시.

뉴스는 DB에 적재하지 않고 매 호출 시 모델이 수집 → 별도 뉴스 배치 불필요.

## 검증

- `python -m py_compile advisor/*.py` 그린.
- 의존성 없이 가능한 순수 로직(JDBC→libpq 변환, 전망/판단/확신도 정규식 파싱) 단위 확인 OK.
- DB/API 실호출 e2e 는 자격증명·키 필요 → 로컬 `ai/` 에서 `pip install -r requirements.txt` 후 `python -m advisor 005930` 로 확인.

## 후속/개선 메모

- 출력 구조화: 현재는 텍스트 + 첫 줄 파싱. 필요 시 JSON(structured outputs)로. 단, web_search 는 citations 동반이라 structured outputs 와의 동시 사용은 호환성 확인 필요.
- 미국 종목: 현재 국내 스키마(stock_*) 기준. 미국 종목 지원 시 FMP 데이터 소스/환율 반영.
- 서비스화: 지금은 CLI. 백엔드(REST)·프론트 화면 연동은 별도 슬러그로(기획서 §1 화면 설계 선행 필요).
- 모의투자 연동: 전망·매매 의견을 솔로/대결 거래 화면의 보조 의견으로 노출하는 방안.
