package com.jumisa.repository

import com.jumisa.dto.StockMaster
import org.springframework.jdbc.core.BatchPreparedStatementSetter
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.PreparedStatement

@Repository
class StockRepository(private val jdbc: JdbcTemplate) {

    /** 시세 폴링 대상(거래가능) 종목코드. */
    fun findTradableCodes(): List<String> =
        jdbc.queryForList(
            "select stock_code from stock where is_tradable order by stock_code",
            String::class.java,
        )

    /** 마스터 파일 파싱 결과를 stock 에 upsert. */
    fun upsertMasters(list: List<StockMaster>) {
        if (list.isEmpty()) return
        val sql = """
            insert into stock
              (stock_code, name, std_code, market, security_type, cap_size_class,
               listed_shares, face_value, capital_eokwon, settle_month,
               is_tradable, is_admin_issue, is_trading_halt, is_liquidation,
               market_warning, is_short_overheat, status_at)
            values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, now())
            on conflict (stock_code) do update set
               name = excluded.name, std_code = excluded.std_code, market = excluded.market,
               security_type = excluded.security_type, cap_size_class = excluded.cap_size_class,
               listed_shares = excluded.listed_shares, face_value = excluded.face_value,
               capital_eokwon = excluded.capital_eokwon, settle_month = excluded.settle_month,
               is_tradable = excluded.is_tradable, is_admin_issue = excluded.is_admin_issue,
               is_trading_halt = excluded.is_trading_halt, is_liquidation = excluded.is_liquidation,
               market_warning = excluded.market_warning, is_short_overheat = excluded.is_short_overheat,
               status_at = now(), updated_at = now()
        """.trimIndent()

        jdbc.batchUpdate(sql, object : BatchPreparedStatementSetter {
            override fun setValues(ps: PreparedStatement, i: Int) {
                val m = list[i]
                ps.setString(1, m.code)
                ps.setString(2, m.name)
                ps.setString(3, m.stdCode)
                ps.setString(4, m.market)
                ps.setString(5, m.securityType)
                ps.setString(6, m.capSizeClass)
                ps.setObject(7, m.listedShares)
                ps.setObject(8, m.faceValue)
                ps.setObject(9, m.capitalEokwon)
                ps.setObject(10, m.settleMonth)
                ps.setBoolean(11, m.isTradable)
                ps.setBoolean(12, m.isAdminIssue)
                ps.setBoolean(13, m.isTradingHalt)
                ps.setBoolean(14, m.isLiquidation)
                ps.setString(15, m.marketWarning)
                ps.setBoolean(16, m.isShortOverheat)
            }

            override fun getBatchSize(): Int = list.size
        })
    }
}
