package com.jumisa.job

import com.jumisa.client.KisClient
import com.jumisa.dto.toDailyRow
import com.jumisa.repository.PriceRepository
import com.jumisa.repository.StockRepository
import org.slf4j.LoggerFactory
import org.springframework.batch.core.Job
import org.springframework.batch.core.Step
import org.springframework.batch.core.job.builder.JobBuilder
import org.springframework.batch.core.repository.JobRepository
import org.springframework.batch.core.step.builder.StepBuilder
import org.springframework.batch.core.step.tasklet.Tasklet
import org.springframework.batch.repeat.RepeatStatus
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.transaction.PlatformTransactionManager
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * historyFillJob: 최초 1회 CLI 실행 전용. 전 종목 과거 365일 일봉 백필.
 * FHKST03010100(일별 차트) API는 응답 행 수 제한이 있을 수 있어 90일 단위 4구간으로 분할 호출.
 * PER/PBR/EPS/BPS는 이 API에서 제공하지 않으므로 NULL 적재.
 */
@Configuration
class HistoryFillJobConfig(
    private val jobRepository: JobRepository,
    private val txManager: PlatformTransactionManager,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Bean
    fun historyFillJob(historyFillStep: Step): Job =
        JobBuilder("historyFillJob", jobRepository).start(historyFillStep).build()

    @Bean
    fun historyFillStep(historyFillTasklet: Tasklet): Step =
        StepBuilder("historyFillStep", jobRepository)
            .tasklet(historyFillTasklet, txManager)
            .build()

    @Bean
    fun historyFillTasklet(
        stockRepo: StockRepository,
        kis: KisClient,
        priceRepo: PriceRepository,
    ): Tasklet = Tasklet { _, _ ->
        val fmt = DateTimeFormatter.ofPattern("yyyyMMdd")
        val today = LocalDate.now()

        // 90일 단위 4구간 — API 응답 행 수 제한 대비
        val ranges = listOf(
            today.minusDays(365) to today.minusDays(271),
            today.minusDays(270) to today.minusDays(181),
            today.minusDays(180) to today.minusDays(91),
            today.minusDays(90)  to today,
        ).map { (s, e) -> s.format(fmt) to e.format(fmt) }

        val codes = stockRepo.findTradableCodes()
        log.info("historyFillJob 시작: {}개 종목, 365일 백필", codes.size)

        for ((idx, code) in codes.withIndex()) {
            val rows = ranges.flatMap { (start, end) ->
                kis.dailyChart(code, start, end).mapNotNull { it.toDailyRow(code) }
            }.distinctBy { it.baseDate }

            if (rows.isNotEmpty()) priceRepo.insertDailyRows(rows)

            if ((idx + 1) % 100 == 0) {
                log.info("historyFillJob 진행: {}/{}", idx + 1, codes.size)
            }
        }

        log.info("historyFillJob 완료: {}개 종목", codes.size)
        RepeatStatus.FINISHED
    }
}