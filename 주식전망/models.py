"""DB 에서 읽어온 종목 스냅샷 데이터 구조.

jumisa 스키마(backend/db/schema.sql) 의 stock / stock_price_snapshot /
stock_daily / stock_financials 를 종목 1건 기준으로 모은 것.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class StockMaster:
    stock_code: str
    name: str | None
    market: str | None
    sector: str | None
    security_type: str | None
    cap_size_class: str | None
    listed_shares: int | None
    market_warning: str | None
    is_tradable: bool
    is_admin_issue: bool
    is_trading_halt: bool
    is_liquidation: bool


@dataclass
class PriceSnapshot:
    snapshot_at: object              # datetime
    current_price: int
    change_rate: float | None
    prev_day_diff: int | None
    open_price: int | None
    high_price: int | None
    low_price: int | None
    accum_volume: int | None
    market_cap_eokwon: int | None


@dataclass
class DailyValuation:
    base_date: object                # date
    close_price: int | None
    per: float | None
    pbr: float | None
    eps: float | None
    bps: float | None
    w52_high: int | None
    w52_low: int | None
    market_cap_eokwon: int | None


@dataclass
class Financials:
    base_ym: str
    revenue_eok: int | None
    op_profit_eok: int | None
    net_income_eok: int | None
    total_asset_eok: int | None
    total_debt_eok: int | None
    total_equity_eok: int | None
    roe: float | None
    eps: float | None
    bps: float | None
    debt_ratio: float | None
    fncl_dcd: str | None
    source: str | None


@dataclass
class StockContext:
    """한 종목에 대해 AI 에게 넘길 모든 DB 사실(fact)."""

    master: StockMaster
    latest_price: PriceSnapshot | None
    latest_daily: DailyValuation | None
    financials: list[Financials] = field(default_factory=list)
