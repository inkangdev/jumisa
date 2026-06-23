package com.jumisa.controller

import com.jumisa.dto.ScreenerResponse
import com.jumisa.dto.StockChartResponse
import com.jumisa.dto.StockDetail
import com.jumisa.repository.ScreenerRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

@RestController
@RequestMapping("/api/screener")
class ScreenerController(
    private val repo: ScreenerRepository,
) {

    @GetMapping
    fun list(
        @RequestParam(defaultValue = "score") sort: String,
        @RequestParam(required = false) perMax: Double?,
        @RequestParam(required = false) pbrMax: Double?,
        @RequestParam(required = false) sector: String?,
    ): ScreenerResponse {
        val items   = repo.findAll(sort, perMax, pbrMax, sector)
        val sectors = repo.findSectors()
        return ScreenerResponse(items, sectors, items.size)
    }

    @GetMapping("/{stockCode}")
    fun detail(@PathVariable stockCode: String): ResponseEntity<StockDetail> {
        val detail = repo.findDetail(stockCode) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(detail)
    }

    @GetMapping("/{stockCode}/chart")
    fun chart(
        @PathVariable stockCode: String,
        @RequestParam(defaultValue = "3M") period: String,
    ): StockChartResponse {
        val days = when (period) {
            "1M" -> 30
            "3M" -> 90
            "6M" -> 180
            "1Y" -> 365
            else -> 90
        }
        val startDate = LocalDate.now().minusDays(days.toLong())
        val points = repo.findChart(stockCode, startDate)
        return StockChartResponse(stockCode, period, points)
    }
}