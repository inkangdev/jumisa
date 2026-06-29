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
     * 당일(실시간) 거래량/등락 랭킹 상위 — stock_price_snapshot 기준.
     * rank: "up" 등락률 내림차순, "down" 등락률 오름차순, 그 외(vol) 당일 누적거래량 내림차순.
     *
     * '최신 스냅샷일'(=오늘 장중이면 오늘, 아니면 마지막 거래일)에 대해 종목별 최신 스냅샷 1건 사용.
     * change_rate(전일대비등락률)·accum_volume(당일 누적거래량)은 KIS 제공값이라 그대로 정확
     * → 증권사 앱과 동일한 권위 데이터. 인위적 ±30% 컷은 두지 않음(거래재개·신규상장 등 정상
     *   초과치를 가려 오히려 증권사와 달라짐). 과거 stock_daily 계산 방식은 일자 커버리지 공백 시
     *   비연속 거래일과 비교돼 등락률이 왜곡됐던 문제(상한가 30% 초과 가짜값)가 있었음.
     */
    fun findRanking(rank: String, limit: Int): List<RankItem> {
        val orderBy = when (rank) {
            "up"   -> "change_rate DESC NULLS LAST"
            "down" -> "change_rate ASC NULLS LAST"
            else   -> "accum_volume DESC NULLS LAST"
        }
        val sql = """
            WITH latest_day AS (
                SELECT max((snapshot_at AT TIME ZONE 'Asia/Seoul')::date) AS d
                FROM stock_price_snapshot
            ),
            latest_snap AS (
                SELECT DISTINCT ON (sp.stock_code)
                       sp.stock_code, sp.current_price, sp.change_rate, sp.accum_volume
                FROM stock_price_snapshot sp, latest_day
                WHERE (sp.snapshot_at AT TIME ZONE 'Asia/Seoul')::date = latest_day.d
                ORDER BY sp.stock_code, sp.snapshot_at DESC
            )
            SELECT s.stock_code, s.name, s.market,
                   ls.current_price,
                   ls.accum_volume AS volume,
                   ls.change_rate
            FROM latest_snap ls
            JOIN stock s ON s.stock_code = ls.stock_code AND s.is_tradable
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

    /** 랭킹 기준일(최신 스냅샷 일자, KST). 랭킹이 스냅샷 기반이므로 동일 소스로 일자 표기. */
    fun latestRankingDate(): String? =
        jdbc.queryForList(
            "SELECT max((snapshot_at AT TIME ZONE 'Asia/Seoul')::date)::text FROM stock_price_snapshot",
            String::class.java,
        ).firstOrNull()
}
