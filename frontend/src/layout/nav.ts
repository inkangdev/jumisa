// 메인 셸 하단 탭 단일 소스. (시안 docs/design/remixed-13412f58.tsx 의 NAV 이식)
// 화면별 컴포넌트는 추후 각 담당자가 탭 id 에 맞춰 끼운다.

export type AppTab = "screener" | "battle" | "watchlist" | "profile";

// profile 탭 icon 은 fallback. 실제로는 BottomNav 에서 로그인 사용자의 아바타(동물)로 대체된다.
export const NAV: { id: AppTab; icon: string; label: string }[] = [
  { id: "screener", icon: "🔍", label: "스크리너" },
  { id: "battle", icon: "⚔️", label: "대결" },
  { id: "watchlist", icon: "⭐", label: "관심종목" },
  { id: "profile", icon: "🐂", label: "내 정보" },
];
