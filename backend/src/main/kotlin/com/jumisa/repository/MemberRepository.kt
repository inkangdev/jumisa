package com.jumisa.repository

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.support.GeneratedKeyHolder
import org.springframework.stereotype.Repository
import java.util.UUID

data class MemberRow(
    val id: Long,
    val username: String,
    val password: String?,   // 소셜 전용 계정은 null
    val avatar: String?,
)

@Repository
class MemberRepository(private val jdbc: JdbcTemplate) {

    private val rowMapper = { rs: java.sql.ResultSet, _: Int ->
        MemberRow(rs.getLong("id"), rs.getString("username"), rs.getString("password"), rs.getString("avatar"))
    }

    fun findByUsername(username: String): MemberRow? =
        jdbc.query("select id, username, password, avatar from member where username = ?", rowMapper, username)
            .firstOrNull()

    fun existsByUsername(username: String): Boolean =
        jdbc.queryForObject("select exists(select 1 from member where username = ?)", Boolean::class.java, username) ?: false

    fun insert(username: String, encodedPassword: String, avatar: String?) {
        jdbc.update("insert into member (username, password, avatar) values (?, ?, ?)", username, encodedPassword, avatar)
    }

    /** 봇 회원 생성. 로그인 불가(noop 비번), is_bot=true. 생성된 member.id 반환. */
    fun insertBot(username: String, avatar: String): Long {
        val kh = GeneratedKeyHolder()
        jdbc.update({ con ->
            val ps = con.prepareStatement(
                "insert into member (username, password, avatar, is_bot) values (?,?,?,true)",
                arrayOf("id"),
            )
            ps.setString(1, username)
            ps.setString(2, "{noop}BOT_${UUID.randomUUID()}")
            ps.setString(3, avatar)
            ps
        }, kh)
        return kh.key!!.toLong()
    }

    fun updateAvatar(username: String, avatar: String) {
        jdbc.update("update member set avatar = ? where username = ?", avatar, username)
    }

    fun updateUsername(currentUsername: String, newUsername: String) {
        jdbc.update("update member set username = ? where username = ?", newUsername, currentUsername)
    }

    // ── 소셜 로그인 ──────────────────────────────────────────────────────────────

    fun findBySocialAccount(provider: String, providerId: String): MemberRow? =
        jdbc.query(
            """select m.id, m.username, m.password, m.avatar
               from member m
               join social_account sa on sa.member_id = m.id
               where sa.provider = ? and sa.provider_id = ?""",
            rowMapper, provider, providerId,
        ).firstOrNull()

    fun findOrCreateBySocialAccount(provider: String, providerId: String, nickname: String): MemberRow {
        findBySocialAccount(provider, providerId)?.let { return it }

        // 닉네임 중복 시 숫자 suffix
        var username = nickname.take(28)
        var suffix = 1
        while (existsByUsername(username)) {
            username = "${nickname.take(26)}$suffix"
            suffix++
        }

        jdbc.update(
            "insert into member (username, password, avatar) values (?, ?, null)",
            username, "{noop}SOCIAL_${java.util.UUID.randomUUID()}",
        )
        val member = findByUsername(username)!!
        jdbc.update(
            "insert into social_account (member_id, provider, provider_id) values (?, ?, ?)",
            member.id, provider, providerId,
        )
        return member
    }
}