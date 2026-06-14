package com.jumisa.dto

/** 금융위 요약재무제표(getSummFinaStat_V2) — 필요한 필드만. 금액 단위: 원. */
data class SummFina(
    val crno: String,
    val bizYear: String,
    val basDt: String,          // 결산일 (예: 20231231) → base_ym 산출
    val fnclDcd: String,        // 110 연결 / 120 별도
    val saleAmt: Long?,         // enpSaleAmt   매출액
    val bzopPft: Long?,         // enpBzopPft   영업이익
    val ordPft: Long?,          // iclsPalClcAmt 경상이익
    val netPft: Long?,          // enpCrtmNpf   당기순이익
    val totalAsset: Long?,      // enpTastAmt   총자산
    val totalDebt: Long?,       // enpTdbtAmt   총부채
    val totalEquity: Long?,     // enpTcptAmt   총자본
    val debtRatio: Double?,     // fnclDebtRto  부채비율(%)
)

/** 금융위 종목기본정보(getItemBasiInfo_V3) — 종목코드↔법인등록번호 매핑용. */
data class ItemBasi(
    val shortCode: String,      // itmsShrtnCd  단축 종목코드
    val crno: String,           // 법인등록번호
    val securityKind: String,   // scrsItmsKcd  0101 보통주 / 0201 우선주
)
