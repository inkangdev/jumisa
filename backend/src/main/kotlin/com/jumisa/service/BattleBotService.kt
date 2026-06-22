package com.jumisa.service

import com.jumisa.dto.StockWithPriceDto
import com.jumisa.dto.TradeRequest
import com.jumisa.repository.BattleRepository
import com.jumisa.repository.BotParticipantRow
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlin.random.Random

/**
 * 대결 봇 자동 매매 (기능정의서 v1.4 §5.6).
 * 봇은 별도 매매 엔진이 아니라 BattleService.trade() 를 재사용하는 "스케줄이 눌러주는 참가자".
 * 사람과 동일한 시세(stock_price_snapshot)만 보고, 같은 스냅샷은 방당 1회만 거래한다.
 */
@Service
class BattleBotService(
    private val repo: BattleRepository,
    private val battle: BattleService,
) {
    private val log = LoggerFactory.getLogger(BattleBotService::class.java)

    /** 활성 방의 봇들이 최신 시세 1회분에 대해 자동 매매. 체결된 거래 수 반환. */
    fun runOnce(): Int {
        val snapAt = repo.latestSnapshotAt() ?: return 0
        // 휴장/마감 후 stale 시세로는 매매하지 않음
        if (snapAt.isBefore(Instant.now().minus(90, ChronoUnit.MINUTES))) return 0

        var trades = 0
        for (room in repo.findRoomsByStatus("active")) {
            val ends = room.endsAt
            if (ends != null && !Instant.now().isBefore(ends)) {
                repo.updateRoomStatus(room.id, "finished", room.startsAt, room.endsAt)   // 종료 처리(겸함)
                continue
            }
            if (room.market == "us") continue                       // 현재 KR 시세만 지원
            if (!repo.tryMarkBotRun(room.id, snapAt)) continue       // 이 스냅샷 이미 처리됨 → 중복 방지

            val universe = repo.findKrStocksWithLatestPrice()
            if (universe.isEmpty()) continue

            for (bot in repo.findBotParticipants(room.id)) {
                for (req in decide(bot, universe, snapAt)) {
                    if (battle.trade(bot.memberId, room.id, req).ok) trades++  // 실패(잔고부족 등)는 스킵
                }
            }
        }
        if (trades > 0) log.info("[bot] {} trades executed (snapshot={})", trades, snapAt)
        return trades
    }

    /** random 전략: 20% 쉼 / 보유 있으면 일부 매도 / 아니면 현금 일부로 무작위 매수. */
    private fun decide(bot: BotParticipantRow, universe: List<StockWithPriceDto>, snapAt: Instant): List<TradeRequest> {
        if (bot.botStrategy != "random") return emptyList()
        val rng = Random(bot.botSeed xor snapAt.epochSecond)   // 시간마다 다르되 봇별 개성 유지
        val roll = rng.nextDouble()
        val holdings = repo.findHoldingsByParticipant(bot.id)
        return when {
            roll < 0.20 -> emptyList()                          // 이번 턴 쉼
            holdings.isNotEmpty() && roll < 0.50 -> {            // 보유 중 1종목 일부 매도
                val h = holdings[rng.nextInt(holdings.size)]
                listOf(TradeRequest(h.stockCode, "sell", 1 + rng.nextInt(h.qty)))
            }
            else -> {                                           // 현금 10~25% 로 무작위 1종목 매수
                val stock = universe[rng.nextInt(universe.size)]
                val budget = (bot.points * (0.10 + rng.nextDouble() * 0.15)).toLong()
                val qty = (budget / stock.currentPrice).toInt()
                if (qty >= 1) listOf(TradeRequest(stock.stockCode, "buy", qty)) else emptyList()
            }
        }
    }
}
