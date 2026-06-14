# 주식전망 — AI 주식전망 (jumisa)

jumisa 의 AI 컴포넌트(Python). `backend`/`frontend`/`batch` 와 같은 계층의 신규 프로젝트.
AI에게 질문해서 **주가 전망과 사고/팔지** 답변을 받는다.

종목코드(또는 자유 질문)를 주면:

1. jumisa 백엔드와 **동일한 Supabase Postgres** 에서 그 종목의 사실(현재가·PER/PBR·재무지표 등)을 읽고,
2. **Google Gemini(무료 등급) + Google 검색 grounding** 으로 최신 뉴스·공시·실적을 *AI가 직접 검색*해 종합한 뒤,
3. **주가 전망(상승/하락/중립)** + **매매 의견(매수/매도/관망)** + 확신도 + 근거 + 리스크를 한국어로 반환한다.

> ⚠️ 모의투자 교육용 참고 의견이며 실제 투자 권유가 아님.

## 설계 메모

- 기획서 `docs/기능정의서_v1.2.md` §1 "뉴스/AI 분석"(AI로 종목 현황 요약)의 연장선.
- 뉴스 데이터는 DB에 적재하지 않는다 — 모델이 Google 검색 grounding 으로 매 호출 시 직접 수집한다.
- 읽는 테이블: `stock`, `stock_price_snapshot`, `stock_daily`, `stock_financials` (읽기 전용).
- **AI는 Gemini 무료 등급**(`gemini-2.5-flash`)을 기본 사용 — Claude 유료 API 대신 비용 0.

## 설치

레포 루트(`jumisa/`)에서:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r 주식전망/requirements.txt
```

## 설정

DB는 백엔드와 같은 것을 쓰므로, 레포 루트 `.env`(백엔드용)에 `GEMINI_API_KEY` 만 추가하면
이 컴포넌트가 루트 `.env` 를 자동으로 읽는다. 따로 돌리려면:

```bash
cp .env.example .env   # 값 채우기 (SUPABASE_DB_* + GEMINI_API_KEY)
```

| 변수 | 설명 |
| --- | --- |
| `SUPABASE_DB_URL` | 백엔드와 동일 (JDBC 형식 그대로 가능) |
| `SUPABASE_DB_USER` / `SUPABASE_DB_PASSWORD` | DB 자격증명 |
| `GEMINI_API_KEY` | Google Gemini 키 (무료, https://aistudio.google.com/apikey) |
| `AI_MODEL` (선택) | 기본 `gemini-2.5-flash` |

## 사용 (CLI)

```bash
# 레포 루트에서
python -m 주식전망 005930              # 삼성전자
python -m 주식전망 000660 --model gemini-2.5-flash
```

출력 첫 줄은 파싱용 `전망: <상승|하락|중립> | 판단: <매수|매도|관망> | 확신도: <상|중|하>`, 이후 사람이 읽는 분석.

## 웹 서버 (프론트 연동)

프론트(React)의 우상단 **AI 질문 팝업**이 호출하는 HTTP 엔드포인트(FastAPI).

```bash
# 레포 루트에서 (기본 :8000, AI_PORT/PORT 로 변경)
python -m 주식전망.web
```

- `POST /ai/ask  { "question": "삼성전자 지금 사도 돼?" }`
  → `{ ok, stock_related, message, stock_code, stock_name, outlook, verdict, confidence, answer }`
- 자유 질문 → **①주식 관련 질문인지 판별**(아니면 거절) → **②종목명/코드 추출 후 DB 매칭** → **③전망+매매의견** 생성.
- 프론트는 `frontend/vite.config.ts` 의 프록시(`/ai` → `:8000`)로 호출 → 개발 시 CORS 불필요.

## 구조

```
주식전망/            ← 폴더 = 파이썬 패키지
  requirements.txt
  .env.example
  __main__.py    python -m 주식전망 진입점
  config.py      환경변수 로딩 (JDBC→libpq 변환, .env 탐색)
  models.py      DB 행 → dataclass (StockContext)
  db.py          psycopg 로 종목 1건 조회 + resolve_stock(종목명/코드→코드)
  prompt.py      StockContext → 시스템/유저 프롬프트 (전망+매매의견, 검색 지시 포함)
  gemini.py      Gemini 호출 (Google 검색 grounding) + 주식관련 분류 → Advice
  qa.py          자유질문 → 분류+종목매칭 → answer_question()
  web.py         FastAPI 서버 (POST /ai/ask) — 프론트 팝업이 호출
  cli.py         인자 파싱 / 실행 (CLI)
```

> 내부 `.py` 모듈 파일명은 파이썬 관례상 영문 유지. 폴더(패키지)명만 한글.
