package com.jumisa

import org.slf4j.LoggerFactory
import org.springframework.batch.core.Job
import org.springframework.batch.core.JobParametersBuilder
import org.springframework.batch.core.launch.JobLauncher
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.ExitCodeGenerator
import org.springframework.boot.SpringApplication
import org.springframework.context.ConfigurableApplicationContext
import org.springframework.stereotype.Component
import kotlin.system.exitProcess

/**
 * CLI 일회성 잡 실행기. 비옵션 인자(master|price|finance|undervalue)를 받아 해당 잡 실행 후 종료.
 *   docker compose run --rm -e BATCH_SCHEDULER_ENABLED=false batch master
 *   docker compose run --rm -e BATCH_SCHEDULER_ENABLED=false batch master finance undervalue
 * 인자가 없으면(상주 스케줄러 모드) 아무 것도 하지 않는다 → @Scheduled 로 상주.
 */
@Component
class JobCliRunner(
    private val jobLauncher: JobLauncher,
    private val context: ConfigurableApplicationContext,
    private val jobs: Map<String, Job>,   // 빈이름 → Job (Spring 자동 수집)
) : ApplicationRunner {
    private val log = LoggerFactory.getLogger(javaClass)

    private val alias = mapOf(
        "master" to "stockMasterJob",
        "price" to "priceSnapshotJob",
        "finance" to "financeJob",
        "undervalue" to "undervalueScoreJob",
    )

    override fun run(args: ApplicationArguments) {
        val targets = args.nonOptionArgs
        if (targets.isEmpty()) return   // 인자 없음 → 스케줄러 상주 모드

        var failed = false
        for (t in targets) {
            val beanName = alias[t] ?: t
            val job = jobs[beanName]
            if (job == null) {
                log.error("알 수 없는 잡 '{}'. 사용 가능: {}", t, alias.keys)
                failed = true
                continue
            }
            val pb = JobParametersBuilder().addLong("runAt", System.currentTimeMillis())
            if (beanName == "priceSnapshotJob") {
                val now = System.currentTimeMillis()
                pb.addLong("snapshotAt", now - (now % (5 * 60_000L)))   // 5분 격자
            }
            log.info("CLI 잡 실행 시작: {}", beanName)
            val exec = jobLauncher.run(job, pb.toJobParameters())
            log.info("CLI 잡 종료: {} → {}", beanName, exec.status)
            if (exec.status.isUnsuccessful) failed = true
        }
        val code = SpringApplication.exit(context, ExitCodeGenerator { if (failed) 1 else 0 })
        exitProcess(code)
    }
}
