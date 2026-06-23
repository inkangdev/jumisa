package com.jumisa.repository
import com.jumisa.dto.*

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.support.GeneratedKeyHolder
import org.springframework.stereotype.Repository
import java.sql.Timestamp
import java.time.Instant

data class BattleRoomRow(
    val id: Long,
    val name: String,
    val hostMemberId: Long,
    val inviteCode: String,
    val periodDays: Int,
    val startPoints: Long,
    val maxPlayers: Int,
    val market: String,
    val status: String,
    val startsAt: Instant?,
    val endsAt: Instant?,
    val createdAt: Instant,
)

data class BattleParticipantRow(
    val id: Long,
    val roomId: Long,
    val memberId: Long,
    val points: Long,
    val joinedAt: Instant,
)

data class BattleHoldingRow(
    val id: Long,
    val participantId: Long,
    val stockCode: String,
    val qty: Int,
    val avgPrice: Int,
)

data class BotParticipantRow(
    val id: Long,
    val memberId: Long,
    val points: Long,
    val botStrategy: String,
    val botSeed: Long,
)

@Repository
class BattleRepository(private val jdbc: JdbcTemplate) {

    fun insertRoom(
        name: String, hostMemberId: Long, inviteCode: String,
        periodDays: Int, startPoints: Long, maxPlayers: Int, market: String,
    ): Long {
        val kh = GeneratedKeyHolder()
        jdbc.update({ con ->
            val ps = con.prepareStatement(
                "insert into battle_room (name, host_member_id, invite_code, period_days, start_points, max_players, market) values (?,?,?,?,?,?,?)",
                arrayOf("id"),
            )
            ps.setString(1, name)
            ps.setLong(2, hostMemberId)
            ps.setString(3, inviteCode)
            ps.setInt(4, periodDays)
            ps.setLong(5, startPoints)
            ps.setInt(6, maxPlayers)
            ps.setString(7, market)
            ps
        }, kh)
        return kh.key!!.toLong()
    }

    private fun roomMapper(rs: java.sql.ResultSet) = BattleRoomRow(
        id = rs.getLong("id"),
        name = rs.getString("name"),
        hostMemberId = rs.getLong("host_member_id"),
        inviteCode = rs.getString("invite_code"),
        periodDays = rs.getInt("period_days"),
        startPoints = rs.getLong("start_points"),
        maxPlayers = rs.getInt("max_players"),
        market = rs.getString("market"),
        status = rs.getString("status"),
        startsAt = rs.getTimestamp("starts_at")?.toInstant(),
        endsAt = rs.getTimestamp("ends_at")?.toInstant(),
        createdAt = rs.getTimestamp("created_at").toInstant(),
    )

    fun findRoomById(id: Long): BattleRoomRow? =
        jdbc.query("select * from battle_room where id = ?", { rs, _ -> roomMapper(rs) }, id).firstOrNull()

    fun findRoomByInviteCode(code: String): BattleRoomRow? =
        jdbc.query("select * from battle_room where invite_code = ?", { rs, _ -> roomMapper(rs) }, code).firstOrNull()

    fun findWaitingRoomsNotJoined(memberId: Long): List<BattleRoomRow> =
        jdbc.query(
            """
            select r.* from battle_room r
            where r.status = 'waiting'
              and not exists (
                select 1 from battle_participant p where p.room_id = r.id and p.member_id = ?
              )
            order by r.created_at desc
            """,
            { rs, _ -> roomMapper(rs) },
            memberId,
        )

    fun findRoomsByMemberAndStatus(memberId: Long, status: String): List<BattleRoomRow> =
        jdbc.query(
            """
            select r.* from battle_room r
            join battle_participant p on p.room_id = r.id
            where p.member_id = ? and r.status = ?
            order by r.created_at desc
            """,
            { rs, _ -> roomMapper(rs) },
            memberId, status,
        )

