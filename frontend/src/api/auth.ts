// 인증 API 클라이언트. /api 는 vite 프록시로 Spring Boot(8080)에 연결되고,
// 세션 쿠키 유지를 위해 credentials: "include" 를 사용한다.

export type AuthUser = { username: string; avatar: string | null };

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function postJson<T>(path: string, body: unknown): Promise<Result<T>> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: (data && data.error) || `오류가 발생했습니다 (${res.status})` };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "서버에 연결할 수 없습니다" };
  }
}

export const signup = (username: string, password: string, avatar: string) =>
  postJson<AuthUser>("/api/auth/signup", { username, password, avatar });

export const login = (username: string, password: string) =>
  postJson<AuthUser>("/api/auth/login", { username, password });

export const logout = () => postJson<unknown>("/api/auth/logout", {});

// 부팅 시 세션 확인. 백엔드 응답 지연 시 요청이 무한정 매달리지 않도록
// 타임아웃을 둔다. 타임아웃/실패 시 null → 로그인 화면으로 진행(세션이 있었다면 다시 로그인).
export async function me(timeoutMs = 12000): Promise<AuthUser | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("/api/auth/me", { credentials: "include", signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as AuthUser;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
