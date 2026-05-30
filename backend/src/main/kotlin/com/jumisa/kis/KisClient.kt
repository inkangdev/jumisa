package com.jumisa.kis

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty
import com.jumisa.config.KisProperties
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

/**
 * KIS Open API 호출 클라이언트.
 * 1) accessToken(): appkey/appsecret 으로 접근 토큰 발급(메모리 캐시)
 * 2) currentPriceRaw(): 국내주식 현재가 시세 raw JSON 그대로 반환 (데이터 구조 확인용)
 */
@Component
class KisClient(private val props: KisProperties) {

    private val rest: RestClient = RestClient.builder()
        .baseUrl(props.baseUrl())
        // 4xx/5xx 여도 예외 던지지 않고 응답 본문을 그대로 받아 디버깅할 수 있게 함
        .defaultStatusHandler({ it.isError }, { _, _ -> })
        .build()

    @Volatile
    private var cachedToken: String? = null

    fun accessToken(): String {
        cachedToken?.let { return it }
        val resp = rest.post()
            .uri("/oauth2/tokenP")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                mapOf(
                    "grant_type" to "client_credentials",
                    "appkey" to props.appKey,
                    "appsecret" to props.appSecret,
                )
            )
            .retrieve()
            .body(KisTokenResponse::class.java)
        val token = resp?.accessToken
            ?: error("KIS 토큰 발급 실패 (응답: $resp)")
        cachedToken = token
        return token
    }

    /** 국내주식 현재가 시세 (TR: FHKST01010100). 응답 JSON 문자열을 그대로 반환. */
    fun currentPriceRaw(stockCode: String): String {
        val token = accessToken()
        return rest.get()
            .uri {
                it.path("/uapi/domestic-stock/v1/quotations/inquire-price")
                    .queryParam("fid_cond_mrkt_div_code", "J") // J: 주식
                    .queryParam("fid_input_iscd", stockCode)
                    .build()
            }
            .header("authorization", "Bearer $token")
            .header("appkey", props.appKey)
            .header("appsecret", props.appSecret)
            .header("tr_id", "FHKST01010100")
            .retrieve()
            .body(String::class.java) ?: "(빈 응답)"
    }
}

@JsonIgnoreProperties(ignoreUnknown = true)
data class KisTokenResponse(
    @JsonProperty("access_token") val accessToken: String?,
    @JsonProperty("token_type") val tokenType: String?,
    @JsonProperty("expires_in") val expiresIn: Long?,
)
