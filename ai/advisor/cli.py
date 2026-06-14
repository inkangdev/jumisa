"""커맨드라인 진입점.

사용 (ai/ 폴더에서):
    python -m advisor 005930
    python -m advisor 005930 --effort high
"""

from __future__ import annotations

import argparse
import sys

from .advisor import generate_advice
from .config import ConfigError, load_settings
from .db import StockNotFound, fetch_stock_context


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="advisor",
        description="DB 종목 데이터 + Claude(웹검색)로 AI 주식전망(상승/하락/중립)과 매매 의견을 생성한다.",
    )
    parser.add_argument("stock_code", help="6자리 종목코드 (예: 005930)")
    parser.add_argument(
        "--effort",
        choices=["low", "medium", "high", "max"],
        help="사고 깊이/토큰 비용 (기본: 설정값/medium)",
    )
    parser.add_argument("--model", help="사용할 Claude 모델 ID (기본: claude-opus-4-8)")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)

    try:
        settings = load_settings()
    except ConfigError as exc:
        print(f"[설정오류] {exc}", file=sys.stderr)
        return 2

    if args.effort:
        settings = settings.__class__(**{**settings.__dict__, "effort": args.effort})
    if args.model:
        settings = settings.__class__(**{**settings.__dict__, "model": args.model})

    try:
        ctx = fetch_stock_context(settings, args.stock_code)
    except StockNotFound as exc:
        print(f"[조회실패] {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # DB 연결/쿼리 오류
        print(f"[DB오류] {exc}", file=sys.stderr)
        return 1

    print(f"▶ {ctx.master.name or ''} ({args.stock_code}) AI 주식전망 생성 중… (모델 {settings.model})\n")

    try:
        advice = generate_advice(settings, ctx)
    except Exception as exc:  # API 오류
        print(f"[API오류] {exc}", file=sys.stderr)
        return 1

    header = f"전망: {advice.outlook or '미파싱'} | 판단: {advice.verdict or '미파싱'}"
    if advice.confidence:
        header += f" | 확신도: {advice.confidence}"
    print("=" * 60)
    print(header)
    print("=" * 60)
    print(advice.text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
