package com.jumisa.dto

import java.math.BigDecimal
import java.time.Instant

/** stock_price_snapshot 적재용 인트라데이 시세 행. */
data class PriceSnapshot(
    val code: String,
    val snapshotAt: Instant,
    val price: Int,
    val diff: Int?,
    val sign: String?,
    val changeRate: BigDecimal?,
    val open: Int?,
    val high: Int?,
    val low: Int?,
    val volume: Long?,
    val tradeAmount: Long?,
    val marketCapEok: Long?,
)

/** KIS 현재가 응답 → 스냅샷 행. 현재가가 없으면 null(스킵). */
fun CurrentPrice.toSnapshot(code: String, at: Instant): PriceSnapshot? {
    val p = price?.trim()?.toIntOrNull() ?: return null
    return PriceSnapshot(
        code = code,
        snapshotAt = at,
        price = p,
        diff = diff?.trim()?.toIntOrNull(),
        sign = sign?.trim()?.ifEmpty { null },
        changeRate = changeRate?.trim()?.toBigDecimalOrNull(),
        open = open?.trim()?.toIntOrNull(),
        high = high?.trim()?.toIntOrNull(),
        low = low?.trim()?.toIntOrNull(),
        volume = volume?.trim()?.toLongOrNull(),
        tradeAmount = tradeAmount?.trim()?.toLongOrNull(),
        marketCapEok = marketCapEok?.trim()?.toLongOrNull(),
    )
}
