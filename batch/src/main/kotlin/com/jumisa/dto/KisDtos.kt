package com.jumisa.dto

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty

/** OAuth 접근 토큰 발급 응답 */
@JsonIgnoreProperties(ignoreUnknown = true)
data class KisTokenResponse(
    @JsonProperty("access_token") val accessToken: String?,
    @JsonProperty("token_type") val tokenType: String?,
    @JsonProperty("expires_in") val expiresIn: Long?,
)

/** 토큰 파일 캐시 (재시작 후에도 재사용 → 1일 1회 발급 정책 준수) */
data class TokenCache(val token: String = "", val expiresAt: Long = 0)

/** 국내주식 현재가 시세(FHKST01010100) 응답 래퍼 */
@JsonIgnoreProperties(ignoreUnknown = true)
data class InquirePriceResponse(
    @JsonProperty("rt_cd") val rtCd: String?,
    @JsonProperty("msg1") val msg: String?,
    @JsonProperty("output") val output: CurrentPrice?,
)

/** 현재가 시세 output. 숫자는 문자열로 와서 매핑 단계에서 변환한다. */
@JsonIgnoreProperties(ignoreUnknown = true)
data class CurrentPrice(
    @JsonProperty("stck_prpr") val price: String?,            // 현재가
    @JsonProperty("prdy_vrss") val diff: String?,            // 전일대비
    @JsonProperty("prdy_vrss_sign") val sign: String?,       // 전일대비부호
    @JsonProperty("prdy_ctrt") val changeRate: String?,      // 등락률
    @JsonProperty("stck_oprc") val open: String?,            // 시가
    @JsonProperty("stck_hgpr") val high: String?,            // 고가
    @JsonProperty("stck_lwpr") val low: String?,             // 저가
    @JsonProperty("acml_vol") val volume: String?,           // 누적거래량
    @JsonProperty("acml_tr_pbmn") val tradeAmount: String?,  // 누적거래대금
    @JsonProperty("hts_avls") val marketCapEok: String?,     // 시가총액(억)
    @JsonProperty("per") val per: String?,
    @JsonProperty("pbr") val pbr: String?,
    @JsonProperty("eps") val eps: String?,
    @JsonProperty("bps") val bps: String?,
    @JsonProperty("w52_hgpr") val w52High: String?,
    @JsonProperty("w52_lwpr") val w52Low: String?,
)

/** 일별 차트 조회(FHKST03010100) output2 항목 */
@JsonIgnoreProperties(ignoreUnknown = true)
data class DailyChartItem(
    @JsonProperty("stck_bsop_date") val date: String?,        // "20260101"
    @JsonProperty("stck_clpr")      val close: String?,       // 종가
    @JsonProperty("stck_oprc")      val open: String?,        // 시가
    @JsonProperty("stck_hgpr")      val high: String?,        // 고가
    @JsonProperty("stck_lwpr")      val low: String?,         // 저가
    @JsonProperty("acml_vol")       val volume: String?,      // 누적거래량
    @JsonProperty("acml_tr_pbmn")   val tradeAmount: String?, // 누적거래대금
)

/** 일별 차트 조회(FHKST03010100) 응답 래퍼 */
@JsonIgnoreProperties(ignoreUnknown = true)
data class DailyChartResponse(
    @JsonProperty("rt_cd")   val rtCd: String?,
    @JsonProperty("msg1")    val msg: String?,
    @JsonProperty("output2") val output2: List<DailyChartItem>?,
)
