package com.jumisa.client
import com.jumisa.config.KisProperties

import org.springframework.stereotype.Component

/**
 * 단순 토큰버킷 레이트리미터. KIS 유량 제한(EGW00201) 회피용.
 * acquire() 호출 간격을 1/ratePerSecond 초 이상으로 강제한다 (단일 스레드 배치 기준).
 */
@Component
class RateLimiter(props: KisProperties) {

    private val intervalNanos: Long = (1_000_000_000.0 / props.ratePerSecond).toLong()

    @Volatile
    private var nextFreeNanos: Long = System.nanoTime()

    @Synchronized
    fun acquire() {
        val now = System.nanoTime()
        if (now < nextFreeNanos) {
            val waitNanos = nextFreeNanos - now
            nextFreeNanos += intervalNanos
            sleep(waitNanos)
        } else {
            nextFreeNanos = now + intervalNanos
        }
    }

    private fun sleep(nanos: Long) {
        try {
            Thread.sleep(nanos / 1_000_000, (nanos % 1_000_000).toInt())
        } catch (e: InterruptedException) {
            Thread.currentThread().interrupt()
        }
    }
}
