package com.jumisa.repository

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository

@Repository
class FinancialsRepository(private val jdbc: JdbcTemplate) {

    /** stock_financials upsert (금융위 요약재무, 억원 단위). PK (stock_code, base_ym). */
    fun upsert(
        stockCode: String, baseYm: String, fnclDcd: String,
        revenueEok: Long?, opProfitEok: Long?, ordProfitEok: Long?, netIncomeEok: Long?,
        totalAssetEok: Long?, totalDebtEok: Long?, totalEquityEok: Long?, debtRatio: Double?,
    ) {
        jdbc.update(
            """
            insert into stock_financials
              (stock_code, base_ym, fncl_dcd, revenue_eok, op_profit_eok, ord_profit_eok, net_income_eok,
               total_asset_eok, total_debt_eok, total_equity_eok, debt_ratio, source, updated_at)
            values (?,?,?,?,?,?,?,?,?,?,?, 'fsc', now())
            on conflict (stock_code, base_ym) do update set
               fncl_dcd = excluded.fncl_dcd, revenue_eok = excluded.revenue_eok,
               op_profit_eok = excluded.op_profit_eok, ord_profit_eok = excluded.ord_profit_eok,
               net_income_eok = excluded.net_income_eok, total_asset_eok = excluded.total_asset_eok,
               total_debt_eok = excluded.total_debt_eok, total_equity_eok = excluded.total_equity_eok,
               debt_ratio = excluded.debt_ratio, source = 'fsc', updated_at = now()
            """.trimIndent(),
            stockCode, baseYm, fnclDcd, revenueEok, opProfitEok, ordProfitEok, netIncomeEok,
            totalAssetEok, totalDebtEok, totalEquityEok, debtRatio,
        )
    }
}
