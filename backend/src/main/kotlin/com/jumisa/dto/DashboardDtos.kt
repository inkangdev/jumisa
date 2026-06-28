package com.jumisa.dto

/** 대시보드 주요 지수 1건 (코스피/코스닥/코스피200). */
data class MarketIndex(
    val indexCode: String,
    val indexName: String,
    val closeIndex: Double?,
    val prevDiff: Double?,
    val changeRate: Double?,
    val baseDate: String?,   // "2026-06-26"
)

/** 거래량/등락 랭킹 1건. */
data class RankItem(
    val stockCode: String,
    val name: String?,
    val market: String?,
    val currentPrice: Int?,
    val changeRate: Double?,
    val volume: Long?,
)

/** 대시보드 응답: 주요 지수 + 랭킹(요청한 종류). 환율은 프론트 정적 UI(데이터 연동 추후). */
data class DashboardResponse(
    val indices: List<MarketIndex>,
    val rank: String,            // vol | up | down
    val ranking: List<RankItem>,
    val baseDate: String?,       // 랭킹 기준일
)
