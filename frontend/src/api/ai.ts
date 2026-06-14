// AI 주식전망 API 클라이언트. /ai 는 vite 프록시로 파이썬 FastAPI(:8000)에 연결된다.
// (백엔드 /api 와 별개. 파이썬 ' 주식전망' 서비스가 DB + Claude 로 처리)

export type AiAnswer = {
  ok: boolean;
  stock_related: boolean;
  message: string | null;
  stock_code: string | null;
  stock_name: string | null;
  outlook: string | null; // 상승 | 하락 | 중립
  verdict: string | null; // 매수 | 매도 | 관망
  confidence: string | null; // 상 | 중 | 하
  answer: string | null;
};

export type AskResult = { ok: true; data: AiAnswer } | { ok: false; error: string };

export async function ask(question: string): Promise<AskResult> {
  try {
    const res = await fetch("/ai/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = (await res.json().catch(() => null)) as AiAnswer | null;
    if (!res.ok || !data) {
      return { ok: false, error: `오류가 발생했습니다 (${res.status})` };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: "AI 서버에 연결할 수 없습니다" };
  }
}
