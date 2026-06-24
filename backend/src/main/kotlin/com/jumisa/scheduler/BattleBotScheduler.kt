package com.jumisa.scheduler

import com.jumisa.service.BattleBotService
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/** 장중(평일 09~15시) 매시 5분, 시세 적재 직후 봇 매매 1회. */
@Component
class BattleBotScheduler(private val botService: BattleBotService) {
    @Scheduled(cron = "0 5 9-15 * * MON-FRI", zone = "Asia/Seoul")
    fun tick() {
        botService.runOnce()
    }
}
