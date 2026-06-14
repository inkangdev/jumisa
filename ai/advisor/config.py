"""환경설정 로딩.

- DB는 jumisa 백엔드와 **동일한 Supabase Postgres** 를 그대로 쓴다.
  `.env` 의 `SUPABASE_DB_URL`(JDBC 형식)·`SUPABASE_DB_USER`·`SUPABASE_DB_PASSWORD` 를 재사용한다.
- Claude API 는 `ANTHROPIC_API_KEY` 를 사용한다.

`.env` 탐색 순서: 이 프로젝트 폴더(`ai/.env`) → 레포 루트(`.env`).
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


_PROJECT_DIR = Path(__file__).resolve().parent.parent          # ai/
_REPO_ROOT = _PROJECT_DIR.parent                                # jumisa/

# 기본 모델: 최신·최상위 Claude (스킬 권장값).
DEFAULT_MODEL = "claude-opus-4-8"
# 사고 깊이/토큰 비용 조절. low | medium | high | max
DEFAULT_EFFORT = "medium"


def _load_env_files() -> None:
    # 프로젝트 폴더 .env 가 우선, 없으면 루트 .env. (override=False 로 실제 환경변수 보존)
    for candidate in (_PROJECT_DIR / ".env", _REPO_ROOT / ".env"):
        if candidate.is_file():
            load_dotenv(candidate, override=False)


def _jdbc_to_libpq(jdbc_url: str) -> str:
    """`jdbc:postgresql://host:5432/db?sslmode=require` → `postgresql://host:5432/db?sslmode=require`.

    psycopg(libpq) 는 `jdbc:` 접두어를 모르므로 제거한다. 자격증명은 별도 인자로 넘긴다.
    """
    url = jdbc_url.strip()
    if url.startswith("jdbc:"):
        url = url[len("jdbc:"):]
    return url


@dataclass(frozen=True)
class Settings:
    db_url: str
    db_user: str
    db_password: str
    anthropic_api_key: str
    model: str = DEFAULT_MODEL
    effort: str = DEFAULT_EFFORT

    @property
    def conninfo(self) -> str:
        return _jdbc_to_libpq(self.db_url)


class ConfigError(RuntimeError):
    """필수 환경변수 누락."""


def load_settings() -> Settings:
    _load_env_files()

    missing = [
        name
        for name in ("SUPABASE_DB_URL", "SUPABASE_DB_USER", "SUPABASE_DB_PASSWORD", "ANTHROPIC_API_KEY")
        if not os.environ.get(name)
    ]
    if missing:
        raise ConfigError(
            "다음 환경변수가 필요합니다: "
            + ", ".join(missing)
            + "\n  → 레포 루트 .env(백엔드와 동일 DB) 에 채우고, ANTHROPIC_API_KEY 를 추가하세요."
        )

    return Settings(
        db_url=os.environ["SUPABASE_DB_URL"],
        db_user=os.environ["SUPABASE_DB_USER"],
        db_password=os.environ["SUPABASE_DB_PASSWORD"],
        anthropic_api_key=os.environ["ANTHROPIC_API_KEY"],
        model=os.environ.get("AI_ADVISOR_MODEL", DEFAULT_MODEL),
        effort=os.environ.get("AI_ADVISOR_EFFORT", DEFAULT_EFFORT),
    )
