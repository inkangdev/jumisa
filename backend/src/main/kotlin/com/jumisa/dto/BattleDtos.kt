package com.jumisa.dto

import java.time.Instant

data class CreateRoomRequest(
    val name: String,
    val periodDays: Int,
    val startPoints: Long,
    val maxPlayers: Int,
    val market: String,
    val botCount: Int = 0,        // 컴퓨터(랜덤 봇) 추가 인원
)

data class JoinRoomRequest(
    val inviteCode: String,
)

data class TradeRequest(
    val stockCode: String,
    val type: String,
    val qty: Int,
)

data class ParticipantDto(
    val memberId: Long,
    val username: String,
    val avatar: String?,
    val points: Long,
    val joinedAt: Instant,
)

data class RoomDetailDto(
    val id: Long,
    val name: String,
    val hostMemberId: Long,
    val hostUsername: String,
    val inviteCode: String,
    val periodDays: Int,
    val startPoints: Long,
    val maxPlayers: Int,
    val market: String,
    val status: String,
    val startsAt: Instant?,
    val endsAt: Instant?,
    val participants: List<ParticipantDto>,
)

data class RoomSummaryDto(
    val id: Long,
    val name: String,
    val hostUsername: String,
    val inviteCode: String,
    val periodDays: Int,
    val startPoints: Long,
    val maxPlayers: Int,
    val market: String,
    val status: String,
    val participantCount: Int,
    val endsAt: Instant?,
)

data class RankingEntryDto(
    val rank: Int,
    val memberId: Long,
    val username: String,
    val avatar: String?,
    val cash: Long,
    val stockValue: Long,
    val totalAsset: Long,
    val returnRate: Double,
)

data class HoldingDto(
    val stockCode: String,
    val stockName: String,
    val qty: Int,
    val avgPrice: Int,
    val currentPrice: Int,
    val pnlRate: Double,
)

data class MyPortfolioDto(
    val cash: Long,
    val holdings: List<HoldingDto>,
)

data class TradeResultDto(
    val ok: Boolean,
    val message: String,
)

data class StockWithPriceDto(
    val stockCode: String,
    val name: String,
    val currentPrice: Int,
    val changeRate: Double?,
)