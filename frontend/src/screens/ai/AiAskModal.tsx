// AI 질문 레이어팝업. 메인 레이아웃 우상단 아이콘 클릭 시 뜬다.
// 자유 질문 → 파이썬 'AI 주식전망' 서비스(/ai/ask) 호출 → 전망/매매의견 표시.
// 주식 관련 질문이 아니면 서버가 거절 메시지를 내려준다.
import { useState } from "react";
import { useTheme } from "../../theme";
import * as ai from "../../api/ai";
import type { AiAnswer } from "../../api/ai";

export default function AiAskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const T = useTheme();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiAnswer | null>(null);

  if (!open) return null;

  const submit = async () => {
    const q = question.trim();
    if (!q || loading) return;
    setError(null);
    setResult(null);
    setLoading(true);
    const r = await ai.ask(q);
    setLoading(false);
    if (r.ok) setResult(r.data);
    else setError(r.error);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,4,10,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 380,
          maxHeight: "82dvh",
          display: "flex",
          flexDirection: "column",
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 18,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          fontFamily: T.sans,
          overflow: "hidden",
        }}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 18 }}>✨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: T.text }}>AI 주식전망</div>
            <div style={{ fontSize: 11, color: T.sub }}>종목 질문을 하면 전망·매매의견을 알려드려요</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: T.sub, fontSize: 20, cursor: "pointer", lineHeight: 1 }}
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        {/* 본문 */}
        <div style={{ padding: 16, overflow: "auto" }}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && submit()}
            placeholder={'예: "삼성전자 지금 사도 돼?"'}
            rows={3}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: T.card2,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              color: T.text,
              padding: "12px 14px",
              fontSize: 14,
              fontFamily: T.sans,
              resize: "vertical",
            }}
          />
          <button
            onClick={submit}
            disabled={loading || !question.trim()}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "12px 0",
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg,${T.accent},${T.purple})`,
              color: "#fff",
              fontFamily: T.sans,
              fontWeight: 900,
              fontSize: 14,
              cursor: loading || !question.trim() ? "default" : "pointer",
              opacity: loading || !question.trim() ? 0.6 : 1,
            }}
          >
            {loading ? "분석 중…" : "질문하기"}
          </button>

          {loading && (
            <div style={{ marginTop: 14, fontSize: 12, color: T.sub, textAlign: "center" }}>
              웹에서 최신 뉴스를 찾아 분석하고 있어요. 잠시만요…
            </div>
          )}

          {error && (
            <div style={{ marginTop: 14, background: T.redBg, border: `1px solid ${T.red}40`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: T.red }}>
              {error}
            </div>
          )}

          {result && <ResultView data={result} />}
        </div>
      </div>
    </div>
  );
}

function Badge({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  const T = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center", background: bg, border: `1px solid ${color}40`, borderRadius: 10, padding: "8px 12px", minWidth: 64 }}>
      <span style={{ fontSize: 10, color: T.sub }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 900, color }}>{value}</span>
    </div>
  );
}

function ResultView({ data }: { data: AiAnswer }) {
  const T = useTheme();
  if (!data.answer) {
    return (
      <div style={{ marginTop: 14, background: T.amberBg, border: `1px solid ${T.amber}40`, borderRadius: 10, padding: "12px 14px", fontSize: 13, color: T.text }}>
        {data.message ?? "답변을 생성하지 못했어요."}
      </div>
    );
  }

  const outlookColor =
    data.outlook === "상승" ? { c: T.green, b: T.greenBg } : data.outlook === "하락" ? { c: T.red, b: T.redBg } : { c: T.amber, b: T.amberBg };
  const verdictColor =
    data.verdict === "매수" ? { c: T.green, b: T.greenBg } : data.verdict === "매도" ? { c: T.red, b: T.redBg } : { c: T.sub, b: T.card2 };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, color: T.sub, marginBottom: 8 }}>
        {data.stock_name} {data.stock_code ? `(${data.stock_code})` : ""}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {data.outlook && <Badge label="전망" value={data.outlook} color={outlookColor.c} bg={outlookColor.b} />}
        {data.verdict && <Badge label="판단" value={data.verdict} color={verdictColor.c} bg={verdictColor.b} />}
        {data.confidence && <Badge label="확신도" value={data.confidence} color={T.accentL} bg={T.accentBg} />}
      </div>
      <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.65, color: T.text }}>{data.answer}</div>
    </div>
  );
}
