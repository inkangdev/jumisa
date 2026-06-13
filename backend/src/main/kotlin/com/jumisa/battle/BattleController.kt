package com.jumisa.battle

import com.jumisa.auth.MemberRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/battles")
class BattleController(
    private val service: BattleService,
    private val memberRepo: MemberRepository,
) {
    private fun memberId(auth: Authentication): Long =
        memberRepo.findByUsername(auth.name)?.id ?: error("회원을 찾을 수 없습니다")

    private fun err(e: Throwable): ResponseEntity<Any> =
        ResponseEntity.badRequest().body(mapOf("error" to (e.message ?: "오류")))

    @PostMapping
    fun createRoom(@RequestBody req: CreateRoomRequest, auth: Authentication): ResponseEntity<Any> =
        try { ResponseEntity.status(HttpStatus.CREATED).body(mapOf("id" to service.createRoom(memberId(auth), req))) }
        catch (e: Exception) { err(e) }

    @GetMapping
    fun listRooms(auth: Authentication): ResponseEntity<Any> =
        ResponseEntity.ok(service.listRooms(memberId(auth)))

    @GetMapping("/stocks")
    fun listStocks(): ResponseEntity<Any> =
        ResponseEntity.ok(service.listKrStocks())

    @PostMapping("/join")
    fun joinByCode(@RequestBody req: JoinRoomRequest, auth: Authentication): ResponseEntity<Any> =
        try { ResponseEntity.ok(mapOf("id" to service.joinRoom(memberId(auth), req.inviteCode))) }
        catch (e: Exception) { err(e) }

    @PostMapping("/{id}/join")
    fun joinRoom(@PathVariable id: Long, @RequestBody req: JoinRoomRequest, auth: Authentication): ResponseEntity<Any> =
        try { ResponseEntity.ok(mapOf("id" to service.joinRoom(memberId(auth), req.inviteCode))) }
        catch (e: Exception) { err(e) }

    @GetMapping("/{id}")
    fun getRoom(@PathVariable id: Long): ResponseEntity<Any> =
        try { ResponseEntity.ok(service.getRoomDetail(id)) }
        catch (e: Exception) { ResponseEntity.status(HttpStatus.NOT_FOUND).body(mapOf("error" to (e.message ?: "오류"))) }

    @PostMapping("/{id}/start")
    fun startBattle(@PathVariable id: Long, auth: Authentication): ResponseEntity<Any> =
        try { service.startBattle(memberId(auth), id); ResponseEntity.ok(mapOf("ok" to true)) }
        catch (e: Exception) { err(e) }

    @PostMapping("/{id}/trade")
    fun trade(@PathVariable id: Long, @RequestBody req: TradeRequest, auth: Authentication): ResponseEntity<Any> {
        val result = service.trade(memberId(auth), id, req)
        return if (result.ok) ResponseEntity.ok(result) else ResponseEntity.badRequest().body(result)
    }

    @GetMapping("/{id}/ranking")
    fun getRanking(@PathVariable id: Long): ResponseEntity<Any> =
        try { ResponseEntity.ok(service.getRanking(id)) }
        catch (e: Exception) { err(e) }

    @GetMapping("/{id}/portfolio")
    fun getMyPortfolio(@PathVariable id: Long, auth: Authentication): ResponseEntity<Any> =
        try { ResponseEntity.ok(service.getMyPortfolio(memberId(auth), id)) }
        catch (e: Exception) { err(e) }
}