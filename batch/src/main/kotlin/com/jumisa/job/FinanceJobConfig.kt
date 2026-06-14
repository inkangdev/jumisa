package com.jumisa.job

import com.jumisa.client.FscClient
import com.jumisa.repository.FinancialsRepository
import com.jumisa.repository.StockRepository
import org.slf4j.LoggerFactory
import org.springframework.batch.core.Job
import org.springframework.batch.core.Step
import org.springframework.batch.core.job.builder.JobBuilder
import org.springframework.batch.core.repository.JobRepository
import org.springframework.batch.core.step.builder.StepBuilder
import org.springframework.batch.repeat.RepeatStatus
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.transaction.PlatformTransactionManager
import java.time.LocalDate

/**
 * financeJob: ① 종목↔법인번호 매핑(corpMappingStep) → ② 요약재무제표 적재(financeStep) 한 번에.
 * 재무는 crno 매핑이 선행돼야 하므로 한 잡 안에서 순서대로 실행.
 * 연결(110) 우선, 없으면 별도(120). per-종목 실패는 skip + 카운트.
 */
@Configuration
class FinanceJobConfig(
    private val jobRepository: JobRepository,
    private val txManager: PlatformTransactionManager,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Bean
    fun financeJob(corpMappingStep: Step, financeStep: Step): Job =
        JobBuilder("financeJob", jobRepository).start(corpMappingStep).next(financeStep).build()

    @Bean
    fun financeStep(fsc: FscClient, stockRepo: StockRepository, finRepo: FinancialsRepository): Step =
        StepBuilder("financeStep", jobRepository).tasklet({ _, _ ->
            val targets = stockRepo.findCommonStockCrnos()
            val years = listOf(LocalDate.now().year - 1, LocalDate.now().year - 2)
            var ok = 0
            var fail = 0
            targets.forEach { (code, crno) ->
                try {
                    years.forEach { y ->
                        val list = fsc.fetchSummFina(crno, y)
                        val pick = list.firstOrNull { it.fnclDcd == "110" } ?: list.firstOrNull { it.fnclDcd == "120" }
                        if (pick != null) {
                            val baseYm = pick.basDt.take(6).ifBlank { "${y}12" }
                            finRepo.upsert(
                                code, baseYm, pick.fnclDcd,
                                eok(pick.saleAmt), eok(pick.bzopPft), eok(pick.ordPft), eok(pick.netPft),
                                eok(pick.totalAsset), eok(pick.totalDebt), eok(pick.totalEquity), pick.debtRatio,
                            )
                            ok++
                        }
                    }
                } catch (e: Exception) {
                    fail++
                    log.warn("재무 적재 실패 {} : {}", code, e.message)
                }
            }
            log.info("재무 적재 완료: 적재 {}건 / 실패 {}종목 (대상 {}종목)", ok, fail, targets.size)
            RepeatStatus.FINISHED
        }, txManager).build()

    /** 원 → 억원 반올림. */
    private fun eok(won: Long?): Long? = won?.let { Math.round(it / 100_000_000.0) }
}