    fun updateRoomStatus(id: Long, status: String, startsAt: Instant?, endsAt: Instant?) {
        jdbc.update(
            "update battle_room set status = ?, starts_at = ?, ends_at = ? where id = ?",
            status,
            startsAt?.let { Timestamp.from(it) },
            endsAt?.let { Timestamp.from(it) },
            id,
        )
    }

    fun insertParticipant(roomId: Long, memberId: Long, points: Long): Long {
        val kh = GeneratedKeyHolder()
        jdbc.update({ con ->
            val ps = con.prepareStatement(
                "insert into battle_participant (room_id, member_id, points) values (?,?,?)",
                arrayOf("id"),
            )
            ps.setLong(1, roomId)
            ps.setLong(2, memberId)
            ps.setLong(3, points)
            ps
        }, kh)
        return kh.key!!.toLong()
    }

    fun insertBotParticipant(roomId: Long, memberId: Long, strategy: String, seed: Long): Long {
        val kh = GeneratedKeyHolder()
        jdbc.update({ con ->
            val ps = con.prepareStatement(
                "insert into battle_participant (room_id, member_id, points, bot_strategy, bot_seed) values (?,?,0,?,?)",
                arrayOf("id"),
            )
            ps.setLong(1, roomId)
            ps.setLong(2, memberId)
            ps.setString(3, strategy)
            ps.setLong(4, seed)
            ps
        }, kh)
        return kh.key!!.toLong()
    }

    fun findRoomsByStatus(status: String): List<BattleRoomRow> =
        jdbc.query("select * from battle_room where status = ?", { rs, _ -> roomMapper(rs) }, status)

    fun findBotParticipants(roomId: Long): List<BotParticipantRow> =
        jdbc.query(
            "select id, member_id, points, bot_strategy, bot_seed from battle_participant where room_id = ? and bot_strategy is not null",
            { rs, _ ->
                BotParticipantRow(
                    id = rs.getLong("id"),
                    memberId = rs.getLong("member_id"),
                    points = rs.getLong("points"),
                    botStrategy = rs.getString("bot_strategy"),
                    botSeed = rs.getLong("bot_seed"),
                )
            },
            roomId,
        )

    /** 최신 시세 스냅샷 시각. 시세가 하나도 없으면 null. */
    fun latestSnapshotAt(): Instant? =
        jdbc.query(
            "select max(snapshot_at) as ts from stock_price_snapshot",
            { rs, _ -> rs.getTimestamp("ts")?.toInstant() },
        ).firstOrNull()

    /** 이 방·스냅샷 조합을 최초로 잡으면 true(매매 진행), 이미 처리됐으면 false. */
    fun tryMarkBotRun(roomId: Long, snapshotAt: Instant): Boolean =
        jdbc.update(
            "insert into bot_run_log (room_id, snapshot_at) values (?, ?) on conflict do nothing",
            roomId, Timestamp.from(snapshotAt),
        ) > 0

    fun findParticipantsByRoom(roomId: Long): List<BattleParticipantRow> =
        jdbc.query(
            "select * from battle_participant where room_id = ? order by joined_at",
            { rs, _ ->
                BattleParticipantRow(
                    id = rs.getLong("id"),
                    roomId = rs.getLong("room_id"),
                    memberId = rs.getLong("member_id"),
                    points = rs.getLong("points"),
                    joinedAt = rs.getTimestamp("joined_at").toInstant(),
                )
            },
            roomId,
        )

    fun findParticipant(roomId: Long, memberId: Long): BattleParticipantRow? =
        jdbc.query(
            "select * from battle_participant where room_id = ? and member_id = ?",
            { rs, _ ->
                BattleParticipantRow(
                    id = rs.getLong("id"),
                    roomId = rs.getLong("room_id"),
                    memberId = rs.getLong("member_id"),
                    points = rs.getLong("points"),
                    joinedAt = rs.getTimestamp("joined_at").toInstant(),
                )
            },
            roomId, memberId,
        ).firstOrNull()

    fun participantCount(roomId: Long): Int =
        jdbc.queryForObject("select count(*) from battle_participant where room_id = ?", Int::class.java, roomId) ?: 0

