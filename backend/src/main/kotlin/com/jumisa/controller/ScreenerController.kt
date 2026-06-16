package com.jumisa.controller

import com.jumisa.dto.ScreenerResponse
import com.jumisa.repository.ScreenerRepository
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/screener")
class ScreenerController(private val repo: ScreenerRepository) {

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
}