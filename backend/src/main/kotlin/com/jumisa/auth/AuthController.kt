package com.jumisa.auth

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.AuthenticationException
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.context.SecurityContextRepository
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val repo: MemberRepository,
    private val passwordEncoder: PasswordEncoder,
    private val authenticationManager: AuthenticationManager,
    private val securityContextRepository: SecurityContextRepository,
) {
    data class SignupRequest(val username: String, val password: String, val avatar: String?)
    data class LoginRequest(val username: String, val password: String)
    data class UserResponse(val username: String, val avatar: String?)

    @PostMapping("/signup")
    fun signup(@RequestBody req: SignupRequest): ResponseEntity<Any> {
        val username = req.username.trim()
        if (username.isBlank() || req.password.isBlank())
            return ResponseEntity.badRequest().body(mapOf("error" to "닉네임과 비밀번호를 입력하세요"))
        if (username.length > 30)
            return ResponseEntity.badRequest().body(mapOf("error" to "닉네임은 30자 이하여야 합니다"))
        if (repo.existsByUsername(username))
            return ResponseEntity.status(HttpStatus.CONFLICT).body(mapOf("error" to "이미 사용 중인 닉네임입니다"))

        repo.insert(username, passwordEncoder.encode(req.password), req.avatar)
        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse(username, req.avatar))
    }

    @PostMapping("/login")
    fun login(
        @RequestBody req: LoginRequest,
        request: HttpServletRequest,
        response: HttpServletResponse,
    ): ResponseEntity<Any> {
        val auth: Authentication = try {
            authenticationManager.authenticate(UsernamePasswordAuthenticationToken(req.username, req.password))
        } catch (e: AuthenticationException) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(mapOf("error" to "닉네임 또는 비밀번호가 올바르지 않습니다"))
        }

        // 세션에 SecurityContext 저장
        val context = SecurityContextHolder.createEmptyContext()
        context.authentication = auth
        SecurityContextHolder.setContext(context)
        securityContextRepository.saveContext(context, request, response)

        val member = repo.findByUsername(auth.name)
        return ResponseEntity.ok(UserResponse(auth.name, member?.avatar))
    }

    @GetMapping("/me")
    fun me(authentication: Authentication?): ResponseEntity<Any> {
        if (authentication == null || !authentication.isAuthenticated)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val member = repo.findByUsername(authentication.name)
        return ResponseEntity.ok(UserResponse(authentication.name, member?.avatar))
    }

    @PostMapping("/logout")
    fun logout(request: HttpServletRequest): ResponseEntity<Any> {
        request.getSession(false)?.invalidate()
        SecurityContextHolder.clearContext()
        return ResponseEntity.ok(mapOf("ok" to true))
    }
}
