package com.jumisa.repository

import com.jumisa.dto.ChartPoint
import com.jumisa.dto.ScreenerItem
import com.jumisa.dto.StockDetail
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import java.time.LocalDate

@Repository
class ScreenerRepository(private val jdbc: JdbcTemplate) {

    fun findSectors(): List<String> =
        jdbc.queryForList(
            """
            SELECT DISTINCT s.sector
            FROM undervalue_score u
            JOIN stock s ON s.stock_code = u.stock_code
            WHERE u.base_date = (SELECT MAX(base_date) FROM undervalue_score)
              AND s.sector IS NOT NULL
            ORDER BY s.sector
            """.trimIndent(),
            String::class.java
        )

    fun findAll(
        sort: String,
        perMax: Double?,
        pbrMax: Double?,
        sector: String?,
    ): List<ScreenerItem> {
        val orderBy = when (sort) {
            "per" -> "u.per ASC NULLS LAST, u.rank ASC"
            "pbr" -> "u.pbr ASC NULLS LAST, u.rank ASC"
            else  -> "u.rank ASC"
        }
        val conds = mutableListOf<String>()
        val args  = mutableListOf<Any>()
        if (perMax != null)          { conds += "u.per <= ?";   args += perMax }
        if (pbrMax != null)          { conds += "u.pbr <= ?";   args += pbrMax }
        if (!sector.isNullOrBlank()) { conds += "s.sector = ?"; args += sector }

        val extraWhere = if (conds.isEmpty()) "" else "AND " + conds.joinToString(" AND ")

        val sql = """
            SELECT u.stock_code, s.name, s.sector, s.market,
                   u.total_score, u.rank,
                   u.per, u.pbr,
                   d.current_price,
                   CASE WHEN dp.prev_price > 0
                        THEN round(((d.current_price - dp.prev_price)::numeric / dp.prev_price * 100), 2)
                        ELSE NULL END AS change_rate
            FROM undervalue_score u
            JOIN stock s ON s.stock_code = u.stock_code
            LEFT JOIN LATERAL (
                SELECT close_price AS current_price, base_date
                FROM stock_daily WHERE stock_code = u.stock_code
                ORDER BY base_date DESC LIMIT 1
            ) d ON true
            LEFT JOIN LATERAL (
                SELECT close_price AS prev_price
                FROM stock_daily WHERE stock_code = u.stock_code AND base_date < d.base_date
                ORDER BY base_date DESC LIMIT 1
            ) dp ON d.base_date IS NOT NULL
            WHERE u.base_date = (SELECT MAX(base_date) FROM undervalue_score)
            $extraWhere
            ORDER BY $orderBy
        """.trimIndent()

        return jdbc.query(sql, { rs, _ ->
            fun dbl(col: String): Double? = rs.getDouble(col).let { if (rs.wasNull()) null else it }
            fun int_(col: String): Int?   = rs.getInt(col).let    { if (rs.wasNull()) null else it }
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
        }, *args.toTypedArray())
    }

    fun findDetail(stockCode: String): StockDetail? {
        return jdbc.query(
            """
            SELECT u.stock_code, s.name, s.sector, s.market,
                   u.total_score, u.rank,
                   u.per, u.pbr,
                   d.current_price,
                   CASE WHEN dp.prev_price > 0
                        THEN round(((d.current_price - dp.prev_price)::numeric / dp.prev_price * 100), 2)
                        ELSE NULL END AS change_rate
            FROM undervalue_score u
            JOIN stock s ON s.stock_code = u.stock_code
            LEFT JOIN LATERAL (
                SELECT close_price AS current_price, base_date
                FROM stock_daily WHERE stock_code = u.stock_code
                ORDER BY base_date DESC LIMIT 1
            ) d ON true
            LEFT JOIN LATERAL (
                SELECT close_price AS prev_price
                FROM stock_daily WHERE stock_code = u.stock_code AND base_date < d.base_date
                ORDER BY base_date DESC LIMIT 1
            ) dp ON d.base_date IS NOT NULL
            WHERE u.stock_code = ?
              AND u.base_date = (SELECT MAX(base_date) FROM undervalue_score)
            """.trimIndent(),
            { rs, _ ->
                fun dbl(col: String): Double? = rs.getDouble(col).let { if (rs.wasNull()) null else it }
                fun int_(col: String): Int?   = rs.getInt(col).let    { if (rs.wasNull()) null else it }
                StockDetail(
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
            },
            stockCode
        ).firstOrNull()
    }

    fun findChart(stockCode: String, startDate: LocalDate): List<ChartPoint> =
        jdbc.query(
            """
            SELECT base_date::text AS date, close_price AS price
            FROM stock_daily
            WHERE stock_code = ? AND base_date >= ?
            ORDER BY base_date
            """.trimIndent(),
            { rs, _ -> ChartPoint(rs.getString("date"), rs.getInt("price")) },
            stockCode,
            java.sql.Date.valueOf(startDate),
        )
}