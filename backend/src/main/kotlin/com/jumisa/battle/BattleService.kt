package com.jumisa.battle

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlin.random.Random

@Service
class BattleService(private val repo: BattleRepository) {

    @Transactional
    fun createRoom(hostMemberId: Long, req: CreateRoomRequest): Long {
        val name = req.name.trim()
        require(name.isNotBlank()) { "방 이름을 입력하세요" }
        require(req.periodDays in listOf(3, 7, 14, 30)) { "대결 기간은 3/7/14/30일 중 선택하세요" }
        require(req.startPoints in listOf(500_000L, 1_000_000L, 3_000_000L)) { "시작 포인트가 올바르지 않습니다" }
        require(req.maxPlayers in 2..20) { "최대 인원은 2~20명 사이여야 합니다" }
        require(req.market in listOf("both", "kr", "us")) { "시장 설정이 올바르지 않습니다" }

        val inviteCode = generateInviteCode()
        val roomId = repo.insertRoom(name, hostMemberId, inviteCode, req.periodDays, req.startPoints, req.maxPlayers, req.market)
        repo.insertParticipant(roomId, hostMemberId, 0L)
        return roomId
    }

    @Transactional
    fun joinRoom(memberId: Long, inviteCode: String): Long {
        val room = repo.findRoomByInviteCode(inviteCode) ?: error("초대 코드가 올바르지 않습니다")
        check(room.status == "waiting") { "이미 시작되었거나 종료된 대결입니다" }
        check(repo.findParticipant(room.id, memberId) == null) { "이미 참가 중입니다" }
        check(repo.participantCount(room.id) < room.maxPlayers) { "방이 가득 찼습니다" }
        repo.insertParticipant(room.id, memberId, 0L)
        return room.id
    }

    @Transactional
    fun startBattle(hostMemberId: Long, roomId: Long) {
        val room = repo.findRoomById(roomId) ?: error("대결방을 찾을 수 없습니다")
        check(room.hostMemberId == hostMemberId) { "방장만 시작할 수 있습니다" }
        check(room.status == "waiting") { "이미 시작되었거나 종료된 대결입니다" }

        val now = Instant.now()
        val endsAt = now.plus(room.periodDays.toLong(), ChronoUnit.DAYS)
        repo.updateRoomStatus(roomId, "active", now, endsAt)

        repo.findParticipantsByRoom(roomId).forEach { p ->
            repo.updateParticipantPoints(p.id, room.startPoints)
        }
    }

    @Transactional
    fun trade(memberId: Long, roomId: Long, req: TradeRequest): TradeResultDto {
        val room = repo.findRoomById(roomId) ?: return TradeResultDto(false, "대결방을 찾을 수 없습니다")
        if (room.status != "active") return TradeResultDto(false, "진행 중인 대결이 아닙니다")

        val participant = repo.findParticipant(roomId, memberId)
            ?: return TradeResultDto(false, "참가자가 아닙니다")
        if (req.qty <= 0) return TradeResultDto(false, "수량은 1 이상이어야 합니다")

        val price = repo.findLatestPrice(req.stockCode)
            ?: return TradeResultDto(false, "시세 정보가 없습니다 (장 마감 또는 미적재 종목)")

        val totalCost = price.toLong() * req.qty

        return when (req.type) {
            "buy" -> {
                if (participant.points < totalCost)
                    return TradeResultDto(false, "포인트가 부족합니다")
                repo.updateParticipantPoints(participant.id, participant.points - totalCost)
                val existing = repo.findHolding(participant.id, req.stockCode)
                val prevQty = existing?.qty ?: 0
                val newQty = prevQty + req.qty
                val newAvg = if (prevQty == 0) price
                else ((existing!!.avgPrice.toLong() * prevQty + price.toLong() * req.qty) / newQty).toInt()
                repo.upsertHolding(participant.id, req.stockCode, newQty, newAvg)
                repo.insertTrade(participant.id, req.stockCode, "buy", req.qty, price)
                TradeResultDto(true, "매수 체결 완료")
            }
            "sell" -> {
                val existing = repo.findHolding(participant.id, req.stockCode)
                    ?: return TradeResultDto(false, "보유 종목이 없습니다")
                if (existing.qty < req.qty)
                    return TradeResultDto(false, "보유 수량이 부족합니다 (보유: ${existing.qty}주)")
                repo.updateParticipantPoints(participant.id, participant.points + totalCost)
                repo.upsertHolding(participant.id, req.stockCode, existing.qty - req.qty, existing.avgPrice)
                repo.insertTrade(participant.id, req.stockCode, "sell", req.qty, price)
                TradeResultDto(true, "매도 체결 완료")
            }
            else -> TradeResultDto(false, "잘못된 거래 타입입니다")
        }
    }

