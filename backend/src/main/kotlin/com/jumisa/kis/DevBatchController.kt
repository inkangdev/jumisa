package com.jumisa.kis

import org.springframework.batch.core.Job
import org.springframework.batch.core.JobParametersBuilder
import org.springframework.batch.core.launch.JobLauncher
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * 배치 수동 트리거(dev). 스케줄러 비활성 상태에서 검증용.
 *   POST /dev/batch/master  → 종목 마스터 적재
 *   POST /dev/batch/price   → 시세 스냅샷 적재
 */
@RestController
@RequestMapping("/dev/batch")
class DevBatchController(
    private val jobLauncher: JobLauncher,
    private val stockMasterJob: Job,
    private val priceSnapshotJob: Job,
) {
    @PostMapping("/master")
    fun master(): Map<String, Any?> {
        val params = JobParametersBuilder().addLong("runAt", System.currentTimeMillis()).toJobParameters()
        val exec = jobLauncher.run(stockMasterJob, params)
        return mapOf("job" to "stockMasterJob", "status" to exec.status.toString())
    }

    @PostMapping("/price")
    fun price(): Map<String, Any?> {
        val snapshotAt = Instant.now().truncatedTo(ChronoUnit.HOURS).toEpochMilli()
        val params = JobParametersBuilder()
            .addLong("snapshotAt", snapshotAt)
            .addLong("runAt", System.currentTimeMillis())
            .toJobParameters()
        val exec = jobLauncher.run(priceSnapshotJob, params)
        return mapOf(
            "job" to "priceSnapshotJob",
            "status" to exec.status.toString(),
            "read" to exec.stepExecutions.sumOf { it.readCount },
            "write" to exec.stepExecutions.sumOf { it.writeCount },
            "filtered" to exec.stepExecutions.sumOf { it.filterCount },
        )
    }
}
