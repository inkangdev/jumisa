package com.jumisa.job

import com.jumisa.client.FscClient
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
import java.time.format.DateTimeFormatter

/**
 * corpMappingStep: 금융위 종목기본정보 → stock.crno (종목코드↔법인등록번호) 매핑. 보통주만.
 * 독립 잡이 아니라 financeJob 의 선행 step 으로 쓰인다(재무가 매핑에 의존).
 */
@Configuration
class CorpMappingJobConfig(
    private val jobRepository: JobRepository,
    private val txManager: PlatformTransactionManager,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Bean
    fun corpMappingStep(fsc: FscClient, repo: StockRepository): Step =
        StepBuilder("corpMappingStep", jobRepository).tasklet({ _, _ ->
            val basDt = findRecentBasDt(fsc)
            if (basDt == null) {
                log.warn("종목기본정보 데이터가 있는 기준일자를 찾지 못함 (인증키/활성화 확인)")
                return@tasklet RepeatStatus.FINISHED
            }
            val rows = 1000
            val mapping = ArrayList<Pair<String, String>>()
            var page = 1
            while (true) {
                val (items, total) = fsc.fetchItemBasics(basDt, page, rows)
                items.filter { it.securityKind == "0101" }.forEach { mapping.add(it.shortCode to it.crno) }
                if (items.isEmpty() || page * rows >= total) break
                page++
            }
            repo.upsertCrno(mapping)
            log.info("법인번호 매핑 적재 완료: basDt={} 보통주 {}건", basDt, mapping.size)
            RepeatStatus.FINISHED
        }, txManager).build()

    /** 데이터가 있는 최근 기준일자 탐색(오늘부터 14일 전까지). */
    private fun findRecentBasDt(fsc: FscClient): String? {
        var d = LocalDate.now()
        repeat(14) {
            val basDt = d.format(DateTimeFormatter.BASIC_ISO_DATE)
            val (_, total) = fsc.fetchItemBasics(basDt, 1, 1)
            if (total > 0) return basDt
            d = d.minusDays(1)
        }
        return null
    }
}
