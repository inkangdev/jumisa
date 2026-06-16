package com.jumisa.dto

data class ScreenerItem(
    val stockCode: String,
    val name: String?,
    val sector: String?,
    val market: String?,
    val totalScore: Double?,
    val rank: Int?,
    val per: Double?,
    val pbr: Double?,
    val currentPrice: Int?,
    val changeRate: Double?,
)

data class ScreenerResponse(
    val items: List<ScreenerItem>,
    val sectors: List<String>,
    val totalCount: Int,
)