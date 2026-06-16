package com.jumisa.job

import com.jumisa.repository.UndervalueRepository
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
 * undervalueScoreJob: 저평가 점수 산출 + undervalue_score 적재 (1시간 주기, BatchScheduler).
 * 점수 = PER 30% + PBR 30% + EV/EBITDA 25% + 성장률 15% (기능정의서 v1.2).
 * 단일 SQL(UndervalueRepository)로 전 종목 백분위 점수·랭킹을 한 번에 산출/upsert.
 */
@Configuration
class UndervalueScoreJobConfig(
    private val jobRepository: JobRepository,
    private val txManager: PlatformTransactionManager,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Bean
    fun undervalueScoreJob(undervalueScoreStep: Step): Job =
        JobBuilder("undervalueScoreJob", jobRepository).start(undervalueScoreStep).build()

    @Bean
    fun undervalueScoreStep(undervalueRepo: UndervalueRepository): Step =
        StepBuilder("undervalueScoreStep", jobRepository).tasklet({ _, _ ->
            val n = undervalueRepo.computeAndStore()
            log.info("저평가 점수 적재: {}건", n)
            RepeatStatus.FINISHED
        }, txManager).build()
}
