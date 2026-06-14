package com.jumisa.runner

import org.slf4j.LoggerFactory
import org.springframework.batch.core.Job
import org.springframework.batch.core.JobParametersBuilder
import org.springframework.batch.core.launch.JobLauncher
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.CommandLineRunner
import org.springframework.stereotype.Component
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * 배치 CLI 트리거. (구 DevBatchController(HTTP) 대체)
 *   ./gradlew :batch:bootRun                    스케줄러 상주(기본) — 종료 안 함
 *   ./gradlew :batch:bootRun --args='master'    종목 마스터 즉시 적재
 *   ./gradlew :batch:bootRun --args='price'     시세 스냅샷 즉시 적재
 */
@Component
class BatchCliRunner(
    private val jobLauncher: JobLauncher,
    private val stockMasterJob: Job,
    private val priceSnapshotJob: Job,
    private val corpMappingJob: Job,
    private val financeJob: Job,
    @Value("\${jumisa.batch.scheduler-enabled:false}") private val schedulerEnabled: Boolean,
) : CommandLineRunner {

    private val log = LoggerFactory.getLogger(javaClass)

    override fun run(vararg args: String) {
        when (args.firstOrNull()) {
            "master" -> {
                val params = JobParametersBuilder()
                    .addLong("runAt", System.currentTimeMillis())
                    .toJobParameters()
                val exec = jobLauncher.run(stockMasterJob, params)
                log.info("stockMasterJob 완료: {}", exec.status)
            }
            "price" -> {
                val snapshotAt = Instant.now().truncatedTo(ChronoUnit.HOURS).toEpochMilli()
                val params = JobParametersBuilder()
                    .addLong("snapshotAt", snapshotAt)
                    .addLong("runAt", System.currentTimeMillis())
                    .toJobParameters()
                val exec = jobLauncher.run(priceSnapshotJob, params)
                log.info("priceSnapshotJob 완료: {}", exec.status)
            }
            "corpmap" -> {
                val params = JobParametersBuilder().addLong("runAt", System.currentTimeMillis()).toJobParameters()
                val exec = jobLauncher.run(corpMappingJob, params)
                log.info("corpMappingJob 완료: {}", exec.status)
            }
            "finance" -> {
                val params = JobParametersBuilder().addLong("runAt", System.currentTimeMillis()).toJobParameters()
                val exec = jobLauncher.run(financeJob, params)
                log.info("financeJob 완료: {}", exec.status)
            }
            null ->
                if (schedulerEnabled) {
                    log.info("✅ 스케줄러 상주 모드 — 종료하지 않고 대기합니다. 자동 실행: 평일 마스터 08:00 / 시세 09~15시 매시 / 정리 04:30. (즉시 1회는 --args='master'|'price')")
                } else {
                    log.info("실행할 잡 없음 — 앱을 종료합니다. (즉시 1회: --args='master'|'price'|'corpmap'|'finance', 상주: BATCH_SCHEDULER_ENABLED=true)")
                }
            else -> log.warn("알 수 없는 인자 '{}'. 사용법: --args='master'|'price'|'corpmap'|'finance'", args.first())
        }
    }
}
