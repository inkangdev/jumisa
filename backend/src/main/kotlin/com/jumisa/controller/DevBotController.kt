package com.jumisa.controller

import com.jumisa.service.BattleBotService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 봇 매매 즉시 1회 트리거 (개발/운영 수동용). 배치 CLI '즉시 1회' 와 같은 결.
 * /dev 는 SecurityConfig 에서 permitAll. bot_run_log 중복 방지로 같은 스냅샷 반복 호출은 no-op.
 */
@RestController
@RequestMapping("/dev")
class DevBotController(private val botService: BattleBotService) {
    @PostMapping("/bots/run")
    fun run(): ResponseEntity<Any> = ResponseEntity.ok(mapOf("trades" to botService.runOnce()))
}
