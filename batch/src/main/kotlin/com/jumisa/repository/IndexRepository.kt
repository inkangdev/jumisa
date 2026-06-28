package com.jumisa.repository

import com.jumisa.dto.MarketIndexRow
import org.springframework.jdbc.core.BatchPreparedStatementSetter
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.Date
import java.sql.PreparedStatement

@Repository
class IndexRepository(private val jdbc: JdbcTemplate) {

    /** 지수 일봉 배치 upsert. 같은 (지수, 날짜)가 있으면 전 컬럼 덮어쓰기. */
    fun insertIndexRows(rows: List<MarketIndexRow>) {
        if (rows.isEmpty()) return
        val sql = """
            insert into market_index_daily
              (index_code, index_name, base_date, close_index, prev_diff, prev_sign, change_rate,
               open_index, high_index, low_index, volume, trade_amount)
            values (?,?,?,?,?,?,?,?,?,?,?,?)
            on conflict (index_code, base_date) do update set
              index_name   = excluded.index_name,
              close_index  = excluded.close_index,
              prev_diff    = excluded.prev_diff,
              prev_sign    = excluded.prev_sign,
              change_rate  = excluded.change_rate,
              open_index   = excluded.open_index,
              high_index   = excluded.high_index,
              low_index    = excluded.low_index,
              volume       = excluded.volume,
              trade_amount = excluded.trade_amount
        """.trimIndent()

        jdbc.batchUpdate(sql, object : BatchPreparedStatementSetter {
            override fun setValues(ps: PreparedStatement, i: Int) {
                val r = rows[i]
                ps.setString(1, r.indexCode)
                ps.setString(2, r.indexName)
                ps.setDate(3, Date.valueOf(r.baseDate))
                ps.setBigDecimal(4, r.closeIndex)
                ps.setObject(5, r.prevDiff)
                ps.setString(6, r.prevSign)
                ps.setObject(7, r.changeRate)
                ps.setObject(8, r.openIndex)
                ps.setObject(9, r.highIndex)
                ps.setObject(10, r.lowIndex)
                ps.setObject(11, r.volume)
                ps.setObject(12, r.tradeAmount)
            }
            override fun getBatchSize() = rows.size
        })
    }
}
