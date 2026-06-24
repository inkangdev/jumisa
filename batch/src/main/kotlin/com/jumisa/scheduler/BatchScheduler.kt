package com.jumisa.scheduler

import com.jumisa.repository.PriceRepository
import org.slf4j.LoggerFactory
import org.springframework.batch.core.Job
import org.springframework.batch.core.JobParametersBuilder
import org.springframework.batch.core.launch.JobLauncher
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.LocalDate

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
    private val financeJob: Job,
    private val undervalueScoreJob: Job,
    private val closingJob: Job,
    private val priceRepository: PriceRepository,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private companion object {
        const val SNAPSHOT_BUCKET_MS = 5 * 60_000L   // 시세 스냅샷 5분 격자
    }

    /** 종목 마스터 갱신: 장 시작 전. */
    @Scheduled(cron = "0 0 8 * * MON-FRI", zone = "Asia/Seoul")
    fun runStockMaster() {
        val params = JobParametersBuilder().addLong("runAt", System.currentTimeMillis()).toJobParameters()
        jobLauncher.run(stockMasterJob, params)
    }

    /** 시세 스냅샷: 장중(09~15시) 5분 간격. */
    @Scheduled(cron = "0 */5 9-15 * * MON-FRI", zone = "Asia/Seoul")
    fun runPriceSnapshot() {
        // snapshot_at(유니크 키)을 5분 격자로 내림 → 5분마다 다른 시각으로 적재.
        val nowMs = System.currentTimeMillis()
        val snapshotAt = nowMs - (nowMs % SNAPSHOT_BUCKET_MS)
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

    /** 재무지표 갱신: 주 1회(일요일 06:00). 매핑→재무 한 번에. (분기 변동이라 주 1회로 충분) */
    @Scheduled(cron = "0 0 6 * * SUN", zone = "Asia/Seoul")
    fun runFinance() {
        val params = JobParametersBuilder().addLong("runAt", System.currentTimeMillis()).toJobParameters()
        jobLauncher.run(financeJob, params)
    }

    /** 종가 일봉 적재: 장 마감 후 15:30. */
    @Scheduled(cron = "0 30 15 * * MON-FRI", zone = "Asia/Seoul")
    fun runClosing() {
        val params = JobParametersBuilder()
            .addString("baseDate", LocalDate.now().toString())
            .addLong("runAt", System.currentTimeMillis())
            .toJobParameters()
        jobLauncher.run(closingJob, params)
    }

    /** 저평가 점수 산출/적재: 1시간마다(매시 정각). PER30% + PBR30% + EV/EBITDA25% + 성장률15%. */
    @Scheduled(cron = "0 0 * * * *", zone = "Asia/Seoul")
    fun runUndervalueScore() {
        val params = JobParametersBuilder().addLong("runAt", System.currentTimeMillis()).toJobParameters()
        jobLauncher.run(undervalueScoreJob, params)
    }
}
