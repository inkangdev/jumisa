package com.jumisa

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

// 배치 앱 (로컬 전용, 비웹). CLI 인자로 잡 실행.
//   ./gradlew :batch:bootRun --args='master'   종목 마스터 적재
//   ./gradlew :batch:bootRun --args='price'    시세 스냅샷 적재
// 스케줄러는 기본 off(jumisa.batch.scheduler-enabled). 켜면 상주 실행.
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
class BatchApplication

fun main(args: Array<String>) {
    runApplication<BatchApplication>(*args)
}
