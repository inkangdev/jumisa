package com.jumisa.repository

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository

/**
 * 저평가 점수 산출/적재. (기능정의서 v1.2: 점수 = PER30% + PBR30% + EV/EBITDA25% + 성장률15%)
 *
 * 지표(가용 데이터로 직접 계산 — stock_financials 의 eps/bps 는 미적재라 사용 안 함):
 *   PER       = 시총 / 순이익            (낮을수록 저평가)
 *   PBR       = 시총 / 순자본            (낮을수록 저평가)
 *   EV/EBITDA ≈ (시총 + 총부채) / 영업이익 (낮을수록 저평가, 현금·감가상각 미반영 근사)
 *   성장률    = (당기매출 - 전기매출) / |전기매출|  (높을수록 좋음)
 *
 * 시총 = stock_price_snapshot 최신값(없으면 현재가 × 상장주식수), 재무 = stock_financials 최신 연간(fsc).
 * 각 지표를 거래가능 종목 백분위(0~100)로 점수화 후 가중합. 유효 지표만으로 가중치 정규화.
 * PER/PBR 원값도 함께 저장(스크리너 표시·필터용).
 */
@Repository
class UndervalueRepository(private val jdbc: JdbcTemplate) {

    /** 저평가 점수 산출 + 적재(기준일 = Asia/Seoul 오늘, 같은 날 재실행 시 upsert). @return 적재/갱신 행 수 */
    fun computeAndStore(): Int = jdbc.update(SQL)

    private companion object {
        const val SQL = """
            insert into undervalue_score
              (base_date, stock_code, total_score, rank, per_score, pbr_score, ev_ebitda_score, growth_score, per, pbr)
            with latest_snap as (
                select distinct on (stock_code) stock_code, close_price as current_price, market_cap_eokwon
                from stock_daily
                order by stock_code, base_date desc
            ),
            latest_fin as (
                select distinct on (stock_code) stock_code, base_ym,
                       revenue_eok, op_profit_eok, net_income_eok, total_equity_eok, total_debt_eok
                from stock_financials
                where source = 'fsc'
                order by stock_code, base_ym desc
            ),
            prev_fin as (
                select distinct on (f.stock_code) f.stock_code, f.revenue_eok
                from stock_financials f
                join latest_fin l on l.stock_code = f.stock_code
                where f.source = 'fsc' and f.base_ym < l.base_ym
                order by f.stock_code, f.base_ym desc
            ),
            base as (
                select st.stock_code,
                       coalesce(snap.market_cap_eokwon,
                                snap.current_price::numeric * st.listed_shares / 1e8) as mcap,
                       fin.net_income_eok, fin.total_equity_eok, fin.total_debt_eok,
                       fin.op_profit_eok, fin.revenue_eok, pf.revenue_eok as prev_revenue
                from stock st
                join latest_snap snap on snap.stock_code = st.stock_code
                join latest_fin  fin  on fin.stock_code  = st.stock_code
                left join prev_fin pf on pf.stock_code   = st.stock_code
                where st.is_tradable
            ),
            metrics as (
                select stock_code,
                       case when net_income_eok  > 0 and mcap > 0 then mcap / net_income_eok end as per,
                       case when total_equity_eok > 0 and mcap > 0 then mcap / total_equity_eok end as pbr,
                       case when op_profit_eok   > 0 and mcap > 0
                            then (mcap + coalesce(total_debt_eok, 0)) / op_profit_eok end as ev_ebitda,
                       case when prev_revenue is not null and prev_revenue <> 0 and revenue_eok is not null
                            then (revenue_eok - prev_revenue)::numeric / abs(prev_revenue) end as growth
                from base
            ),
            per_s as (select stock_code, (1 - percent_rank() over (order by per)) * 100 as s from metrics where per is not null),
            pbr_s as (select stock_code, (1 - percent_rank() over (order by pbr)) * 100 as s from metrics where pbr is not null),
            ev_s  as (select stock_code, (1 - percent_rank() over (order by ev_ebitda)) * 100 as s from metrics where ev_ebitda is not null),
            gr_s  as (select stock_code, (percent_rank() over (order by growth)) * 100 as s from metrics where growth is not null),
            combined as (
                select m.stock_code, m.per as per_val, m.pbr as pbr_val,
                       p.s as per_score, b.s as pbr_score, e.s as ev_score, g.s as growth_score,
                       (coalesce(p.s,0)*0.30 + coalesce(b.s,0)*0.30 + coalesce(e.s,0)*0.25 + coalesce(g.s,0)*0.15) as weighted,
                       ((case when p.s is not null then 0.30 else 0 end)
                      + (case when b.s is not null then 0.30 else 0 end)
                      + (case when e.s is not null then 0.25 else 0 end)
                      + (case when g.s is not null then 0.15 else 0 end)) as wsum
                from metrics m
                left join per_s p on p.stock_code = m.stock_code
                left join pbr_s b on b.stock_code = m.stock_code
                left join ev_s  e on e.stock_code = m.stock_code
                left join gr_s  g on g.stock_code = m.stock_code
            ),
            final as (
                select stock_code,
                       round(per_score::numeric, 2)    as per_score,
                       round(pbr_score::numeric, 2)    as pbr_score,
                       round(ev_score::numeric, 2)     as ev_ebitda_score,
                       round(growth_score::numeric, 2) as growth_score,
                       round((weighted / wsum)::numeric, 2) as total_score,
                       round(per_val, 2) as per,
                       round(pbr_val, 2) as pbr
                from combined
                where wsum > 0
            )
            select (now() at time zone 'Asia/Seoul')::date as base_date,
                   stock_code, total_score,
                   rank() over (order by total_score desc) as rank,
                   per_score, pbr_score, ev_ebitda_score, growth_score, per, pbr
            from final
            on conflict (base_date, stock_code) do update set
                total_score     = excluded.total_score,
                rank            = excluded.rank,
                per_score       = excluded.per_score,
                pbr_score       = excluded.pbr_score,
                ev_ebitda_score = excluded.ev_ebitda_score,
                growth_score    = excluded.growth_score,
                per             = excluded.per,
                pbr             = excluded.pbr
        """
    }
}
