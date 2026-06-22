package com.jumisa

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

// 웹 앱 (Render 배포본). 배치/KIS 없음. 대결 봇 매매는 @Scheduled(BattleBotScheduler).
@SpringBootApplication
@EnableScheduling
class AppApplication

fun main(args: Array<String>) {
    runApplication<AppApplication>(*args)
}
