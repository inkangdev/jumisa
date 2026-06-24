package com.jumisa.dto

import java.math.BigDecimal
import java.time.LocalDate

data class StockDailyRow(
    val code: String,
    val baseDate: LocalDate,
    val closePrice: Int,
    val openPrice: Int?,
    val highPrice: Int?,
    val lowPrice: Int?,
    val volume: Long?,
    val tradeAmount: Long?,
    val marketCapEok: Long?,
    val per: BigDecimal?,
    val pbr: BigDecimal?,
    val eps: BigDecimal?,
    val bps: BigDecimal?,
    val w52High: Int?,
    val w52Low: Int?,
)

fun CurrentPrice.toDailyRow(code: String, date: LocalDate): StockDailyRow? {
    val close = price?.trim()?.toIntOrNull() ?: return null
    return StockDailyRow(
        code = code,
        baseDate = date,
        closePrice = close,
        openPrice = open?.trim()?.toIntOrNull(),
        highPrice = high?.trim()?.toIntOrNull(),
        lowPrice = low?.trim()?.toIntOrNull(),
        volume = volume?.trim()?.toLongOrNull(),
        tradeAmount = tradeAmount?.trim()?.toLongOrNull(),
        marketCapEok = marketCapEok?.trim()?.toLongOrNull(),
        per = per?.trim()?.toBigDecimalOrNull(),
        pbr = pbr?.trim()?.toBigDecimalOrNull(),
        eps = eps?.trim()?.toBigDecimalOrNull(),
        bps = bps?.trim()?.toBigDecimalOrNull(),
        w52High = w52High?.trim()?.toIntOrNull(),
        w52Low = w52Low?.trim()?.toIntOrNull(),
    )
}

fun DailyChartItem.toDailyRow(code: String): StockDailyRow? {
    val d = date?.trim()?.takeIf { it.length == 8 } ?: return null
    val close = close?.trim()?.toIntOrNull()?.takeIf { it > 0 } ?: return null
    val baseDate = LocalDate.of(
        d.substring(0, 4).toInt(),
        d.substring(4, 6).toInt(),
        d.substring(6, 8).toInt(),
    )
    return StockDailyRow(
        code = code,
        baseDate = baseDate,
        closePrice = close,
        openPrice = open?.trim()?.toIntOrNull(),
        highPrice = high?.trim()?.toIntOrNull(),
        lowPrice = low?.trim()?.toIntOrNull(),
        volume = volume?.trim()?.toLongOrNull(),
        tradeAmount = tradeAmount?.trim()?.toLongOrNull(),
        marketCapEok = null,
        per = null, pbr = null, eps = null, bps = null,
        w52High = null, w52Low = null,
    )
}