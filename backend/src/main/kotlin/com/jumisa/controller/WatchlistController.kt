package com.jumisa.controller

import com.jumisa.repository.MemberRepository
import com.jumisa.repository.WatchlistRepository
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/watchlist")
class WatchlistController(
    private val watchlistRepo: WatchlistRepository,
    private val memberRepo: MemberRepository,
) {

    @GetMapping
    fun list(
        @RequestParam(defaultValue = "recent") sort: String,
        @AuthenticationPrincipal user: UserDetails,
    ): ResponseEntity<Map<String, Any>> {
        val memberId = memberId(user) ?: return ResponseEntity.status(401).build()
        val items = watchlistRepo.findItemsByMember(memberId, sort)
        return ResponseEntity.ok(mapOf("items" to items))
    }

    @PostMapping("/{stockCode}")
    fun add(
        @PathVariable stockCode: String,
        @AuthenticationPrincipal user: UserDetails,
    ): ResponseEntity<Void> {
        val memberId = memberId(user) ?: return ResponseEntity.status(401).build()
        watchlistRepo.add(memberId, stockCode)
        return ResponseEntity.ok().build()
    }

    @DeleteMapping("/{stockCode}")
    fun remove(
        @PathVariable stockCode: String,
        @AuthenticationPrincipal user: UserDetails,
    ): ResponseEntity<Void> {
        val memberId = memberId(user) ?: return ResponseEntity.status(401).build()
        watchlistRepo.remove(memberId, stockCode)
        return ResponseEntity.ok().build()
    }

    private fun memberId(user: UserDetails?): Long? {
        if (user == null) return null
        return memberRepo.findByUsername(user.username)?.id
    }
}