    fun getRanking(roomId: Long): List<RankingEntryDto> {
        val room = repo.findRoomById(roomId) ?: error("대결방을 찾을 수 없습니다")
        return repo.findParticipantsByRoom(roomId).map { p ->
            val holdings = repo.findHoldingsByParticipant(p.id)
            val stockValue = holdings.sumOf { h ->
                (repo.findLatestPrice(h.stockCode) ?: h.avgPrice).toLong() * h.qty
            }
            val totalAsset = p.points + stockValue
            val returnRate = (totalAsset - room.startPoints).toDouble() / room.startPoints * 100.0
            val (username, avatar) = repo.findMemberById(p.memberId) ?: ("?" to null)
            RankingEntryDto(0, p.memberId, username, avatar, p.points, stockValue, totalAsset, returnRate)
        }.sortedByDescending { it.returnRate }.mapIndexed { i, e -> e.copy(rank = i + 1) }
    }

    fun getMyPortfolio(memberId: Long, roomId: Long): MyPortfolioDto {
        val participant = repo.findParticipant(roomId, memberId) ?: error("참가자가 아닙니다")
        val holdings = repo.findHoldingsByParticipant(participant.id).map { h ->
            val cur = repo.findLatestPrice(h.stockCode) ?: h.avgPrice
            val pnlRate = (cur - h.avgPrice).toDouble() / h.avgPrice * 100.0
            HoldingDto(h.stockCode, repo.findStockName(h.stockCode) ?: h.stockCode, h.qty, h.avgPrice, cur, pnlRate)
        }
        return MyPortfolioDto(participant.points, holdings)
    }

    fun getRoomDetail(roomId: Long): RoomDetailDto {
        val room = repo.findRoomById(roomId) ?: error("대결방을 찾을 수 없습니다")
        val (hostUsername, _) = repo.findMemberById(room.hostMemberId) ?: ("?" to null)
        val participants = repo.findParticipantsByRoom(roomId).map { p ->
            val (username, avatar) = repo.findMemberById(p.memberId) ?: ("?" to null)
            ParticipantDto(p.memberId, username, avatar, p.points, p.joinedAt)
        }
        return RoomDetailDto(
            room.id, room.name, room.hostMemberId, hostUsername,
            room.inviteCode, room.periodDays, room.startPoints, room.maxPlayers,
            room.market, room.status, room.startsAt, room.endsAt, participants,
        )
    }

    fun listRooms(memberId: Long): Map<String, List<RoomSummaryDto>> {
        fun toSummary(r: BattleRoomRow): RoomSummaryDto {
            val (hostUsername, _) = repo.findMemberById(r.hostMemberId) ?: ("?" to null)
            return RoomSummaryDto(
                r.id, r.name, hostUsername, r.inviteCode, r.periodDays,
                r.startPoints, r.maxPlayers, r.market, r.status,
                repo.participantCount(r.id), r.endsAt,
            )
        }
        return mapOf(
            "waiting" to repo.findWaitingRoomsNotJoined(memberId).map(::toSummary),
            "active" to repo.findRoomsByMemberAndStatus(memberId, "active").map(::toSummary),
            "myWaiting" to repo.findRoomsByMemberAndStatus(memberId, "waiting").map(::toSummary),
        )
    }

    fun listKrStocks(): List<StockWithPriceDto> = repo.findKrStocksWithLatestPrice()

    private fun generateInviteCode(): String {
        val chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        return (1..6).map { chars[Random.nextInt(chars.length)] }.joinToString("")
    }
}