package com.jumisa.dev

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 스키마 적용 결과 확인용 임시(dev) 엔드포인트. 설계 검증 후 제거 예정.
 *   GET /dev/db/tables → 우리 테이블들의 컬럼 목록
 */
@RestController
@RequestMapping("/dev/db")
class DevDbController(private val jdbc: JdbcTemplate) {

    @GetMapping("/tables")
    fun tables(): Map<String, Any> {
        val targets = listOf("stock", "stock_price_snapshot", "stock_valuation")
        val result = LinkedHashMap<String, Any>()
        for (t in targets) {
            val cols = jdbc.queryForList(
                """
                select column_name, data_type
                from information_schema.columns
                where table_schema = 'public' and table_name = ?
                order by ordinal_position
                """.trimIndent(),
                t,
            )
            result[t] = mapOf("exists" to cols.isNotEmpty(), "columnCount" to cols.size, "columns" to cols)
        }
        return result
    }
}
