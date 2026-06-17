export type RoomSummary = {
  id: number;
  name: string;
  hostUsername: string;
  inviteCode: string;
  periodDays: number;
  startPoints: number;
  maxPlayers: number;
  market: string;
  status: string;
  participantCount: number;
  endsAt: string | null;
};

export type Participant = {
  memberId: number;
  username: string;
  avatar: string | null;
  points: number;
  joinedAt: string;
};

export type RoomDetail = {
  id: number;
  name: string;
  hostMemberId: number;
  hostUsername: string;
  inviteCode: string;
  periodDays: number;
  startPoints: number;
  maxPlayers: number;
  market: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  participants: Participant[];
};

export type RankingEntry = {
  rank: number;
  memberId: number;
  username: string;
  avatar: string | null;
  cash: number;
  stockValue: number;
  totalAsset: number;
  returnRate: number;
};

export type Holding = {
  stockCode: string;
  stockName: string;
  qty: number;
  avgPrice: number;
  currentPrice: number;
  pnlRate: number;
};

export type MyPortfolio = {
  cash: number;
  holdings: Holding[];
};

export type StockWithPrice = {
  stockCode: string;
  name: string;
  currentPrice: number;
  changeRate: number | null;
};

export type RoomsResponse = {
  waiting: RoomSummary[];
  active: RoomSummary[];
  myWaiting: RoomSummary[];
};

import { notifyUnauthorized } from "./session";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function get<T>(path: string): Promise<Result<T>> {
  try {
    const res = await fetch(path, { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 401) notifyUnauthorized();
      return { ok: false, error: data?.error || `오류 (${res.status})` };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "서버에 연결할 수 없습니다" };
  }
}

async function post<T>(path: string, body?: unknown): Promise<Result<T>> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: body != null ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 401) notifyUnauthorized();
      return { ok: false, error: data?.error || `오류 (${res.status})` };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "서버에 연결할 수 없습니다" };
  }
}

export const listRooms = () => get<RoomsResponse>("/api/battles");

export const createRoom = (body: {
  name: string;
  periodDays: number;
  startPoints: number;
  maxPlayers: number;
  market: string;
}) => post<{ id: number }>("/api/battles", body);

export const joinByCode = (inviteCode: string) =>
  post<{ id: number }>("/api/battles/join", { inviteCode });

export const joinRoom = (id: number, inviteCode: string) =>
  post<{ id: number }>(`/api/battles/${id}/join`, { inviteCode });

export const getRoom = (id: number) => get<RoomDetail>(`/api/battles/${id}`);

export const startBattle = (id: number) =>
  post<{ ok: boolean }>(`/api/battles/${id}/start`);

export const trade = (id: number, body: { stockCode: string; type: string; qty: number }) =>
  post<{ ok: boolean; message: string }>(`/api/battles/${id}/trade`, body);

export const getRanking = (id: number) => get<RankingEntry[]>(`/api/battles/${id}/ranking`);

export const getMyPortfolio = (id: number) => get<MyPortfolio>(`/api/battles/${id}/portfolio`);

export const listStocks = () => get<StockWithPrice[]>("/api/battles/stocks");