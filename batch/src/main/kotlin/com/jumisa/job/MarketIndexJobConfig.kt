package com.jumisa.job

import com.jumisa.client.KisClient
import com.jumisa.dto.MarketIndexRow
import com.jumisa.dto.toIndexRow
import com.jumisa.repository.IndexRepository
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
import java.time.LocalDate

/**
 * marketIndexJob: 매일 마감 후, 코스피/코스닥/코스피200 지수 → market_index_daily upsert.
 * 대시보드 '주요 지수' 근거. 종목 수가 3개뿐이라 단일 청크로 처리.
 */
@Configuration
class MarketIndexJobConfig(
    private val jobRepository: JobRepository,
    private val txManager: PlatformTransactionManager,
) {
    /** 적재 대상 지수 (코드 → 표시명). */
    private val indices = listOf(
        "0001" to "코스피",
        "1001" to "코스닥",
        "2001" to "코스피200",
    )

    @Bean
    fun marketIndexJob(marketIndexStep: Step): Job =
        JobBuilder("marketIndexJob", jobRepository).start(marketIndexStep).build()

    @Bean
    fun marketIndexStep(
        marketIndexReader: ItemReader<Pair<String, String>>,
        marketIndexProcessor: ItemProcessor<Pair<String, String>, MarketIndexRow>,
        marketIndexWriter: ItemWriter<MarketIndexRow>,
    ): Step =
        StepBuilder("marketIndexStep", jobRepository)
            .chunk<Pair<String, String>, MarketIndexRow>(10, txManager)
            .reader(marketIndexReader)
            .processor(marketIndexProcessor)
            .writer(marketIndexWriter)
            .build()

    @Bean
    @StepScope
    fun marketIndexReader(): ItemReader<Pair<String, String>> =
        ListItemReader(indices)

    @Bean
    @StepScope
    fun marketIndexProcessor(
        kis: KisClient,
        @Value("#{jobParameters['baseDate']}") baseDateStr: String,
    ): ItemProcessor<Pair<String, String>, MarketIndexRow> {
        val date = LocalDate.parse(baseDateStr)
        return ItemProcessor { (code, name) -> kis.indexPrice(code)?.toIndexRow(code, name, date) }
    }

    @Bean
    fun marketIndexWriter(indexRepo: IndexRepository): ItemWriter<MarketIndexRow> =
        ItemWriter { chunk -> indexRepo.insertIndexRows(chunk.items) }
}
