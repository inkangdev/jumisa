package com.jumisa.config

import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.converter.FormHttpMessageConverter
import org.springframework.security.oauth2.client.endpoint.DefaultAuthorizationCodeTokenResponseClient
import org.springframework.security.oauth2.client.endpoint.OAuth2AccessTokenResponseClient
import org.springframework.security.oauth2.client.endpoint.OAuth2AuthorizationCodeGrantRequest
import org.springframework.security.oauth2.client.http.OAuth2ErrorResponseErrorHandler
import org.springframework.security.oauth2.core.http.converter.OAuth2AccessTokenResponseHttpMessageConverter
import org.springframework.web.client.RestTemplate

@Configuration
class KakaoTokenClientConfig {
    private val log = LoggerFactory.getLogger(KakaoTokenClientConfig::class.java)

    @Bean
    fun kakaoAccessTokenResponseClient(): OAuth2AccessTokenResponseClient<OAuth2AuthorizationCodeGrantRequest> {
        val restTemplate = RestTemplate(
            listOf(FormHttpMessageConverter(), OAuth2AccessTokenResponseHttpMessageConverter())
        ).apply {
            errorHandler = OAuth2ErrorResponseErrorHandler()
        }
        return DefaultAuthorizationCodeTokenResponseClient().apply {
            setRestOperations(restTemplate)
        }
    }
}