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
) {
    fun baseUrl(): String = when (env.lowercase()) {
        "prod", "real" -> "https://openapi.koreainvestment.com:9443"
        else -> "https://openapivts.koreainvestment.com:29443"
    }
}
