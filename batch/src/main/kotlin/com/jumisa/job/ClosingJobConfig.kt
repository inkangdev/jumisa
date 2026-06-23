package com.jumisa.job

import com.jumisa.client.KisClient
import com.jumisa.dto.StockDailyRow
import com.jumisa.dto.toDailyRow
import com.jumisa.repository.PriceRepository
import com.jumisa.repository.StockRepository
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
 * closingJob: 매일 15:30 KST, 전 종목 현재가(종가) → stock_daily upsert.
 * currentPrice() 응답에 PER/PBR/EPS/BPS/52주 고저 모두 포함되므로 추가 API 불필요.
 */
@Configuration
class ClosingJobConfig(
    private val jobRepository: JobRepository,
    private val txManager: PlatformTransactionManager,
) {
    @Bean
    fun closingJob(closingStep: Step): Job =
        JobBuilder("closingJob", jobRepository).start(closingStep).build()

    @Bean
    fun closingStep(
        closingCodeReader: ItemReader<String>,
        closingProcessor: ItemProcessor<String, StockDailyRow>,
        closingWriter: ItemWriter<StockDailyRow>,
    ): Step =
        StepBuilder("closingStep", jobRepository)
            .chunk<String, StockDailyRow>(100, txManager)
            .reader(closingCodeReader)
            .processor(closingProcessor)
            .writer(closingWriter)
            .build()

    @Bean
    @StepScope
    fun closingCodeReader(stockRepo: StockRepository): ItemReader<String> =
        ListItemReader(stockRepo.findTradableCodes())

    @Bean
    @StepScope
    fun closingProcessor(
        kis: KisClient,
        @Value("#{jobParameters['baseDate']}") baseDateStr: String,
    ): ItemProcessor<String, StockDailyRow> {
        val date = LocalDate.parse(baseDateStr)
        return ItemProcessor { code -> kis.currentPrice(code)?.toDailyRow(code, date) }
    }

    @Bean
    fun closingWriter(priceRepo: PriceRepository): ItemWriter<StockDailyRow> =
        ItemWriter { chunk -> priceRepo.insertDailyRows(chunk.items) }
}