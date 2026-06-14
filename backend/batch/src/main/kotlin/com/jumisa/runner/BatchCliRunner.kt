package com.jumisa.runner

import org.slf4j.LoggerFactory
import org.springframework.batch.core.Job
import org.springframework.batch.core.JobParametersBuilder
import org.springframework.batch.core.launch.JobLauncher
import org.springframework.boot.CommandLineRunner
import org.springframework.stereotype.Component
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * 배치 CLI 트리거. (구 DevBatchController(HTTP) 대체)
 *   ./gradlew :batch:bootRun --args='master'   종목 마스터 적재
 *   ./gradlew :batch:bootRun --args='price'    시세 스냅샷 적재
 * 인자가 없거나 스케줄러만 켤 때는 아무 잡도 실행하지 않는다.
 */
@Component
class BatchCliRunner(
    private val jobLauncher: JobLauncher,
    private val stockMasterJob: Job,
    private val priceSnapshotJob: Job,
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
            null -> log.info("실행할 잡 없음. 사용법: --args='master' | --args='price'")
            else -> log.warn("알 수 없는 인자 '{}'. 사용법: --args='master' | --args='price'", args.first())
        }
    }
}
