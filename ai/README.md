# ai — AI 주식전망 (jumisa)

jumisa 의 AI 컴포넌트(Python / FastAPI). `backend`·`frontend`·`batch` 와 같은 계층의 신규 프로젝트다.
사용자가 종목에 대해 물으면 **주가 전망(상승/하락/중립)** 과 **매매 의견(매수/매도/관망)** 을 답한다.

종목코드(또는 자유 질문)를 주면:

1. jumisa 백엔드와 **동일한 Supabase Postgres** 에서 그 종목의 사실(현재가·PER/PBR·재무지표 등)을 읽고,
2. **Google Gemini(무료 등급) + Google 검색 grounding** 으로 최신 뉴스·공시·실적을 *AI가 직접 검색*해 종합한 뒤,
3. **전망 + 매매 의견 + 확신도 + 근거 + 리스크** 를 한국어로 반환한다.

> ⚠️ 모의투자 교육용 참고 의견이며 실제 투자 권유가 아님.

## 기능

| 기능 | 진입점 | 설명 |
| --- | --- | --- |
| **AI 질문 응답** | `POST /ai/ask` | 프론트 'AI 질문' 팝업의 자유 질문 처리. ①주식 관련 질문인지 판별(아니면 거절) → ②종목명/코드 추출 후 DB 매칭 → ③전망+매매의견 생성 |
| **헬스체크** | `GET /ai/health` | Render 헬스체크용 (`{ ok: true }`) |
| **CLI 전망** | `python -m ai <종목코드>` | 종목 1건의 전망/매매의견을 터미널에 출력 (디버깅·수동 확인용) |

### 동작 원리

- **DB 사실이 근거의 출발점**: `stock`, `stock_price_snapshot`, `stock_daily`, `stock_financials` 4개 테이블을 **읽기 전용**으로 조회. 숫자를 지어내지 않는다.
- **뉴스는 적재하지 않는다**: 최신 뉴스·이슈는 Gemini 의 Google 검색 grounding 으로 매 호출 시 모델이 직접 수집한다.
- **AI는 Gemini 무료 등급**(`gemini-2.5-flash`) 기본 사용 — 비용 0.
- 응답 첫 줄은 파싱용 고정 형식: `전망: <상승|하락|중립> | 판단: <매수|매도|관망> | 확신도: <상|중|하>`, 이후 사람이 읽는 분석.

## 구조

`backend` 의 계층 패키지(controller / service / repository / dto / config)를 그대로 따른다.

```
ai/                         ← 폴더 = 파이썬 패키지
  __main__.py               python -m ai 진입점 (→ cli.main)
  cli.py                    CLI: 인자 파싱 / 실행
  app.py                    FastAPI 앱 부트스트랩 + 실행 (web 진입점: python -m ai.app)
  config/
    settings.py             환경변수 로딩 (JDBC→libpq 변환, .env 탐색, Settings)
  controller/
    ai_controller.py        HTTP 라우터 (GET /ai/health, POST /ai/ask)
  service/
    qa_service.py           자유질문 → 분류+종목매칭 → answer_question()
    gemini_client.py        Gemini 호출 (Google 검색 grounding) + 주식관련 분류
    prompt.py               StockContext → 시스템/유저 프롬프트 구성
  repository/
    stock_repository.py     psycopg 로 종목 1건 조회 + resolve_stock(종목명/코드→코드)
  dto/
    stock.py                DB 행 → dataclass (StockMaster/PriceSnapshot/… → StockContext)
    advice.py               AI 출력 DTO (Advice, QAResult)
  requirements.txt
  .env.example
```

호출 흐름: `controller → service → repository / gemini_client`, 데이터는 `dto` 로 주고받는다.

## 설치

레포 루트(`jumisa/`)에서:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r ai/requirements.txt
```

## 설정

DB는 백엔드와 같은 것을 쓰므로, 레포 루트 `.env`(백엔드용)에 `GEMINI_API_KEY` 만 추가하면
이 컴포넌트가 루트 `.env` 를 자동으로 읽는다. 따로 돌리려면 `cp ai/.env.example ai/.env` 후 값 채우기.

| 변수 | 설명 |
| --- | --- |
| `SUPABASE_DB_URL` | 백엔드와 동일 (JDBC 형식 그대로 가능 — 코드가 `jdbc:` 접두어를 떼고 libpq 로 변환) |
| `SUPABASE_DB_USER` / `SUPABASE_DB_PASSWORD` | DB 자격증명 |
| `GEMINI_API_KEY` | Google Gemini 키 (무료, https://aistudio.google.com/apikey) |
| `AI_MODEL` (선택) | 기본 `gemini-2.5-flash` |

## 실행

레포 루트에서:

```bash
# 웹 서버 (프론트 'AI 질문' 팝업이 호출. 기본 :8000, AI_PORT/PORT 로 변경)
python -m ai.app

# CLI (디버깅용 — 종목 1건 전망 출력)
python -m ai 005930                       # 삼성전자
python -m ai 000660 --model gemini-2.5-flash
```

- `POST /ai/ask  { "question": "삼성전자 지금 사도 돼?" }`
  → `{ ok, stock_related, message, stock_code, stock_name, outlook, verdict, confidence, answer }`
- 프론트는 `frontend/vite.config.ts` 의 프록시(`/ai` → `:8000`)로 호출 → 개발 시 CORS 불필요.
- 배포: `render.yaml` 의 `jumisa-ai` 서비스(빌드 `pip install -r ai/requirements.txt`, 실행 `python -m ai.app`).

## 설계 메모

- 기획서 `docs/기능정의서_v1.2.md` §1 "뉴스/AI 분석"(AI로 종목 현황 요약)의 연장선.
- 내부 `.py` 모듈 파일명은 파이썬 관례상 영문. 폴더(패키지)명도 `ai` 로 영문 통일(이전 `주식전망` → `ai` 환원).
