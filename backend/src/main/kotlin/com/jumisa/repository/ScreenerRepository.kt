package com.jumisa.repository

import com.jumisa.dto.ScreenerItem
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository

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
            "per"  -> "d.per ASC NULLS LAST, u.rank ASC"
            "pbr"  -> "d.pbr ASC NULLS LAST, u.rank ASC"
            else   -> "u.rank ASC"
        }
        val conds = mutableListOf<String>()
        val args  = mutableListOf<Any>()
        if (perMax != null)          { conds += "d.per <= ?";   args += perMax }
        if (pbrMax != null)          { conds += "d.pbr <= ?";   args += pbrMax }
        if (!sector.isNullOrBlank()) { conds += "s.sector = ?"; args += sector }

        val extraWhere = if (conds.isEmpty()) "" else "AND " + conds.joinToString(" AND ")

        val sql = """
            SELECT u.stock_code, s.name, s.sector, s.market,
                   u.total_score, u.rank,
                   d.per, d.pbr,
                   p.current_price, p.change_rate
            FROM undervalue_score u
            JOIN stock s ON s.stock_code = u.stock_code
            LEFT JOIN stock_daily d
                   ON d.stock_code = u.stock_code AND d.base_date = u.base_date
            LEFT JOIN LATERAL (
                SELECT current_price, change_rate
                FROM stock_price_snapshot
                WHERE stock_code = u.stock_code
                ORDER BY snapshot_at DESC
                LIMIT 1
            ) p ON true
            WHERE u.base_date = (SELECT MAX(base_date) FROM undervalue_score)
            $extraWhere
            ORDER BY $orderBy
        """.trimIndent()

        return jdbc.query(sql, { rs, _ ->
            fun dbl(col: String): Double? = rs.getDouble(col).let { if (rs.wasNull()) null else it }
            fun int_(col: String): Int?    = rs.getInt(col).let    { if (rs.wasNull()) null else it }
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
}