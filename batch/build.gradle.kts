// 배치 앱 (로컬 전용, 비웹). 독립 Gradle 프로젝트. KIS 시세/마스터 적재. CLI 인자로 실행.
//   cd batch && ./gradlew bootRun --args='master'   종목 마스터 적재
//   cd batch && ./gradlew bootRun --args='price'    시세 스냅샷 적재
plugins {
	kotlin("jvm") version "1.9.25"
	kotlin("plugin.spring") version "1.9.25"
	id("org.springframework.boot") version "3.5.0"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "com.jumisa"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-batch")
	implementation("org.springframework.boot:spring-boot-starter-jdbc")
	// KIS HTTP 호출(RestClient)용. 서버는 띄우지 않음(web starter 아님).
	implementation("org.springframework:spring-web")
	implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
	implementation("org.jetbrains.kotlin:kotlin-reflect")
	implementation("me.paulschwarz:spring-dotenv:4.0.0")
	runtimeOnly("org.postgresql:postgresql")
	testImplementation("org.springframework.boot:spring-boot-starter-test")
	testImplementation("org.springframework.batch:spring-batch-test")
	testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

kotlin {
	compilerOptions {
		freeCompilerArgs.addAll("-Xjsr305=strict")
	}
}

tasks.withType<Test> {
	useJUnitPlatform()
}

// 로컬 실행 시 리포지토리 루트(jumisa/)의 .env 를 읽도록.
tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
	workingDir = rootProject.projectDir.parentFile
}
