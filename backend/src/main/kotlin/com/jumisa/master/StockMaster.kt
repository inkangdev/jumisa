package com.jumisa.master

/** KIS 마스터 파일에서 파싱한 종목 기초정보 (보통주). */
data class StockMaster(
    val code: String,
    val name: String,
    val stdCode: String?,
    val market: String,
    val securityType: String,
    val capSizeClass: String?,
    val listedShares: Long?,
    val faceValue: Int?,
    val capitalEokwon: Long?,
    val settleMonth: Int?,
    val isTradable: Boolean,
    val isAdminIssue: Boolean,
    val isTradingHalt: Boolean,
    val isLiquidation: Boolean,
    val marketWarning: String?,
    val isShortOverheat: Boolean,
)
