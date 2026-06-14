package com.jumisa.client
import com.jumisa.config.FscProperties
import com.jumisa.dto.*

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

/**
 * 금융위 공공데이터(data.go.kr) 클라이언트.
 * - getItemBasiInfo_V3: 종목코드↔법인등록번호 매핑 (basDt 페이징)
 * - getSummFinaStat_V2: 요약재무제표 (crno+bizYear)
 * 응답 JSON: response.body.items.item[] (단건이면 object). serviceKey 쿼리, RateLimiter 재사용.
 */
@Component
class FscClient(
    private val props: FscProperties,
    private val rateLimiter: RateLimiter,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val finance: RestClient = RestClient.builder().baseUrl(props.financeBaseUrl)
        .defaultStatusHandler({ it.isError }, { _, _ -> }).build()
    private val stock: RestClient = RestClient.builder().baseUrl(props.stockBaseUrl)
        .defaultStatusHandler({ it.isError }, { _, _ -> }).build()

    /** 종목기본정보 한 페이지. (보통주 필터는 호출측). 반환: (항목, 전체건수) */
    fun fetchItemBasics(basDt: String, pageNo: Int, numOfRows: Int): Pair<List<ItemBasi>, Int> {
        rateLimiter.acquire()
        val body = stock.get().uri { b ->
            b.path("/getItemBasiInfo_V3")
                .queryParam("serviceKey", props.serviceKey)
                .queryParam("resultType", "json")
                .queryParam("basDt", basDt)
                .queryParam("numOfRows", numOfRows)
                .queryParam("pageNo", pageNo)
                .build()
        }.retrieve().body(String::class.java) ?: return emptyList<ItemBasi>() to 0

        val root = objectMapper.readTree(body)
        val total = root.at("/response/body/totalCount").asInt(0)
        val items = itemArray(root).mapNotNull { n ->
            val code = n.get("itmsShrtnCd")?.asText()?.trim()?.takeIf { it.length in 1..6 } ?: return@mapNotNull null
            val crno = n.get("crno")?.asText()?.trim()?.takeIf { it.isNotBlank() } ?: return@mapNotNull null
            ItemBasi(code, crno, n.get("scrsItmsKcd")?.asText()?.trim() ?: "")
        }
        return items to total
    }

    /** 요약재무제표 (110 연결 / 120 별도 둘 다 반환될 수 있음). */
    fun fetchSummFina(crno: String, bizYear: Int): List<SummFina> {
        rateLimiter.acquire()
        val body = finance.get().uri { b ->
            b.path("/getSummFinaStat_V2")
                .queryParam("serviceKey", props.serviceKey)
                .queryParam("resultType", "json")
                .queryParam("crno", crno)
                .queryParam("bizYear", bizYear)
                .queryParam("numOfRows", 10)
                .queryParam("pageNo", 1)
                .build()
        }.retrieve().body(String::class.java) ?: return emptyList()

        val root = objectMapper.readTree(body)
        return itemArray(root).mapNotNull { n ->
            val fncl = n.get("fnclDcd")?.asText()?.trim() ?: return@mapNotNull null
            SummFina(
                crno = crno,
                bizYear = bizYear.toString(),
                basDt = n.get("basDt")?.asText()?.trim() ?: "${bizYear}1231",
                fnclDcd = fncl,
                saleAmt = longOf(n, "enpSaleAmt"),
                bzopPft = longOf(n, "enpBzopPft"),
                ordPft = longOf(n, "iclsPalClcAmt"),
                netPft = longOf(n, "enpCrtmNpf"),
                totalAsset = longOf(n, "enpTastAmt"),
                totalDebt = longOf(n, "enpTdbtAmt"),
                totalEquity = longOf(n, "enpTcptAmt"),
                debtRatio = doubleOf(n, "fnclDebtRto"),
            )
        }
    }

    private fun itemArray(root: JsonNode): List<JsonNode> {
        val item = root.at("/response/body/items/item")
        return when {
            item.isArray -> item.toList()
            item.isObject -> listOf(item)
            else -> emptyList()
        }
    }

    private fun longOf(n: JsonNode, f: String): Long? =
        n.get(f)?.asText()?.trim()?.takeIf { it.isNotEmpty() && it != "null" }?.toLongOrNull()

    private fun doubleOf(n: JsonNode, f: String): Double? =
        n.get(f)?.asText()?.trim()?.takeIf { it.isNotEmpty() && it != "null" }?.toDoubleOrNull()
}
