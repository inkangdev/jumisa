# AI 주식전망 (신규 Python 프로젝트) — 2026-06-14 (inkangdev)

브랜치: `claude/claude-md-reader-jj6zox`

"AI에게 질문해서 주식을 사고/팔지 답변을 받는 어플리케이션" 을 **레포 내 신규 Python 프로젝트**(`주식전망/`)로 개발한다. DB는 백엔드와 **동일한 Supabase Postgres** 를 그대로 사용한다.

## 결정 사항 (사용자 합의)

- 형태: 주미사 레포 안에 **별도 Python 프로젝트** 신규 개발. 기존 Kotlin 백엔드/React 프론트와 분리.
  - 폴더(=파이썬 패키지)명은 **한글 `주식전망/`** (사용자 요청). 내부 `.py` 모듈명은 파이썬 관례상 영문 유지. (※ `ai-advisor` → `ai/advisor` → `ai` → `주식전망` 로 정리)
- DB: 동일 Supabase Postgres (`SUPABASE_DB_*` 재사용, 읽기 전용).
- 입력: **이미 DB에 적재된 종목 데이터** + **뉴스는 AI가 web_search 로 직접 수집**.
- 모델: **Claude `claude-opus-4-8`** (Anthropic API). adaptive thinking + effort=medium(기본).

기획서 `docs/기능정의서_v1.2.md` §1 "뉴스/AI 분석"(Claude API로 종목 현황 요약, 화면 미정의)의 연장선.

## 구현

`주식전망/` 폴더 = 파이썬 패키지 (별도 nested 패키지 없이). 실행: 레포 루트에서 `python -m 주식전망 <종목코드>`.

```
주식전망/
  requirements.txt   anthropic / psycopg[binary] / python-dotenv
  .env.example       SUPABASE_DB_* + ANTHROPIC_API_KEY
  README.md
  __main__.py        python -m 주식전망 진입점
  config.py          환경변수 로딩. JDBC URL(jdbc:) → libpq 변환, 루트 .env 자동 탐색
  models.py          StockMaster/PriceSnapshot/DailyValuation/Financials → StockContext
  db.py              psycopg 로 종목 1건: stock + 최신 stock_price_snapshot + 최신 stock_daily + 최근 stock_financials(4행)
  prompt.py          StockContext → 시스템/유저 프롬프트. "web_search 로 최신 뉴스 직접 수집" 지시 포함
  claude.py          Claude 호출. tools=[web_search_20260209], stop_reason=pause_turn 재개 루프. 결과 파싱
  cli.py             인자 파싱 / 실행
```

### 동작

1. 종목코드 → DB에서 마스터/시세/일봉(PER·PBR·EPS·BPS·52주)/재무(매출·영업이익·순이익·ROE·부채비율) 조회.
2. 이 사실을 프롬프트 기준으로 삼고, Claude 가 **web_search 서버 툴**로 종목 뉴스·공시·실적·업종 이슈를 직접 검색.
3. 출력 첫 줄 `전망: <상승|하락|중립> | 판단: <매수|매도|관망> | 확신도: <상|중|하>` (파싱용) + 이후 분석(핵심전망/근거/리스크/매매의견/참고뉴스) + 면책 문구.

> 네이밍/출력 정정(사용자 요청): "AI 매매의견" → **"AI 주식전망"**. 출력은 **주가 전망(상승/하락/중립) + 매매 의견(매수/매도/관망)** 둘 다 제시.

뉴스는 DB에 적재하지 않고 매 호출 시 모델이 수집 → 별도 뉴스 배치 불필요.

## 검증

- `python -m py_compile 주식전망/*.py` 그린.
- 의존성 없이 가능한 순수 로직(JDBC→libpq 변환, 전망/판단/확신도 정규식 파싱) 단위 확인 OK.
- DB/API 실호출 e2e 는 자격증명·키 필요 → 레포 루트에서 `pip install -r 주식전망/requirements.txt` 후 `python -m 주식전망 005930` 로 확인.

## 프론트 접목 (이어서, 사용자 요청)

로그인 후 **메인 레이아웃 우상단에 AI 질문 아이콘(✨)** → 클릭 시 **레이어팝업**으로 자유 질문 → 파이썬 AI(주식전망)가 처리한 결과를 화면에 표시. **주식 관련 질문일 때만** 처리.

- **Python(주식전망)**
  - `db.resolve_stock()` — 종목명/6자리코드 → (코드,이름) DB 매칭(정확→부분일치, 보통주 우선).
  - `prompt.build_user_prompt(ctx, question=...)` / `claude.generate_advice(..., question=...)` — 사용자 원질문을 분석에 반영.
  - `qa.answer_question()` — ①Claude 구조화출력으로 *주식관련 판별+종목추출* → ②`resolve_stock` → ③`generate_advice`. 무관/종목없음은 메시지로 거절.
  - `web.py` — FastAPI `POST /ai/ask` (+ `/ai/health`). 실행 `python -m 주식전망.web` (:8000). requirements 에 fastapi/uvicorn 추가.
- **frontend (React)**
  - `vite.config.ts` 프록시 `/ai` → `:8000` 추가.
  - `src/api/ai.ts` — `ask(question)` 클라이언트.
  - `src/screens/ai/AiAskModal.tsx` — 레이어팝업(질문 textarea + 전망/판단/확신도 뱃지 + 본문). 거절/종목없음 메시지 처리.
  - `src/layout/AppShell.tsx` — 우상단 ✨ 버튼 + 모달 상태.
- 검증: `python -m py_compile 주식전망/*.py` 그린. 프론트는 node_modules 미설치라 로컬 `npm install` 후 타입체크 필요.
- 미해결: AI 엔드포인트 인가(현재 프론트에서 로그인 시에만 노출, 서버단 세션검증은 미적용 — 추후 Spring 세션/토큰 연동 검토). 배포 시 파이썬 서비스 호스팅(Render 별도 서비스 or 로컬) 결정 필요.

## 후속/개선 메모

- 출력 구조화: 현재는 텍스트 + 첫 줄 파싱. 필요 시 JSON(structured outputs)로. 단, web_search 는 citations 동반이라 structured outputs 와의 동시 사용은 호환성 확인 필요.
- 미국 종목: 현재 국내 스키마(stock_*) 기준. 미국 종목 지원 시 FMP 데이터 소스/환율 반영.
- 서비스화: 지금은 CLI. 백엔드(REST)·프론트 화면 연동은 별도 슬러그로(기획서 §1 화면 설계 선행 필요).
- 모의투자 연동: 전망·매매 의견을 솔로/대결 거래 화면의 보조 의견으로 노출하는 방안.
