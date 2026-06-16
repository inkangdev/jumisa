# ai — FastAPI(Gemini 주식전망). 레포 루트 기준 `python -m ai.app` 으로 실행.
# 빌드 컨텍스트 = 레포 루트.

FROM python:3.12-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONUTF8=1 \
    PYTHONDONTWRITEBYTECODE=1

# 의존성 캐시: requirements 먼저
COPY ai/requirements.txt ./ai/requirements.txt
RUN pip install --no-cache-dir -r ai/requirements.txt

# 패키지 복사 (ai.app 진입점은 PORT 환경변수를 읽음)
COPY ai/ ./ai/

EXPOSE 8000
CMD ["python", "-m", "ai.app"]
