package com.jumisa.repository

import com.jumisa.dto.ScreenerItem
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository

@Repository
class WatchlistRepository(private val jdbc: JdbcTemplate) {

    fun findItemsByMember(memberId: Long, sort: String): List<ScreenerItem> {
        val orderBy = when (sort) {
            "price" -> "p.current_price DESC NULLS LAST"
            "rate"  -> "p.change_rate DESC NULLS LAST"
            "score" -> "u.total_score DESC NULLS LAST"
            else    -> "w.created_at DESC"
        }
        val sql = """
            SELECT s.stock_code, s.name, s.sector, s.market,
                   u.total_score, u.rank,
                   u.per, u.pbr,
                   p.current_price, p.change_rate
            FROM watchlist w
            JOIN stock s ON s.stock_code = w.stock_code
            LEFT JOIN LATERAL (
                SELECT total_score, rank, per, pbr
                FROM undervalue_score
                WHERE stock_code = w.stock_code
                ORDER BY base_date DESC
                LIMIT 1
            ) u ON true
            LEFT JOIN LATERAL (
                SELECT current_price, change_rate
                FROM stock_price_snapshot
                WHERE stock_code = w.stock_code
                ORDER BY snapshot_at DESC
                LIMIT 1
            ) p ON true
            WHERE w.member_id = ?
            ORDER BY $orderBy
        """.trimIndent()

        return jdbc.query(sql, { rs, _ ->
            fun dbl(col: String): Double? = rs.getDouble(col).let { if (rs.wasNull()) null else it }
            fun int_(col: String): Int?   = rs.getInt(col).let   { if (rs.wasNull()) null else it }
            ScreenerItem(
                stockCode    = rs.getString("stock_code"),
                name         = rs.getString("name"),
                sector       = rs.getString("sector"),
                market       = rs.getString("market"),
                totalScore   = dbl("total_score"),
                rank         = int_("rank"),
                per          = dbl("per"),
                pbr          = dbl("pbr"),
                currentPrice = int_("current_price"),
                changeRate   = dbl("change_rate"),
            )
        }, memberId)
    }

    fun findStockCodesByMember(memberId: Long): Set<String> =
        jdbc.queryForList(
            "select stock_code from watchlist where member_id = ?",
            String::class.java, memberId,
        ).toHashSet()

    fun add(memberId: Long, stockCode: String) {
        jdbc.update(
            "insert into watchlist (member_id, stock_code) values (?, ?) on conflict do nothing",
            memberId, stockCode,
        )
    }

    fun remove(memberId: Long, stockCode: String) {
        jdbc.update(
            "delete from watchlist where member_id = ? and stock_code = ?",
            memberId, stockCode,
        )
    }
}