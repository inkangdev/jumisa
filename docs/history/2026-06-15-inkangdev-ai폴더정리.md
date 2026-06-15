# AI 폴더 환원(주식전망→ai) + 백엔드식 계층 구조 정리

날짜: 2026-06-15 / 작업자: inkangdev

## 배경

`ai/` 폴더는 원래 `ai`로 만들었으나 `3cea2f8 폴더명 한글화: ai → 주식전망` 커밋에서 한글로 바뀌어 있었다.
이를 다시 `ai`로 되돌리고, 내부 파이썬 파일을 `backend`(controller/service/repository/dto/config) 계층 구조처럼 재정리한다. README도 기능·구조 중심으로 새로 작성.

## 변경 내용

### 1. 폴더 환원
- `주식전망/` → `ai/` (git mv, 이력 보존)

### 2. 백엔드식 계층 구조로 파일 재배치
| 이전 | 이후 |
| --- | --- |
| `config.py` | `config/settings.py` |
| `models.py` | `dto/stock.py` |
| `gemini.py` 의 `Advice`, `qa.py` 의 `QAResult` | `dto/advice.py` (DTO 분리) |
| `db.py` | `repository/stock_repository.py` |
| `prompt.py` | `service/prompt.py` |
| `gemini.py` | `service/gemini_client.py` |
| `qa.py` | `service/qa_service.py` |
| `web.py` | `controller/ai_controller.py`(라우터) + `app.py`(앱 부트스트랩·실행) 로 분리 |
| `cli.py`, `__main__.py` | 루트 유지 (진입점) |

- 각 계층 패키지에 `__init__.py` 추가.
- web 진입점이 `web.py` → `app.py` 로 바뀜: 실행은 `python -m ai.app`.
- 모든 상대 import 를 새 경로로 수정, 내부 배선 import 테스트 통과.

### 3. 외부 참조 동기화
- `render.yaml`: `pip install -r ai/requirements.txt`, `startCommand: python -m ai.app`. 주석/PYTHONUTF8 사유 갱신(한글 패키지명 → 한국어 로그/DB UTF-8).
- `frontend/vite.config.ts`, `frontend/src/api/ai.ts`: 주석의 패키지명/`Claude` → `ai`/`Gemini`.
- `docs/ops/배포.md`: AI 서비스 경로/실행 커맨드/진입점(`app.py`) 갱신.
- `ai/.env.example`, `ai/__init__.py`, `service/prompt.py` 의 `Claude`/`주식전망` 잔재 정리(기능명 "AI 주식전망"은 사용자 노출 명칭이라 유지).

### 4. README 재작성 (`ai/README.md`)
- 기능 표(AI 질문 응답 / 헬스체크 / CLI), 동작 원리, 계층 구조 트리, 설치/설정/실행.

## 참고: HTTP 경로 `/ai` 는 폴더명과 무관 (프록시 경로) — 변경 없음. 프론트의 "AI 주식전망" 기능명도 유지.

## 검증
- `python -m compileall ai` 통과.
- stdlib 의존 모듈(dto/service.prompt/config.settings) 실제 import + 프롬프트 빌더 동작 확인.
- fastapi/genai/psycopg 등 서드파티는 로컬 미설치라 런타임 미검증(배포 환경에서 설치됨).
