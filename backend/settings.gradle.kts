plugins {
	// 시스템에 빌드 타깃 JDK(21)가 없으면 자동으로 받아오도록 함
	id("org.gradle.toolchains.foojay-resolver-convention") version "0.8.0"
}

rootProject.name = "backend"
