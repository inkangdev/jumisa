package com.jumisa.master

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.net.URI
import java.nio.charset.Charset
import java.util.zip.ZipInputStream

/**
 * KIS 공개 종목 마스터 파일(kospi/kosdaq_code.mst)을 다운로드·파싱한다.
 * - 토큰 불필요(공개 다운로드). 고정폭 cp949(MS949) 포맷.
 * - 공식 파서(open-trading-api/stocks_info)의 필드 레이아웃을 그대로 포팅.
 * - 보통주만 추림: 그룹코드 ST + SPAC 아님 + 우선주 '0'.
 */
@Component
class KisMasterClient {

    private val log = LoggerFactory.getLogger(javaClass)
    private val cp949: Charset = Charset.forName("MS949")

    fun fetchCommonStocks(): List<StockMaster> {
        val kospi = parse(KOSPI_URL, KOSPI_NAMES, KOSPI_SPECS, "KOSPI")
        val kosdaq = parse(KOSDAQ_URL, KOSDAQ_NAMES, KOSDAQ_SPECS, "KOSDAQ")
        log.info("마스터 파싱 완료: KOSPI {}, KOSDAQ {}", kospi.size, kosdaq.size)
        return kospi + kosdaq
    }

    private fun parse(url: String, names: List<String>, specs: IntArray, market: String): List<StockMaster> {
        val width2 = specs.sum()
        val text = download(url)
        val result = ArrayList<StockMaster>()
        for (raw in text.split("\n")) {
            val line = raw.trimEnd('\r')
            if (line.length <= width2) continue
            val part1 = line.substring(0, line.length - width2)
            if (part1.length < 21) continue
            val short = part1.substring(0, 9).trim()
            val std = part1.substring(9, 21).trim()
            val name = part1.substring(21).trim()
            val part2 = line.substring(line.length - width2)

            val f = HashMap<String, String>(names.size)
            var pos = 0
            for (i in names.indices) {
                val w = specs[i]
                f[names[i]] = part2.substring(pos, pos + w).trim()
                pos += w
            }

            // 보통주 필터
            if (f["그룹코드"] != "ST") continue
            if (f["SPAC"] == "Y") continue
            val pref = f["우선주"] ?: ""
            if (pref != "0" && pref != "") continue
            if (short.isEmpty() || short.length > 6 || name.isEmpty()) continue

            val halt = f["거래정지"] == "Y"
            val liq = f["정리매매"] == "Y"
            val admin = f["관리종목"] == "Y"
            val capital = intOrNull(f["자본금"])

            result.add(
                StockMaster(
                    code = short,
                    name = name,
                    stdCode = std.ifEmpty { null },
                    market = market,
                    securityType = "보통주",
                    capSizeClass = CAP_SIZE[f["시가총액규모"]],
                    listedShares = intOrNull(f["상장주수"])?.let { it.toLong() * 1000 }, // 천주 → 주
                    faceValue = intOrNull(f["액면가"])?.toInt(),
                    capitalEokwon = capital?.let { Math.round(it.toDouble() / 100_000_000.0) }, // 원 → 억원
                    settleMonth = intOrNull(f["결산월"])?.toInt()?.takeIf { it in 1..12 },
                    isTradable = !(halt || liq || admin),
                    isAdminIssue = admin,
                    isTradingHalt = halt,
                    isLiquidation = liq,
                    marketWarning = MARKET_WARNING[(f["시장경고"] ?: "").trimStart('0')],
                    isShortOverheat = f["공매도과열"] == "Y",
                )
            )
        }
        return result
    }

    private fun download(url: String): String {
        URI.create(url).toURL().openStream().use { ins ->
            ZipInputStream(ins).use { zis ->
                zis.nextEntry ?: error("빈 zip: $url")
                return String(zis.readBytes(), cp949)
            }
        }
    }

    private fun intOrNull(s: String?): Long? =
        s?.trim()?.takeIf { it.isNotEmpty() && it.all(Char::isDigit) }?.toLong()

    companion object {
        const val KOSPI_URL = "https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip"
        const val KOSDAQ_URL = "https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip"

        private val CAP_SIZE = mapOf("1" to "대형", "2" to "중형", "3" to "소형")
        private val MARKET_WARNING = mapOf("1" to "주의", "2" to "경고", "3" to "위험")

        // 공식 파서(stocks_info) part2 레이아웃
        private val KOSPI_NAMES = listOf(
            "그룹코드", "시가총액규모", "지수업종대분류", "지수업종중분류", "지수업종소분류",
            "제조업", "저유동성", "지배구조지수종목", "KOSPI200섹터업종", "KOSPI100",
            "KOSPI50", "KRX", "ETP", "ELW발행", "KRX100",
            "KRX자동차", "KRX반도체", "KRX바이오", "KRX은행", "SPAC",
            "KRX에너지화학", "KRX철강", "단기과열", "KRX미디어통신", "KRX건설",
            "Non1", "KRX증권", "KRX선박", "KRX섹터_보험", "KRX섹터_운송",
            "SRI", "기준가", "매매수량단위", "시간외수량단위", "거래정지",
            "정리매매", "관리종목", "시장경고", "경고예고", "불성실공시",
            "우회상장", "락구분", "액면변경", "증자구분", "증거금비율",
            "신용가능", "신용기간", "전일거래량", "액면가", "상장일자",
            "상장주수", "자본금", "결산월", "공모가", "우선주",
            "공매도과열", "이상급등", "KRX300", "KOSPI", "매출액",
            "영업이익", "경상이익", "당기순이익", "ROE", "기준년월",
            "시가총액", "그룹사코드", "회사신용한도초과", "담보대출가능", "대주가능",
        )
        private val KOSPI_SPECS = intArrayOf(
            2, 1, 4, 4, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 9, 5, 5, 1, 1, 1, 2, 1, 1,
            1, 2, 2, 2, 3, 1, 3, 12, 12, 8, 15, 21, 2, 7, 1, 1, 1, 1, 1, 9,
            9, 9, 5, 9, 8, 9, 3, 1, 1, 1,
        )

        private val KOSDAQ_NAMES = listOf(
            "그룹코드", "시가총액규모", "지수업종대분류", "지수업종중분류", "지수업종소분류", "벤처기업",
            "저유동성", "KRX", "ETP", "KRX100", "KRX자동차", "KRX반도체", "KRX바이오", "KRX은행", "SPAC",
            "KRX에너지화학", "KRX철강", "단기과열", "KRX미디어통신", "KRX건설", "투자주의환기", "KRX증권", "KRX선박",
            "KRX섹터_보험", "KRX섹터_운송", "KOSDAQ150", "기준가", "매매수량단위", "시간외수량단위", "거래정지",
            "정리매매", "관리종목", "시장경고", "경고예고", "불성실공시", "우회상장", "락구분", "액면변경", "증자구분",
            "증거금비율", "신용가능", "신용기간", "전일거래량", "액면가", "상장일자", "상장주수", "자본금", "결산월",
            "공모가", "우선주", "공매도과열", "이상급등", "KRX300", "매출액", "영업이익", "경상이익", "당기순이익",
            "ROE", "기준년월", "시가총액", "그룹사코드", "회사신용한도초과", "담보대출가능", "대주가능",
        )
        private val KOSDAQ_SPECS = intArrayOf(
            2, 1, 4, 4, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 9, 5, 5, 1, 1, 1, 2, 1, 1, 1, 2, 2, 2, 3,
            1, 3, 12, 12, 8, 15, 21, 2, 7, 1, 1, 1, 1, 9, 9, 9, 5, 9, 8, 9,
            3, 1, 1, 1,
        )
    }
}
