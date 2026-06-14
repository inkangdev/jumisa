"""Supabase Postgres(=jumisa 백엔드와 동일 DB) 조회.

종목코드(6자리) 1건에 대해 마스터/최신시세/최신일봉/최근재무를 모아 StockContext 로 반환.
"""

from __future__ import annotations

import re

import psycopg
from psycopg.rows import dict_row

from .config import Settings
from .models import (
    DailyValuation,
    Financials,
    PriceSnapshot,
    StockContext,
    StockMaster,
)


class StockNotFound(LookupError):
    """해당 종목코드가 stock 테이블에 없음."""


_CODE_RE = re.compile(r"^\d{6}$")


def resolve_stock(settings: "Settings", query: str) -> tuple[str, str] | None:
    """자유 입력(종목명 또는 6자리 코드) → (종목코드, 종목명). 못 찾으면 None.

    - 6자리 숫자면 코드로 간주.
    - 아니면 이름 정확 일치(보통주 우선) → 부분 일치(거래가능, 짧은 이름 우선) 순.
    """
    q = query.strip()
    if not q:
        return None
    with _connect(settings) as conn, conn.cursor(row_factory=dict_row) as cur:
        if _CODE_RE.match(q):
            cur.execute("select stock_code, name from stock where stock_code = %s", (q,))
            row = cur.fetchone()
            return (row["stock_code"], row["name"]) if row else None

        cur.execute(
            """
            select stock_code, name from stock
            where name = %s
            order by case when security_type = '보통주' then 0 else 1 end
            limit 1
            """,
            (q,),
        )
        row = cur.fetchone()
        if row:
            return (row["stock_code"], row["name"])

        cur.execute(
            """
            select stock_code, name from stock
            where name ilike %s and is_tradable
            order by case when security_type = '보통주' then 0 else 1 end, length(name)
            limit 1
            """,
            (f"%{q}%",),
        )
        row = cur.fetchone()
        return (row["stock_code"], row["name"]) if row else None


def _connect(settings: Settings) -> psycopg.Connection:
    # 자격증명은 conninfo 가 아니라 별도 인자로 — JDBC URL 에는 user/password 가 없다.
    return psycopg.connect(
        settings.conninfo,
        user=settings.db_user,
        password=settings.db_password,
        autocommit=True,
    )


def fetch_stock_context(settings: Settings, stock_code: str) -> StockContext:
    code = stock_code.strip()
    with _connect(settings) as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            select stock_code, name, market, sector, security_type, cap_size_class,
                   listed_shares, market_warning, is_tradable, is_admin_issue,
                   is_trading_halt, is_liquidation
            from stock
            where stock_code = %s
            """,
            (code,),
        )
        row = cur.fetchone()
        if row is None:
            raise StockNotFound(f"종목코드 {code} 를 stock 테이블에서 찾을 수 없습니다.")
        master = StockMaster(**row)

        cur.execute(
            """
            select snapshot_at, current_price, change_rate, prev_day_diff,
                   open_price, high_price, low_price, accum_volume, market_cap_eokwon
            from stock_price_snapshot
            where stock_code = %s
            order by snapshot_at desc
            limit 1
            """,
            (code,),
        )
        prow = cur.fetchone()
        latest_price = PriceSnapshot(**prow) if prow else None

        cur.execute(
            """
            select base_date, close_price, per, pbr, eps, bps,
                   w52_high, w52_low, market_cap_eokwon
            from stock_daily
            where stock_code = %s
            order by base_date desc
            limit 1
            """,
            (code,),
        )
        drow = cur.fetchone()
        latest_daily = DailyValuation(**drow) if drow else None

        cur.execute(
            """
            select base_ym, revenue_eok, op_profit_eok, net_income_eok,
                   total_asset_eok, total_debt_eok, total_equity_eok,
                   roe, eps, bps, debt_ratio, fncl_dcd, source
            from stock_financials
            where stock_code = %s
            order by base_ym desc
            limit 4
            """,
            (code,),
        )
        financials = [Financials(**r) for r in cur.fetchall()]

    return StockContext(
        master=master,
        latest_price=latest_price,
        latest_daily=latest_daily,
        financials=financials,
    )
