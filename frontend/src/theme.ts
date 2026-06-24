import { createContext, useContext } from "react";

const BASE = {
  accentBg: "rgba(79,142,247,0.10)",
  greenBg: "rgba(34,199,122,0.10)",
  redBg: "rgba(240,84,84,0.10)",
  amberBg: "rgba(245,166,35,0.10)",
  purpleBg: "rgba(167,139,250,0.10)",
  mono: "'JetBrains Mono', monospace",
  sans: "'Noto Sans KR', sans-serif",
} as const;

export const DARK = {
  ...BASE,
  bg: "#080C18",
  card: "#0F1628",
  card2: "#141C30",
  border: "#1E2A40",
  accent: "#4F8EF7",
  accentL: "#7CB3FF",
  green: "#22C77A",
  red: "#F05454",
  amber: "#F5A623",
  purple: "#A78BFA",
  text: "#EDF2FF",
  sub: "#7A8EAA",
  mute: "#2E3D55",
} as const;

export const LIGHT = {
  ...BASE,
  bg: "#F0F4FF",
  card: "#FFFFFF",
  card2: "#F7F9FF",
  border: "#DDE3F0",
  accent: "#3B7BF5",
  accentL: "#6AA0FF",
  green: "#17A362",
  red: "#E03D3D",
  amber: "#D4880A",
  purple: "#7C5FD4",
  text: "#0D1526",
  sub: "#5A6E88",
  mute: "#C8D4E8",
} as const;

export type Theme = {
  bg: string; card: string; card2: string; border: string;
  accent: string; accentL: string; accentBg: string;
  green: string; greenBg: string;
  red: string; redBg: string;
  amber: string; amberBg: string;
  purple: string; purpleBg: string;
  text: string; sub: string; mute: string;
  mono: string; sans: string;
};
export type ThemeMode = "dark" | "light";

export const ThemeContext = createContext<{
  T: Theme;
  mode: ThemeMode;
  toggle: () => void;
}>({ T: DARK, mode: "dark", toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext).T;
}

export function useThemeMode() {
  const { mode, toggle } = useContext(ThemeContext);
  return { mode, toggle };
}