// 루트 (멀티모듈). 실제 산출물은 :app(배포), :batch(로컬)에서.
plugins {
	kotlin("jvm") version "1.9.25" apply false
	kotlin("plugin.spring") version "1.9.25" apply false
	id("org.springframework.boot") version "3.5.0" apply false
	id("io.spring.dependency-management") version "1.1.7" apply false
}

allprojects {
	group = "com.jumisa"
	version = "0.0.1-SNAPSHOT"

	repositories {
		mavenCentral()
	}
}