    fun updateParticipantPoints(participantId: Long, points: Long) {
        jdbc.update("update battle_participant set points = ? where id = ?", points, participantId)
    }

    fun findHoldingsByParticipant(participantId: Long): List<BattleHoldingRow> =
        jdbc.query(
            "select * from battle_holding where participant_id = ?",
            { rs, _ ->
                BattleHoldingRow(
                    id = rs.getLong("id"),
                    participantId = rs.getLong("participant_id"),
                    stockCode = rs.getString("stock_code"),
                    qty = rs.getInt("qty"),
                    avgPrice = rs.getInt("avg_price"),
                )
            },
            participantId,
        )

    fun findHolding(participantId: Long, stockCode: String): BattleHoldingRow? =
        jdbc.query(
            "select * from battle_holding where participant_id = ? and stock_code = ?",
            { rs, _ ->
                BattleHoldingRow(
                    id = rs.getLong("id"),
                    participantId = rs.getLong("participant_id"),
                    stockCode = rs.getString("stock_code"),
                    qty = rs.getInt("qty"),
                    avgPrice = rs.getInt("avg_price"),
                )
            },
            participantId, stockCode,
        ).firstOrNull()

    fun upsertHolding(participantId: Long, stockCode: String, qty: Int, avgPrice: Int) {
        val existing = findHolding(participantId, stockCode)
        when {
            existing == null ->
                jdbc.update(
                    "insert into battle_holding (participant_id, stock_code, qty, avg_price) values (?,?,?,?)",
                    participantId, stockCode, qty, avgPrice,
                )
            qty <= 0 ->
                jdbc.update("delete from battle_holding where id = ?", existing.id)
            else ->
                jdbc.update(
                    "update battle_holding set qty = ?, avg_price = ? where id = ?",
                    qty, avgPrice, existing.id,
                )
        }
    }

    fun insertTrade(participantId: Long, stockCode: String, type: String, qty: Int, price: Int) {
        jdbc.update(
            "insert into battle_trade (participant_id, stock_code, type, qty, price) values (?,?,?,?,?)",
            participantId, stockCode, type, qty, price,
        )
    }

    fun findLatestPrice(stockCode: String): Int? =
        jdbc.query(
            "select current_price from stock_price_snapshot where stock_code = ? order by snapshot_at desc limit 1",
            { rs, _ -> rs.getInt("current_price") },
            stockCode,
        ).firstOrNull()

    fun findStockName(stockCode: String): String? =
        jdbc.query(
            "select name from stock where stock_code = ?",
            { rs, _ -> rs.getString("name") },
            stockCode,
        ).firstOrNull()

    fun findMemberById(memberId: Long): Pair<String, String?>? =
        jdbc.query(
            "select username, avatar from member where id = ?",
            { rs, _ -> rs.getString("username") to rs.getString("avatar") },
            memberId,
        ).firstOrNull()

    /**
     * 대결 거래 가능 종목 = 거래가능 + 시세(최신 스냅샷) 있는 종목 전체.
     * 스크리너(undervalue_score)와 커버리지를 맞추기 위해 limit·시세창 제거 —
     * 시세는 종목별 최신 1건(체결가 findLatestPrice 와 동일 기준), 인트라데이 7일 보관이라 자연 상한.
     */
    fun findKrStocksWithLatestPrice(): List<StockWithPriceDto> =
        jdbc.query(
            """
            select s.stock_code, s.name, sp.current_price, sp.change_rate
            from stock s
            join (
                select distinct on (stock_code) stock_code, current_price, change_rate
                from stock_price_snapshot
                order by stock_code, snapshot_at desc
            ) sp on sp.stock_code = s.stock_code
            where s.is_tradable = true
            order by s.stock_code
            """,
            { rs, _ ->
                StockWithPriceDto(
                    stockCode = rs.getString("stock_code"),
                    name = rs.getString("name"),
                    currentPrice = rs.getInt("current_price"),
                    changeRate = rs.getBigDecimal("change_rate")?.toDouble(),
                )
            },
        )
}
