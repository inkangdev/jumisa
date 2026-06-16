package com.jumisa.service

import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.User

/**
 * 인증 결과 principal. 기본 [User]에 avatar 를 실어, 로그인 응답에서
 * member 를 다시 조회하지 않도록 한다(로그인당 DB 왕복 1회 절감).
 */
class MemberPrincipal(
    username: String,
    password: String,
    val avatar: String?,
) : User(username, password, listOf(SimpleGrantedAuthority("ROLE_USER")))
