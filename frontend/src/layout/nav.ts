// 메인 셸 하단 탭 단일 소스. (시안 docs/design/remixed-13412f58.tsx 의 NAV 이식)
// 화면별 컴포넌트는 추후 각 담당자가 탭 id 에 맞춰 끼운다.

export type AppTab = "screener" | "battle" | "watchlist" | "more";

export const NAV: { id: AppTab; icon: string; label: string }[] = [
  { id: "screener", icon: "🔍", label: "스크리너" },
  { id: "battle", icon: "⚔️", label: "대결" },
  { id: "watchlist", icon: "⭐", label: "관심종목" },
  { id: "more", icon: "☰", label: "더보기" },
];
