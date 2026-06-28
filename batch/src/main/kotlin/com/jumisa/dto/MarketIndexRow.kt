package com.jumisa.dto

import java.math.BigDecimal
import java.time.LocalDate

/** 지수 일봉 한 행 (market_index_daily). */
data class MarketIndexRow(
    val indexCode: String,
    val indexName: String,
    val baseDate: LocalDate,
    val closeIndex: BigDecimal,
    val prevDiff: BigDecimal?,
    val prevSign: String?,
    val changeRate: BigDecimal?,
    val openIndex: BigDecimal?,
    val highIndex: BigDecimal?,
    val lowIndex: BigDecimal?,
    val volume: Long?,
    val tradeAmount: Long?,
)

fun IndexPrice.toIndexRow(code: String, name: String, date: LocalDate): MarketIndexRow? {
    val close = price?.trim()?.toBigDecimalOrNull() ?: return null
    return MarketIndexRow(
        indexCode = code,
        indexName = name,
        baseDate = date,
        closeIndex = close,
        prevDiff = diff?.trim()?.toBigDecimalOrNull(),
        prevSign = sign?.trim()?.ifBlank { null },
        changeRate = changeRate?.trim()?.toBigDecimalOrNull(),
        openIndex = open?.trim()?.toBigDecimalOrNull(),
        highIndex = high?.trim()?.toBigDecimalOrNull(),
        lowIndex = low?.trim()?.toBigDecimalOrNull(),
        volume = volume?.trim()?.toLongOrNull(),
        tradeAmount = tradeAmount?.trim()?.toLongOrNull(),
    )
}
