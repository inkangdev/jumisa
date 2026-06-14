package com.jumisa.config

import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * 한국투자증권(KIS) Open API 접속 설정. 값은 .env → application.yml 을 통해 주입된다.
 */
@ConfigurationProperties("kis")
data class KisProperties(
    /** vts = 모의투자 도메인, prod = 실전 도메인 */
    val env: String = "vts",
    val appKey: String = "",
    val appSecret: String = "",
    val accountNo: String = "",
    val accountProductCode: String = "01",
    /** REST 호출 유량 제한 (초당 건수). 실전 권장 ~15, 모의 더 낮게. */
    val ratePerSecond: Double = 8.0,
    /** 접근 토큰 영속 캐시 파일 경로. 비우면 임시 디렉토리에 생성. */
    val tokenCachePath: String = "",
) {
    fun baseUrl(): String = when (env.lowercase()) {
        "prod", "real" -> "https://openapi.koreainvestment.com:9443"
        else -> "https://openapivts.koreainvestment.com:29443"
    }
}
