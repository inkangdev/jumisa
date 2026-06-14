// 하단 4탭 네비게이션. (시안 docs/design/remixed-13412f58.tsx 의 Bottom Nav 이식)
import { T } from "../theme";
import { NAV, type AppTab } from "./nav";

export default function BottomNav({
  active,
  onSelect,
  avatar,
}: {
  active: AppTab;
  onSelect: (tab: AppTab) => void;
  avatar: string | null;
}) {
  return (
    <div
      style={{
        height: 68,
        flexShrink: 0,
        background: T.card,
        borderTop: `1px solid ${T.border}`,
        display: "flex",
        alignItems: "center",
        paddingTop: 4,
      }}
    >
      {NAV.map((n) => {
        const on = active === n.id;
        // 내 정보 탭은 로그인 사용자의 프로필 동물(아바타)을 아이콘으로 사용.
        const icon = n.id === "profile" ? avatar ?? n.icon : n.icon;
        return (
          <button
            key={n.id}
            onClick={() => onSelect(n.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px 0",
            }}
          >
            <div
              style={{
                width: 40,
                height: 28,
                borderRadius: 10,
                background: on ? T.accentBg : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: n.id === "battle" ? 18 : 15,
              }}
            >
              {icon}
            </div>
            <span style={{ fontSize: 9, fontWeight: on ? 700 : 400, color: on ? T.accent : T.mute }}>
              {n.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
