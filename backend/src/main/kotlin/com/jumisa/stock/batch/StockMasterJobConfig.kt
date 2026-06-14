package com.jumisa.stock.batch

import com.jumisa.stock.master.KisMasterClient
import com.jumisa.stock.StockRepository
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

/**
 * stockMasterJob: KIS 마스터 파일 다운로드·파싱 → stock upsert (1일 1회).
 */
@Configuration
class StockMasterJobConfig(
    private val jobRepository: JobRepository,
    private val txManager: PlatformTransactionManager,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Bean
    fun stockMasterJob(stockMasterStep: Step): Job =
        JobBuilder("stockMasterJob", jobRepository).start(stockMasterStep).build()

    @Bean
    fun stockMasterStep(master: KisMasterClient, repo: StockRepository): Step =
        StepBuilder("stockMasterStep", jobRepository).tasklet({ _, _ ->
            val list = master.fetchCommonStocks()
            repo.upsertMasters(list)
            log.info("종목 마스터 적재 완료: {}건", list.size)
            RepeatStatus.FINISHED
        }, txManager).build()
}
