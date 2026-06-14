package com.jumisa

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

// 웹 앱 (Render 배포본). 배치/KIS 없음.
@SpringBootApplication
class AppApplication

fun main(args: Array<String>) {
    runApplication<AppApplication>(*args)
}
