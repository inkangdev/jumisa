package com.jumisa.config

import com.jumisa.repository.MemberRepository
import com.jumisa.service.MemberUserDetailsService
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.security.web.context.HttpSessionSecurityContextRepository
import org.springframework.stereotype.Component

@Component
class KakaoOAuth2SuccessHandler(
    private val memberRepo: MemberRepository,
    private val userDetailsService: MemberUserDetailsService,
) : AuthenticationSuccessHandler {

    private val securityContextRepository = HttpSessionSecurityContextRepository()

    override fun onAuthenticationSuccess(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authentication: Authentication,
    ) {
        val oAuth2User = authentication.principal as OAuth2User

        val providerId = oAuth2User.name  // user-name-attribute: id → 카카오 숫자 ID

        @Suppress("UNCHECKED_CAST")
        val kakaoAccount = oAuth2User.attributes["kakao_account"] as? Map<String, Any>
        @Suppress("UNCHECKED_CAST")
        val profile = kakaoAccount?.get("profile") as? Map<String, Any>
        val nickname = (profile?.get("nickname") as? String)?.trim()?.ifBlank { null }
            ?: "카카오유저"

        val member = memberRepo.findOrCreateBySocialAccount("kakao", providerId, nickname)

        val userDetails = userDetailsService.loadUserByUsername(member.username)
        val auth = UsernamePasswordAuthenticationToken(userDetails, null, userDetails.authorities)
        val ctx = SecurityContextHolder.createEmptyContext()
        ctx.authentication = auth
        SecurityContextHolder.setContext(ctx)
        securityContextRepository.saveContext(ctx, request, response)

        val frontendUrl = System.getenv("FRONTEND_URL") ?: ""
        response.sendRedirect("$frontendUrl/")
    }
}