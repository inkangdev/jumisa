package com.jumisa.repository

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository

data class MemberRow(
    val id: Long,
    val username: String,
    val password: String,
    val avatar: String?,
)

@Repository
class MemberRepository(private val jdbc: JdbcTemplate) {

    fun findByUsername(username: String): MemberRow? =
        jdbc.query(
            "select id, username, password, avatar from member where username = ?",
            { rs, _ -> MemberRow(rs.getLong("id"), rs.getString("username"), rs.getString("password"), rs.getString("avatar")) },
            username,
        ).firstOrNull()

    fun existsByUsername(username: String): Boolean =
        jdbc.queryForObject("select exists(select 1 from member where username = ?)", Boolean::class.java, username) ?: false

    fun insert(username: String, encodedPassword: String, avatar: String?) {
        jdbc.update("insert into member (username, password, avatar) values (?, ?, ?)", username, encodedPassword, avatar)
    }
}
