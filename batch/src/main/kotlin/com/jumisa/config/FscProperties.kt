package com.jumisa.config

import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * 금융위원회 공공데이터(data.go.kr) 설정.
 * service-key 는 data.go.kr 일반 인증키(.env DATA_GO_KR_SERVICE_KEY).
 */
@ConfigurationProperties("fsc")
data class FscProperties(
    val serviceKey: String = "",
    val financeBaseUrl: String = "https://apis.data.go.kr/1160100/service/GetFinaStatInfoService_V2",
    val stockBaseUrl: String = "https://apis.data.go.kr/1160100/GetStocIssuInfoService_V3",
)
