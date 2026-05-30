package com.jumisa.kis

import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 데이터 구조 확인용 임시(dev) 엔드포인트. 테이블 설계가 끝나면 제거 예정.
 *   GET /dev/kis/current-price/005930  → KIS 현재가 raw JSON
 */
@RestController
@RequestMapping("/dev/kis")
class DevKisController(private val kis: KisClient) {

    @GetMapping("/current-price/{code}", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun currentPrice(@PathVariable code: String): String = kis.currentPriceRaw(code)
}
