package com.jumisa.repository

import com.jumisa.dto.MarketIndex
import com.jumisa.dto.RankItem
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository

@Repository
class DashboardRepository(private val jdbc: JdbcTemplate) {

    /** 최신 기준일의 주요 지수 (코스피→코스닥→코스피200 순). */
    fun findIndices(): List<MarketIndex> =
        jdbc.query(
            """
            SELECT m.index_code, m.index_name, m.close_index, m.prev_diff, m.change_rate,
                   m.base_date::text AS base_date
            FROM market_index_daily m
            JOIN (
                SELECT index_code, MAX(base_date) AS base_date
                FROM market_index_daily GROUP BY index_code
            ) latest ON latest.index_code = m.index_code AND latest.base_date = m.base_date
            ORDER BY m.index_code
            """.trimIndent(),
        ) { rs, _ ->
            fun dbl(col: String): Double? = rs.getDouble(col).let { if (rs.wasNull()) null else it }
            MarketIndex(
                indexCode  = rs.getString("index_code"),
                indexName  = rs.getString("index_name"),
                closeIndex = dbl("close_index"),
                prevDiff   = dbl("prev_diff"),
                changeRate = dbl("change_rate"),
                baseDate   = rs.getString("base_date"),
            )
        }

    /**
     * 최신 기준일의 거래량/등락 랭킹 상위.
     * rank: "up" 등락률 내림차순, "down" 등락률 오름차순, 그 외(vol) 거래량 내림차순.
     * 등락률은 전일 종가 대비로 산출(스크리너와 동일 방식).
     */
    fun findRanking(rank: String, limit: Int): List<RankItem> {
        val orderBy = when (rank) {
            "up"   -> "change_rate DESC NULLS LAST"
            "down" -> "change_rate ASC NULLS LAST"
            else   -> "d.volume DESC NULLS LAST"
        }
        val sql = """
            SELECT s.stock_code, s.name, s.market,
                   d.close_price AS current_price,
                   d.volume,
                   CASE WHEN dp.prev_price > 0
                        THEN round(((d.close_price - dp.prev_price)::numeric / dp.prev_price * 100), 2)
                        ELSE NULL END AS change_rate
            FROM stock s
            JOIN LATERAL (
                SELECT close_price, volume, base_date
                FROM stock_daily WHERE stock_code = s.stock_code
                ORDER BY base_date DESC LIMIT 1
            ) d ON true
            LEFT JOIN LATERAL (
                SELECT close_price AS prev_price
                FROM stock_daily WHERE stock_code = s.stock_code AND base_date < d.base_date
                ORDER BY base_date DESC LIMIT 1
            ) dp ON true
            WHERE s.is_tradable
              AND d.base_date = (SELECT MAX(base_date) FROM stock_daily)
            ORDER BY $orderBy
            LIMIT ?
        """.trimIndent()

        return jdbc.query(sql, { rs, _ ->
            fun dbl(col: String): Double? = rs.getDouble(col).let { if (rs.wasNull()) null else it }
            fun int_(col: String): Int?   = rs.getInt(col).let    { if (rs.wasNull()) null else it }
            fun lng(col: String): Long?   = rs.getLong(col).let   { if (rs.wasNull()) null else it }
            RankItem(
                stockCode    = rs.getString("stock_code"),
                name         = rs.getString("name"),
                market       = rs.getString("market"),
                currentPrice = int_("current_price"),
                changeRate   = dbl("change_rate"),
                volume       = lng("volume"),
            )
        }, limit)
    }

    /** 랭킹 기준일(최신 stock_daily 일자). */
    fun latestDailyDate(): String? =
        jdbc.queryForList("SELECT MAX(base_date)::text FROM stock_daily", String::class.java)
            .firstOrNull()
}
