"""환경설정 로딩.

- DB는 jumisa 백엔드와 **동일한 Supabase Postgres** 를 그대로 쓴다.
  `.env` 의 `SUPABASE_DB_URL`(JDBC 형식)·`SUPABASE_DB_USER`·`SUPABASE_DB_PASSWORD` 를 재사용한다.
- AI 는 **Google Gemini(무료 등급)** 를 사용한다. `GEMINI_API_KEY` (aistudio.google.com 발급).

`.env` 탐색 순서: 이 프로젝트 폴더(`주식전망/.env`) → 레포 루트(`.env`).
백엔드와 같은 DB를 보려면 보통 루트 `.env` 하나면 된다.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # python-dotenv 미설치 시에도 환경변수만으로 동작
    def load_dotenv(*_args, **_kwargs):  # type: ignore
        return False


_PROJECT_DIR = Path(__file__).resolve().parent                 # 주식전망/
_REPO_ROOT = _PROJECT_DIR.parent                                # jumisa/

# 기본 모델: Gemini 무료 등급 Flash. (env AI_MODEL 로 교체 가능 — 예: gemini-3-flash)
DEFAULT_MODEL = "gemini-2.5-flash"


def _load_env_files() -> None:
    for candidate in (_PROJECT_DIR / ".env", _REPO_ROOT / ".env"):
        if candidate.is_file():
            load_dotenv(candidate, override=False)


def _jdbc_to_libpq(jdbc_url: str) -> str:
    """`jdbc:postgresql://host:5432/db?...` → `postgresql://host:5432/db?...` (jdbc: 접두어 제거)."""
    url = jdbc_url.strip()
    if url.startswith("jdbc:"):
        url = url[len("jdbc:"):]
    return url


@dataclass(frozen=True)
class Settings:
    db_url: str
    db_user: str
    db_password: str
    gemini_api_key: str
    model: str = DEFAULT_MODEL

    @property
    def conninfo(self) -> str:
        return _jdbc_to_libpq(self.db_url)


class ConfigError(RuntimeError):
    """필수 환경변수 누락."""


def load_settings() -> Settings:
    _load_env_files()

    missing = [
        name
        for name in ("SUPABASE_DB_URL", "SUPABASE_DB_USER", "SUPABASE_DB_PASSWORD", "GEMINI_API_KEY")
        if not os.environ.get(name)
    ]
    if missing:
        raise ConfigError(
            "다음 환경변수가 필요합니다: "
            + ", ".join(missing)
            + "\n  → 레포 루트 .env(백엔드와 동일 DB) 에 채우고, GEMINI_API_KEY 를 추가하세요."
        )

    return Settings(
        db_url=os.environ["SUPABASE_DB_URL"],
        db_user=os.environ["SUPABASE_DB_USER"],
        db_password=os.environ["SUPABASE_DB_PASSWORD"],
        gemini_api_key=os.environ["GEMINI_API_KEY"],
        model=os.environ.get("AI_MODEL", DEFAULT_MODEL),
    )
