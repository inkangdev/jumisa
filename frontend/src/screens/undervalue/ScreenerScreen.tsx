import { useEffect, useState } from "react";
import { useTheme } from "../../theme";
import type { Theme } from "../../theme";
import { fetchScreener, type ScreenerItem } from "../../api/screener";

type Sort = "score" | "per" | "pbr";

function scoreColor(s: number, T: Theme) {
  return s >= 90 ? T.green : s >= 75 ? T.accent : s >= 60 ? T.amber : T.red;
}

function StockLogo({ code, score }: { code: string; score: number }) {
  const T = useTheme();
  const [failed, setFailed] = useState(false);
  const color = scoreColor(score, T);
  const rounded = Math.round(score);

  if (failed) {
    return (
      <div style={{
        flexShrink: 0, width: 44, height: 44, borderRadius: "50%",
        border: `2px solid ${color}`,
        background: `${color}12`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: 13, fontWeight: 900, color, fontFamily: T.mono, lineHeight: 1 }}>{rounded}</div>
        <div style={{ fontSize: 7, color }}>점</div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", flexShrink: 0, width: 44, height: 44 }}>
      <img
        src={`https://file.alphasquare.co.kr/media/images/stock_logo/kr/${code}.png`}
        alt={code}
        onError={() => setFailed(true)}
        style={{
          width: 44, height: 44, borderRadius: "50%",
          objectFit: "cover",
          border: `1.5px solid ${T.border}`,
          background: T.card2,
        }}
      />
      <div style={{
        position: "absolute", bottom: -2, right: -2,
        minWidth: 18, height: 18, borderRadius: 9,
        padding: "0 3px",
        background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 8, fontWeight: 900, color: "#fff", fontFamily: T.mono,
        border: `1.5px solid ${T.bg}`,
        boxSizing: "border-box",
      }}>
        {rounded}
      </div>
    </div>
  );
}

export default function ScreenerScreen() {
  const T = useTheme();
  const [items, setItems] = useState<ScreenerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [perMax, setPerMax] = useState(20);
  const [pbrMax, setPbrMax] = useState(2);
  const [sort, setSort] = useState<Sort>("score");
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    fetchScreener()
      .then((r) => {
        if (r.ok) setItems(r.data.items);
        else setError(r.error);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items
    .filter(
      (s) =>
        (s.per == null || s.per <= perMax) &&
        (s.pbr == null || s.pbr <= pbrMax)
    )
    .sort((a, b) => {
      if (sort === "score") return (b.totalScore ?? 0) - (a.totalScore ?? 0);
      if (sort === "per") return (a.per ?? 999) - (b.per ?? 999);
      return (a.pbr ?? 999) - (b.pbr ?? 999);
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 헤더 */}
      <div style={{ padding: "14px 16px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: T.text }}>저평가 스크리너</div>
            <div style={{ fontSize: 11, color: T.sub }}>
              {loading ? "불러오는 중..." : `${filtered.length}개 종목`}
            </div>
          </div>
          <button
            onClick={() => setShowFilter((v) => !v)}
            style={{
              width: 36, height: 36, borderRadius: 12,
              border: `1px solid ${showFilter ? T.accent : T.border}`,
              background: showFilter ? T.accentBg : "transparent",
              color: showFilter ? T.accent : T.sub,
              fontSize: 16, cursor: "pointer",
            }}
          >
            ⚙
          </button>
        </div>

        {/* 국내/미국 탭 */}
        <div style={{ display: "flex", gap: 6, marginBottom: showFilter ? 10 : 12 }}>
          <button
            style={{
              flex: 1, padding: "9px 0", borderRadius: 12, border: "none",
              background: T.accent, color: "#fff",
              fontFamily: T.sans, fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}
          >
            🇰🇷 국내
          </button>
          <button
            disabled
            title="미국 시장은 추후 지원 예정입니다"
            style={{
              flex: 1, padding: "9px 0", borderRadius: 12, border: "none",
              background: T.card2, color: T.mute,
              fontFamily: T.sans, fontWeight: 700, fontSize: 13, cursor: "not-allowed", opacity: 0.5,
            }}
          >
            🇺🇸 미국
          </button>
        </div>

        {/* 필터 패널 */}
        {showFilter && (
          <div style={{
            background: T.card2, borderRadius: 14, padding: "14px 14px 10px",
            marginBottom: 10, border: `1px solid ${T.border}`,
          }}>
            {[
              { label: "PER", val: perMax, set: setPerMax, max: 50, step: 1, easy: "주가÷순이익" },
              { label: "PBR", val: pbrMax, set: setPbrMax, max: 5, step: 0.1, easy: "주가÷순자산" },
            ].map((f) => (
              <div key={f.label} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>
                    {f.label}{" "}
                    <span style={{ color: T.sub, fontWeight: 400, fontSize: 10 }}>{f.easy}</span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, fontFamily: T.mono }}>{f.val}</span>
                </div>
                <input
                  type="range" min={f.step} max={f.max} step={f.step}
                  value={f.val}
                  onChange={(e) => f.set(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: T.accent }}
                />
              </div>
            ))}
            <div style={{ display: "flex", gap: 6 }}>
              {(["score", "per", "pbr"] as Sort[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setSort(k)}
                  style={{
                    padding: "6px 12px", borderRadius: 20,
                    border: `1px solid ${sort === k ? T.accent : T.border}`,
                    background: sort === k ? T.accentBg : "transparent",
                    color: sort === k ? T.accentL : T.sub,
                    fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: T.sans,
                  }}
                >
                  {k === "score" ? "점수순" : k === "per" ? "PER순" : "PBR순"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 4px" }}>
        {error && (
          <div style={{ textAlign: "center", paddingTop: 60, color: T.red, fontSize: 14 }}>{error}</div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <div style={{ color: T.sub, fontSize: 14 }}>조건에 맞는 종목이 없어요</div>
            <div style={{ color: T.mute, fontSize: 12, marginTop: 4 }}>
              PER·PBR 기준을 높이거나 데이터 적재를 먼저 확인하세요
            </div>
          </div>
        )}
        {!loading && !error && filtered.map((s, i) => {
          const score = s.totalScore ?? 0;
          return (
            <div key={s.stockCode}>
              <div style={{ padding: "13px 0", display: "flex", alignItems: "center", gap: 10 }}>
                <StockLogo code={s.stockCode} score={score} />

                {/* 종목 정보 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: T.text, fontSize: 14, marginBottom: 3 }}>
                    {s.name ?? s.stockCode}
                  </div>
                  <div style={{ fontSize: 11, color: T.sub, fontFamily: T.mono }}>
                    {s.per != null ? `PER ${s.per}x` : ""}
                    {s.per != null && s.pbr != null ? " · " : ""}
                    {s.pbr != null ? `PBR ${s.pbr}x` : ""}
                    {s.sector ? ` · ${s.sector}` : ""}
                  </div>
                </div>

                {/* 가격 */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.mono }}>
                    {s.currentPrice != null ? s.currentPrice.toLocaleString() : "-"}
                  </div>
                  {s.changeRate != null && (
                    <div style={{ fontSize: 12, color: s.changeRate >= 0 ? T.green : T.red, fontWeight: 600 }}>
                      {s.changeRate >= 0 ? "+" : ""}{s.changeRate.toFixed(1)}%
                    </div>
                  )}
                </div>

                {/* 관심종목 버튼 (watchlist 기능 별도 작업) */}
                <button
                  disabled
                  style={{
                    flexShrink: 0, width: 32, height: 32, borderRadius: 10,
                    border: `1px solid ${T.border}`,
                    background: "transparent", color: T.mute,
                    fontSize: 16, cursor: "not-allowed", opacity: 0.4,
                  }}
                >
                  ☆
                </button>
              </div>
              {i < filtered.length - 1 && (
                <div style={{ height: 1, background: T.border }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}