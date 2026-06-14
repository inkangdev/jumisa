package com.jumisa.job

import com.jumisa.client.KisClient
import com.jumisa.repository.PriceRepository
import com.jumisa.dto.PriceSnapshot
import com.jumisa.repository.StockRepository
import com.jumisa.dto.toSnapshot
import org.springframework.batch.core.Job
import org.springframework.batch.core.Step
import org.springframework.batch.core.configuration.annotation.StepScope
import org.springframework.batch.core.job.builder.JobBuilder
import org.springframework.batch.core.repository.JobRepository
import org.springframework.batch.core.step.builder.StepBuilder
import org.springframework.batch.item.ItemProcessor
import org.springframework.batch.item.ItemReader
import org.springframework.batch.item.ItemWriter
import org.springframework.batch.item.support.ListItemReader
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.transaction.PlatformTransactionManager
import java.time.Instant

/**
 * priceSnapshotJob: 거래가능 종목 순회 → 현재가 조회 → stock_price_snapshot 적재 (장중 매시).
 * 종목별 실패는 processor 에서 null 반환으로 스킵(전체 job 은 진행).
 */
@Configuration
class PriceSnapshotJobConfig(
    private val jobRepository: JobRepository,
    private val txManager: PlatformTransactionManager,
) {
    @Bean
    fun priceSnapshotJob(priceSnapshotStep: Step): Job =
        JobBuilder("priceSnapshotJob", jobRepository).start(priceSnapshotStep).build()

    @Bean
    fun priceSnapshotStep(
        codeReader: ItemReader<String>,
        priceProcessor: ItemProcessor<String, PriceSnapshot>,
        priceWriter: ItemWriter<PriceSnapshot>,
    ): Step =
        StepBuilder("priceSnapshotStep", jobRepository)
            .chunk<String, PriceSnapshot>(100, txManager)
            .reader(codeReader)
            .processor(priceProcessor)
            .writer(priceWriter)
            .build()

    @Bean
    @StepScope
    fun codeReader(stockRepo: StockRepository): ItemReader<String> =
        ListItemReader(stockRepo.findTradableCodes())

    @Bean
    @StepScope
    fun priceProcessor(
        kis: KisClient,
        @Value("#{jobParameters['snapshotAt']}") snapshotAtMillis: Long,
    ): ItemProcessor<String, PriceSnapshot> {
        val at = Instant.ofEpochMilli(snapshotAtMillis)
        return ItemProcessor { code -> kis.currentPrice(code)?.toSnapshot(code, at) }
    }

    @Bean
    fun priceWriter(priceRepo: PriceRepository): ItemWriter<PriceSnapshot> =
        ItemWriter { chunk -> priceRepo.insertSnapshots(chunk.items) }
}
