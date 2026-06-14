package com.jumisa.service
import com.jumisa.repository.*

import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service

@Service
class MemberUserDetailsService(private val repo: MemberRepository) : UserDetailsService {

    override fun loadUserByUsername(username: String): UserDetails {
        val m = repo.findByUsername(username)
            ?: throw UsernameNotFoundException("회원을 찾을 수 없습니다: $username")
        return User.withUsername(m.username)
            .password(m.password)
            .authorities("ROLE_USER")
            .build()
    }
}
