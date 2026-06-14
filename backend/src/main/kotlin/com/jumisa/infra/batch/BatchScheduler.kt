package com.jumisa.infra.batch

import com.jumisa.stock.PriceRepository
import org.slf4j.LoggerFactory
import org.springframework.batch.core.Job
import org.springframework.batch.core.JobParametersBuilder
import org.springframework.batch.core.launch.JobLauncher
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * 배치 스케줄러 (Asia/Seoul, 주말 제외). 기본 비활성:
 * jumisa.batch.scheduler-enabled=true 일 때만 동작.
 * (휴장일 정밀 처리는 chk-holiday 연동으로 추후 보강)
 */
@Component
@ConditionalOnProperty(prefix = "jumisa.batch", name = ["scheduler-enabled"], havingValue = "true")
class BatchScheduler(
    private val jobLauncher: JobLauncher,
    private val stockMasterJob: Job,
    private val priceSnapshotJob: Job,
    private val priceRepository: PriceRepository,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /** 종목 마스터 갱신: 장 시작 전. */
    @Scheduled(cron = "0 0 8 * * MON-FRI", zone = "Asia/Seoul")
    fun runStockMaster() {
        val params = JobParametersBuilder().addLong("runAt", System.currentTimeMillis()).toJobParameters()
        jobLauncher.run(stockMasterJob, params)
    }

    /** 시세 스냅샷: 장중 매시 정각 (09~15시). */
    @Scheduled(cron = "0 0 9-15 * * MON-FRI", zone = "Asia/Seoul")
    fun runPriceSnapshot() {
        val snapshotAt = Instant.now().truncatedTo(ChronoUnit.HOURS).toEpochMilli()
        val params = JobParametersBuilder()
            .addLong("snapshotAt", snapshotAt)
            .addLong("runAt", System.currentTimeMillis())
            .toJobParameters()
        jobLauncher.run(priceSnapshotJob, params)
    }

    /** 인트라데이 시세 정리: 7일 경과분 삭제. */
    @Scheduled(cron = "0 30 4 * * *", zone = "Asia/Seoul")
    fun cleanupSnapshots() {
        val deleted = priceRepository.deleteOlderThan(7)
        log.info("인트라데이 시세 정리: {}행 삭제", deleted)
    }
}
