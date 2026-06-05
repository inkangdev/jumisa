package com.jumisa.stock

import org.springframework.jdbc.core.BatchPreparedStatementSetter
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.PreparedStatement
import java.sql.Timestamp

@Repository
class PriceRepository(private val jdbc: JdbcTemplate) {

    /** 인트라데이 시세 스냅샷 배치 적재. 동일 (종목,시각) 중복은 무시. */
    fun insertSnapshots(items: List<PriceSnapshot>) {
        if (items.isEmpty()) return
        val sql = """
            insert into stock_price_snapshot
              (stock_code, snapshot_at, current_price, prev_day_diff, prev_day_sign, change_rate,
               open_price, high_price, low_price, accum_volume, accum_trade_amount, market_cap_eokwon)
            values (?,?,?,?,?,?,?,?,?,?,?,?)
            on conflict (stock_code, snapshot_at) do nothing
        """.trimIndent()

        jdbc.batchUpdate(sql, object : BatchPreparedStatementSetter {
            override fun setValues(ps: PreparedStatement, i: Int) {
                val s = items[i]
                ps.setString(1, s.code)
                ps.setTimestamp(2, Timestamp.from(s.snapshotAt))
                ps.setInt(3, s.price)
                ps.setObject(4, s.diff)
                ps.setString(5, s.sign)
                ps.setObject(6, s.changeRate)
                ps.setObject(7, s.open)
                ps.setObject(8, s.high)
                ps.setObject(9, s.low)
                ps.setObject(10, s.volume)
                ps.setObject(11, s.tradeAmount)
                ps.setObject(12, s.marketCapEok)
            }

            override fun getBatchSize(): Int = items.size
        })
    }

    /** 보관기간(일) 경과한 인트라데이 스냅샷 삭제. */
    fun deleteOlderThan(days: Int): Int =
        jdbc.update("delete from stock_price_snapshot where snapshot_at < now() - make_interval(days => ?)", days)
}
