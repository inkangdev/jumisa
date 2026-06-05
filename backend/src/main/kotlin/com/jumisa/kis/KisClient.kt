package com.jumisa.kis

import com.fasterxml.jackson.databind.ObjectMapper
import com.jumisa.config.KisProperties
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import java.io.File
import java.nio.file.Paths

/**
 * KIS Open API 호출 클라이언트.
 * - accessToken(): 토큰 발급 + 파일 영속 캐시(만료 직전 갱신, 재시작 후 재사용).
 * - currentPrice(): 국내주식 현재가를 타입(CurrentPrice)으로 반환. 레이트리밋 적용.
 * - currentPriceRaw(): dev 디버깅용 raw JSON.
 */
@Component
class KisClient(
    private val props: KisProperties,
    private val rateLimiter: RateLimiter,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val rest: RestClient = RestClient.builder()
        .baseUrl(props.baseUrl())
        .defaultStatusHandler({ it.isError }, { _, _ -> })
        .build()

    @Volatile private var token: String? = null
    @Volatile private var expiresAt: Long = 0L

    private val tokenFile: File = run {
        val path = props.tokenCachePath.ifBlank {
            Paths.get(System.getProperty("java.io.tmpdir"), "jumisa-kis-token-${props.env}.json").toString()
        }
        File(path)
    }

    init {
        loadToken()
    }

    @Synchronized
    fun accessToken(): String {
        val now = System.currentTimeMillis()
        token?.let { if (now < expiresAt - 60_000) return it }

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

        val newToken = resp?.accessToken ?: error("KIS 토큰 발급 실패 (응답: $resp)")
        token = newToken
        expiresAt = now + ((resp.expiresIn ?: 86_400L) * 1000)
        saveToken()
        log.info("KIS 토큰 신규 발급 (만료 {}초 후)", resp.expiresIn)
        return newToken
    }

    /** 국내주식 현재가 시세 (TR: FHKST01010100). 실패 시 null. */
    fun currentPrice(stockCode: String): CurrentPrice? {
        rateLimiter.acquire()
        val body = rest.get()
            .uri {
                it.path("/uapi/domestic-stock/v1/quotations/inquire-price")
                    .queryParam("fid_cond_mrkt_div_code", "J")
                    .queryParam("fid_input_iscd", stockCode)
                    .build()
            }
            .header("authorization", "Bearer ${accessToken()}")
            .header("appkey", props.appKey)
            .header("appsecret", props.appSecret)
            .header("tr_id", "FHKST01010100")
            .retrieve()
            .body(String::class.java) ?: return null

        return try {
            val resp = objectMapper.readValue(body, InquirePriceResponse::class.java)
            if (resp.rtCd != "0") {
                log.warn("[{}] 시세 조회 실패 rt_cd={} {}", stockCode, resp.rtCd, resp.msg)
                null
            } else {
                resp.output
            }
        } catch (e: Exception) {
            log.warn("[{}] 시세 응답 파싱 실패: {}", stockCode, e.message)
            null
        }
    }

    /** dev 디버깅용 raw JSON. */
    fun currentPriceRaw(stockCode: String): String {
        rateLimiter.acquire()
        return rest.get()
            .uri {
                it.path("/uapi/domestic-stock/v1/quotations/inquire-price")
                    .queryParam("fid_cond_mrkt_div_code", "J")
                    .queryParam("fid_input_iscd", stockCode)
                    .build()
            }
            .header("authorization", "Bearer ${accessToken()}")
            .header("appkey", props.appKey)
            .header("appsecret", props.appSecret)
            .header("tr_id", "FHKST01010100")
            .retrieve()
            .body(String::class.java) ?: "(빈 응답)"
    }

    private fun loadToken() {
        try {
            if (tokenFile.exists()) {
                val cache = objectMapper.readValue(tokenFile, TokenCache::class.java)
                token = cache.token
                expiresAt = cache.expiresAt
            }
        } catch (e: Exception) {
            log.warn("토큰 캐시 로드 실패(무시): {}", e.message)
        }
    }

    private fun saveToken() {
        try {
            objectMapper.writeValue(tokenFile, TokenCache(token!!, expiresAt))
        } catch (e: Exception) {
            log.warn("토큰 캐시 저장 실패(무시): {}", e.message)
        }
    }
}
