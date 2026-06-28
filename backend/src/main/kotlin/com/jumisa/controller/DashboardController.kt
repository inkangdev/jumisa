package com.jumisa.controller

import com.jumisa.dto.DashboardResponse
import com.jumisa.repository.DashboardRepository
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * 대시보드(홈) 데이터: 주요 지수 + 오늘 거래량/등락 랭킹.
 * 환율 섹션은 프론트 정적 UI(데이터 연동 추후)라 여기서 다루지 않는다.
 */
@RestController
@RequestMapping("/api/dashboard")
class DashboardController(
    private val repo: DashboardRepository,
) {
    @GetMapping
    fun dashboard(
        @RequestParam(defaultValue = "vol") rank: String,
        @RequestParam(defaultValue = "20") limit: Int,
    ): DashboardResponse {
        val kind = if (rank in setOf("vol", "up", "down")) rank else "vol"
        val capped = limit.coerceIn(1, 50)
        return DashboardResponse(
            indices = repo.findIndices(),
            rank = kind,
            ranking = repo.findRanking(kind, capped),
            baseDate = repo.latestDailyDate(),
        )
    }
}
