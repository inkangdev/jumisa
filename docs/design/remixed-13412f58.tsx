import { useState, useEffect } from "react";

const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=JetBrains+Mono:wght@400;600;700&display=swap";
document.head.appendChild(fontLink);

const T = {
  bg:"#080C18", card:"#0F1628", card2:"#141C30", border:"#1E2A40",
  accent:"#4F8EF7", accentL:"#7CB3FF", accentBg:"rgba(79,142,247,0.10)",
  green:"#22C77A", greenBg:"rgba(34,199,122,0.10)",
  red:"#F05454", redBg:"rgba(240,84,84,0.10)",
  amber:"#F5A623", amberBg:"rgba(245,166,35,0.10)",
  purple:"#A78BFA", purpleBg:"rgba(167,139,250,0.10)",
  text:"#EDF2FF", sub:"#7A8EAA", mute:"#2E3D55",
  mono:"'JetBrains Mono',monospace", sans:"'Noto Sans KR',sans-serif",
};

// ── Mock stock data ───────────────────────────────────────
const ALL_STOCKS = [
  { code:"005930", name:"삼성전자",   sector:"반도체",   price:71200,  per:12.4, pbr:1.1, ev:7.2,  score:88, change:+1.2, isUSD:false },
  { code:"000660", name:"SK하이닉스", sector:"반도체",   price:182000, per:8.9,  pbr:1.4, ev:5.8,  score:92, change:-0.8, isUSD:false },
  { code:"005380", name:"현대차",     sector:"자동차",   price:242000, per:6.1,  pbr:0.7, ev:4.2,  score:96, change:+2.1, isUSD:false },
  { code:"000270", name:"기아",       sector:"자동차",   price:94400,  per:5.3,  pbr:0.8, ev:3.9,  score:97, change:+1.8, isUSD:false },
  { code:"105560", name:"KB금융",     sector:"금융",     price:82300,  per:7.2,  pbr:0.6, ev:5.1,  score:93, change:+0.9, isUSD:false },
  { code:"051910", name:"LG화학",     sector:"화학",     price:312000, per:9.3,  pbr:1.0, ev:6.1,  score:90, change:-1.4, isUSD:false },
  { code:"035420", name:"NAVER",      sector:"IT서비스", price:178000, per:22.1, pbr:1.8, ev:11.2, score:71, change:+0.3, isUSD:false },
  { code:"068270", name:"셀트리온",   sector:"바이오",   price:188500, per:31.2, pbr:3.1, ev:18.4, score:54, change:-2.2, isUSD:false },
  { code:"INTC",   name:"Intel",      sector:"반도체",   price:31.45,  per:9.8,  pbr:1.2, ev:6.4,  score:91, change:-1.1, isUSD:true  },
  { code:"F",      name:"Ford Motor", sector:"자동차",   price:11.22,  per:7.1,  pbr:1.0, ev:4.8,  score:95, change:+2.3, isUSD:true  },
  { code:"BAC",    name:"BofA",       sector:"금융",     price:34.87,  per:11.2, pbr:1.1, ev:8.2,  score:88, change:+0.6, isUSD:true  },
  { code:"XOM",    name:"ExxonMobil", sector:"에너지",   price:108.45, per:13.5, pbr:1.9, ev:7.9,  score:83, change:+1.4, isUSD:true  },
  { code:"PARA",   name:"Paramount",  sector:"미디어",   price:10.22,  per:6.3,  pbr:0.7, ev:5.1,  score:97, change:-3.2, isUSD:true  },
  { code:"WBA",    name:"Walgreens",  sector:"헬스케어", price:9.14,   per:4.9,  pbr:0.5, ev:5.8,  score:98, change:-0.8, isUSD:true  },
];

const KR_STOCKS = ALL_STOCKS.filter(s=>!s.isUSD);
const US_STOCKS = ALL_STOCKS.filter(s=>s.isUSD);

// ── Simulated other players ───────────────────────────────
const INIT_POINTS = 1_000_000;
const BOT_PLAYERS = [
  { id:"bot1", name:"김주식",   avatar:"🐂", holdings:{"005930":{qty:8,avgPrice:71200,stock:ALL_STOCKS[0]},"000270":{qty:3,avgPrice:94400,stock:ALL_STOCKS[3]}} },
  { id:"bot2", name:"이버핏",   avatar:"🦅", holdings:{"000660":{qty:4,avgPrice:182000,stock:ALL_STOCKS[1]},"F":{qty:20,avgPrice:15230,stock:ALL_STOCKS[9]}} },
  { id:"bot3", name:"박가치",   avatar:"🐻", holdings:{"105560":{qty:10,avgPrice:82300,stock:ALL_STOCKS[4]},"005380":{qty:2,avgPrice:242000,stock:ALL_STOCKS[2]}} },
  { id:"bot4", name:"최장기",   avatar:"🦁", holdings:{"INTC":{qty:15,avgPrice:42678,stock:ALL_STOCKS[8]},"051910":{qty:1,avgPrice:312000,stock:ALL_STOCKS[5]}} },
];

// ── Util ──────────────────────────────────────────────────
const fmtKRW = n => { if(n>=1e8) return (n/1e8).toFixed(1)+"억"; if(n>=1e4) return Math.round(n/1e4)+"만"; return n.toLocaleString(); };
const calcTotal = (points, holdings) => {
  const holdVal = Object.values(holdings).reduce((s,{qty,stock})=>s+(stock.isUSD?stock.price*1360:stock.price)*qty,0);
  return points + holdVal;
};
const calcReturn = (total) => ((total-INIT_POINTS)/INIT_POINTS*100);
const scoreColor = s => s>=90?T.green:s>=75?T.accent:s>=60?T.amber:T.red;
const rankMedal = r => r===1?"🥇":r===2?"🥈":r===3?"🥉":`${r}위`;

// ── Components ────────────────────────────────────────────
const Chip = ({children,color=T.accent,style={}}) => (
  <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,
    background:`${color}20`,color,border:`1px solid ${color}30`,
    fontFamily:T.mono,whiteSpace:"nowrap",...style}}>{children}</span>
);
const Div = ({mx=0}) => <div style={{height:1,background:T.border,margin:`0 ${-mx}px`}}/>;

// ── Battle Lobby ──────────────────────────────────────────
function BattleLobbyScreen({ myName, myAvatar, room, setRoom, setBattleView }) {

  // Simulated rooms
  const ROOMS = [
    { id:"R001", name:"저평가 고수들의 방", host:"김주식", players:[{name:"김주식",avatar:"🐂"},{name:"이버핏",avatar:"🦅"}], max:6, period:"7일", startPoints:INIT_POINTS, status:"waiting" },
    { id:"R002", name:"초보 환영 가치투자", host:"박가치", players:[{name:"박가치",avatar:"🐻"},{name:"최장기",avatar:"🦁"},{name:"오투자",avatar:"🦊"}], max:4, period:"30일", startPoints:INIT_POINTS, status:"waiting" },
    { id:"R003", name:"빠른 대결 (3일)", host:"정단기", players:[{name:"정단기",avatar:"⚡"}], max:8, period:"3일", startPoints:500000, status:"waiting" },
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{padding:"14px 16px 0",flexShrink:0}}>
        <div style={{fontSize:17,fontWeight:900,color:T.text,marginBottom:2}}>모의투자 대결</div>
        <div style={{fontSize:11,color:T.sub,marginBottom:14}}>같은 포인트로 시작해서 수익률로 순위 결정!</div>

        {/* Create room */}
        <button onClick={()=>setBattleView("create")} style={{
          width:"100%",padding:"13px 0",borderRadius:14,border:"none",
          background:`linear-gradient(135deg,${T.accent},${T.purple})`,
          color:"#fff",fontFamily:T.sans,fontWeight:900,fontSize:14,cursor:"pointer",
          marginBottom:14,boxShadow:"0 6px 20px rgba(79,142,247,0.3)"}}>
          ⚔️ 새 대결방 만들기
        </button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"0 16px 12px"}}>
        <div style={{fontSize:12,fontWeight:700,color:T.sub,marginBottom:10}}>참가 가능한 방</div>
        {ROOMS.map((r,i)=>(
          <div key={r.id} style={{background:T.card2,borderRadius:16,padding:"14px 16px",
            marginBottom:10,border:`1px solid ${T.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,color:T.text,fontSize:14,marginBottom:3}}>{r.name}</div>
                <div style={{fontSize:11,color:T.sub}}>방장 {r.host} · {r.period} 대결</div>
              </div>
              <Chip color={T.green}>입장가능</Chip>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
              <Chip color={T.amber}>시작금 {fmtKRW(r.startPoints)}P</Chip>
              <Chip color={T.accent}>{r.players.length}/{r.max}명</Chip>
              <Chip color={T.purple}>{r.period}</Chip>
            </div>
            {/* Player avatars */}
            <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:12}}>
              {r.players.map((p,pi)=>(
                <div key={pi} style={{width:28,height:28,borderRadius:"50%",
                  background:T.card,border:`1px solid ${T.border}`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>
                  {p.avatar}
                </div>
              ))}
              {Array(r.max-r.players.length).fill(0).map((_,pi)=>(
                <div key={pi} style={{width:28,height:28,borderRadius:"50%",
                  background:T.mute,border:`1px dashed ${T.border}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:T.sub,fontSize:14}}>+</div>
              ))}
            </div>
            <button onClick={()=>{ setRoom({...r,joined:true}); setBattleView("room"); }} style={{
              width:"100%",padding:"10px 0",borderRadius:12,border:`1px solid ${T.accent}`,
              background:T.accentBg,color:T.accentL,fontFamily:T.sans,
              fontWeight:700,fontSize:13,cursor:"pointer"}}>참가하기</button>
          </div>
        ))}

        {/* My active rooms */}
        <div style={{fontSize:12,fontWeight:700,color:T.sub,marginBottom:10,marginTop:6}}>진행 중인 대결</div>
        <div style={{background:T.card2,borderRadius:16,padding:"14px 16px",border:`1px solid ${T.green}30`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <div style={{fontWeight:700,color:T.text,fontSize:14}}>주미사 챔피언십</div>
            <Chip color={T.green}>진행중</Chip>
          </div>
          <div style={{fontSize:11,color:T.sub,marginBottom:10}}>5명 참가 · 3일 남음</div>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            {["🥇김주식",`🥈${myAvatar}나`,`🥉이버핏`,"4️⃣박가치","5️⃣최장기"].map((p,pi)=>(
              <div key={pi} style={{fontSize:10,color:pi===1?T.accentL:T.sub,
                fontWeight:pi===1?700:400,whiteSpace:"nowrap"}}>{p}</div>
            ))}
          </div>
          <button onClick={()=>setBattleView("active")} style={{
            width:"100%",padding:"10px 0",borderRadius:12,border:"none",
            background:T.green,color:"#fff",fontFamily:T.sans,
            fontWeight:700,fontSize:13,cursor:"pointer"}}>대결 현황 보기 →</button>
        </div>
      </div>
    </div>
  );
}

// ── Create Room ───────────────────────────────────────────
function CreateRoomScreen({ myName, myAvatar, setBattleView, setRoom }) {
  const [name, setName]         = useState("");
  const [period, setPeriod]     = useState("7");
  const [maxP, setMaxP]         = useState(6);
  const [startP, setStartP]     = useState("1000000");
  const [market, setMarket]     = useState("both");

  function create() {
    if(!name) { alert("방 이름을 입력해주세요"); return; }
    setRoom({
      id:"MY001", name, host:myName, hostAvatar:myAvatar,
      players:[{name:myName, avatar:myAvatar, id:"me"}],
      max:maxP, period:`${period}일`, startPoints:parseInt(startP)||1000000,
      market, status:"waiting", joined:true,
    });
    setBattleView("room");
  }

  return (
    <div style={{height:"100%",overflowY:"auto"}}>
      <div style={{padding:"14px 16px 20px"}}>
        <button onClick={()=>setBattleView("lobby")} style={{
          background:"transparent",border:"none",color:T.sub,
          fontSize:13,cursor:"pointer",marginBottom:12,padding:0,fontFamily:T.sans}}>← 뒤로</button>
        <div style={{fontSize:17,fontWeight:900,color:T.text,marginBottom:16}}>새 대결방 만들기</div>

        {[
          {label:"방 이름", content:(
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="예: 저평가 고수들의 방"
              style={{width:"100%",boxSizing:"border-box",background:T.bg,border:`1px solid ${T.border}`,
                borderRadius:12,color:T.text,padding:"12px 14px",fontSize:14,fontFamily:T.sans}}/>
          )},
          {label:"대결 기간", content:(
            <div style={{display:"flex",gap:8}}>
              {["3","7","14","30"].map(d=>(
                <button key={d} onClick={()=>setPeriod(d)} style={{
                  flex:1,padding:"10px 0",borderRadius:12,border:`1px solid ${period===d?T.accent:T.border}`,
                  background:period===d?T.accentBg:"transparent",
                  color:period===d?T.accentL:T.sub,fontFamily:T.sans,fontWeight:600,fontSize:13,cursor:"pointer"}}>
                  {d}일
                </button>
              ))}
            </div>
          )},
          {label:"시작 포인트 (모든 참가자 동일)", content:(
            <div style={{display:"flex",gap:8}}>
              {[["500,000","500000"],["1,000,000","1000000"],["3,000,000","3000000"]].map(([l,v])=>(
                <button key={v} onClick={()=>setStartP(v)} style={{
                  flex:1,padding:"10px 4px",borderRadius:12,border:`1px solid ${startP===v?T.amber:T.border}`,
                  background:startP===v?T.amberBg:"transparent",
                  color:startP===v?T.amber:T.sub,fontFamily:T.mono,fontWeight:600,fontSize:11,cursor:"pointer"}}>
                  {l}P
                </button>
              ))}
            </div>
          )},
          {label:"최대 인원", content:(
            <div style={{display:"flex",alignItems:"center",gap:16,justifyContent:"center"}}>
              <button onClick={()=>setMaxP(p=>Math.max(2,p-1))} style={{
                width:40,height:40,borderRadius:12,border:`1px solid ${T.border}`,
                background:T.bg,color:T.text,fontSize:20,cursor:"pointer"}}>−</button>
              <span style={{fontSize:24,fontWeight:900,color:T.text,fontFamily:T.mono,minWidth:40,textAlign:"center"}}>{maxP}</span>
              <button onClick={()=>setMaxP(p=>Math.min(20,p+1))} style={{
                width:40,height:40,borderRadius:12,border:`1px solid ${T.border}`,
                background:T.bg,color:T.text,fontSize:20,cursor:"pointer"}}>+</button>
              <span style={{fontSize:13,color:T.sub}}>명</span>
            </div>
          )},
          {label:"거래 가능 시장", content:(
            <div style={{display:"flex",gap:8}}>
              {[["both","국내+미국"],["kr","🇰🇷 국내만"],["us","🇺🇸 미국만"]].map(([v,l])=>(
                <button key={v} onClick={()=>setMarket(v)} style={{
                  flex:1,padding:"9px 4px",borderRadius:12,border:`1px solid ${market===v?T.accent:T.border}`,
                  background:market===v?T.accentBg:"transparent",
                  color:market===v?T.accentL:T.sub,fontFamily:T.sans,fontWeight:600,fontSize:11,cursor:"pointer"}}>
                  {l}
                </button>
              ))}
            </div>
          )},
        ].map(({label,content})=>(
          <div key={label} style={{marginBottom:18}}>
            <div style={{fontSize:12,fontWeight:700,color:T.sub,marginBottom:8}}>{label}</div>
            {content}
          </div>
        ))}

        {/* Preview */}
        <div style={{background:T.card2,borderRadius:14,padding:"14px 16px",marginBottom:16,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:12,color:T.sub,marginBottom:8}}>방 미리보기</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Chip color={T.amber}>{fmtKRW(parseInt(startP)||0)}P 지급</Chip>
            <Chip color={T.accent}>{period}일 대결</Chip>
            <Chip color={T.purple}>최대 {maxP}명</Chip>
          </div>
        </div>

        <button onClick={create} style={{
          width:"100%",padding:"14px 0",borderRadius:14,border:"none",
          background:`linear-gradient(135deg,${T.accent},${T.purple})`,
          color:"#fff",fontFamily:T.sans,fontWeight:900,fontSize:15,cursor:"pointer",
          boxShadow:"0 6px 20px rgba(79,142,247,0.3)"}}>
          ⚔️ 방 만들기
        </button>
      </div>
    </div>
  );
}

// ── Room Waiting ──────────────────────────────────────────
function RoomWaitingScreen({ room, myName, myAvatar, setBattleView, startBattle }) {
  const [copied, setCopied] = useState(false);
  const allPlayers = [
    {name:myName, avatar:myAvatar, id:"me"},
    ...BOT_PLAYERS.slice(0, room.max-1).map(b=>({name:b.name,avatar:b.avatar,id:b.id})),
  ];
  const isHost = true;

  function copyInvite() {
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{padding:"14px 16px 0",flexShrink:0}}>
        <button onClick={()=>setBattleView("lobby")} style={{
          background:"transparent",border:"none",color:T.sub,
          fontSize:13,cursor:"pointer",marginBottom:12,padding:0,fontFamily:T.sans}}>← 나가기</button>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div style={{fontSize:16,fontWeight:900,color:T.text}}>{room.name}</div>
          <Chip color={T.amber}>대기중</Chip>
        </div>
        <div style={{fontSize:11,color:T.sub,marginBottom:14}}>
          방장: {room.host} · {room.period} 대결 · 시작금 {fmtKRW(room.startPoints)}P
        </div>

        {/* Invite code */}
        <div style={{background:T.card2,borderRadius:14,padding:"12px 14px",
          marginBottom:14,border:`1px solid ${T.border}`,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:10,color:T.sub,marginBottom:2}}>초대 코드</div>
            <div style={{fontSize:18,fontWeight:900,color:T.accentL,fontFamily:T.mono,letterSpacing:4}}>
              {room.id}
            </div>
          </div>
          <button onClick={copyInvite} style={{
            padding:"8px 14px",borderRadius:10,border:"none",
            background:copied?T.greenBg:T.accentBg,
            color:copied?T.green:T.accentL,
            fontFamily:T.sans,fontWeight:700,fontSize:12,cursor:"pointer"}}>
            {copied?"복사됨!":"복사"}
          </button>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"0 16px"}}>
        <div style={{fontSize:12,fontWeight:700,color:T.sub,marginBottom:10}}>
          참가자 {allPlayers.length}/{room.max}명
        </div>
        {allPlayers.map((p,i)=>(
          <div key={p.id} style={{
            display:"flex",alignItems:"center",gap:12,padding:"12px 0",
            borderBottom:i<allPlayers.length-1?`1px solid ${T.border}`:"none"}}>
            <div style={{width:40,height:40,borderRadius:"50%",
              background:p.id==="me"?`linear-gradient(135deg,${T.accent},${T.purple})`:T.card2,
              border:`1px solid ${p.id==="me"?T.accent:T.border}`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
              {p.avatar}
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:T.text,fontSize:14}}>
                {p.name} {p.id==="me"&&<span style={{color:T.accentL,fontSize:11}}>(나)</span>}
              </div>
              <div style={{fontSize:11,color:T.sub}}>{i===0?"방장":"참가자"}</div>
            </div>
            <Chip color={T.green}>준비완료</Chip>
          </div>
        ))}

        {/* Empty slots */}
        {Array(room.max-allPlayers.length).fill(0).map((_,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",
            borderBottom:`1px solid ${T.border}`}}>
            <div style={{width:40,height:40,borderRadius:"50%",
              background:"transparent",border:`1px dashed ${T.mute}`,
              display:"flex",alignItems:"center",justifyContent:"center",color:T.mute,fontSize:18}}>+</div>
            <div style={{color:T.mute,fontSize:13}}>대기 중...</div>
          </div>
        ))}
      </div>

      <div style={{padding:"12px 16px",flexShrink:0}}>
        {isHost && (
          <button onClick={startBattle} style={{
            width:"100%",padding:"14px 0",borderRadius:14,border:"none",
            background:`linear-gradient(135deg,${T.green},${T.accent})`,
            color:"#fff",fontFamily:T.sans,fontWeight:900,fontSize:15,cursor:"pointer",
            boxShadow:"0 6px 20px rgba(34,199,122,0.3)"}}>
            🚀 대결 시작!
          </button>
        )}
        <div style={{textAlign:"center",marginTop:8,fontSize:11,color:T.mute}}>
          ※ 시작 후 모든 참가자에게 {fmtKRW(room.startPoints)}P 동시 지급
        </div>
      </div>
    </div>
  );
}

// ── Active Battle ─────────────────────────────────────────
function ActiveBattleScreen({ myPortfolio, setMyPortfolio, myName, myAvatar, room, setBattleView, setTradeTarget, setScreen }) {
  const [tab, setTab] = useState("rank");

  // Compute everyone's total
  const INIT = room?.startPoints || INIT_POINTS;
  const myTotal = calcTotal(myPortfolio.points, myPortfolio.holdings);
  const myRet   = calcReturn(myTotal);

  const players = [
    { id:"me",   name:myName,          avatar:myAvatar, total:myTotal,          ret:myRet },
    { id:"bot1", name:"김주식",         avatar:"🐂",     total:calcTotal(INIT*0.85, BOT_PLAYERS[0].holdings)+INIT*0.02*50000, ret:14.2 },
    { id:"bot2", name:"이버핏",         avatar:"🦅",     total:INIT*1.089,       ret:8.9  },
    { id:"bot3", name:"박가치",         avatar:"🐻",     total:INIT*1.063,       ret:6.3  },
    { id:"bot4", name:"최장기",         avatar:"🦁",     total:INIT*0.971,       ret:-2.9 },
  ].sort((a,b)=>b.ret-a.ret);

  const myRank = players.findIndex(p=>p.id==="me")+1;

  // Holdings section
  const holdings = Object.entries(myPortfolio.holdings);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"14px 16px 0",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div style={{fontSize:16,fontWeight:900,color:T.text}}>⚔️ 대결 진행중</div>
          <Chip color={T.red}>D-3</Chip>
        </div>
        <div style={{fontSize:11,color:T.sub,marginBottom:12}}>
          {room?.name||"주미사 챔피언십"} · {players.length}명 참가
        </div>

        {/* My rank card */}
        <div style={{
          background:`linear-gradient(135deg,${T.card2},#1a2040)`,
          borderRadius:16,padding:"14px 16px",marginBottom:12,
          border:`1px solid ${myRank<=3?"rgba(79,142,247,0.4)":T.border}`,
          boxShadow:myRank<=3?"0 4px 20px rgba(79,142,247,0.15)":"none"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontSize:28}}>{rankMedal(myRank).split(" ")[0]||myRank+"위"}</div>
              <div>
                <div style={{fontSize:12,color:T.sub}}>내 순위</div>
                <div style={{fontSize:20,fontWeight:900,color:T.text,fontFamily:T.mono}}>
                  {myRank}위 <span style={{fontSize:13,color:T.sub}}>/ {players.length}명</span>
                </div>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,color:T.sub}}>수익률</div>
              <div style={{fontSize:20,fontWeight:900,
                color:myRet>=0?T.green:T.red,fontFamily:T.mono}}>
                {myRet>=0?"+":""}{myRet.toFixed(2)}%
              </div>
              <div style={{fontSize:11,color:T.sub,fontFamily:T.mono}}>
                {fmtKRW(Math.round(myTotal))}P
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:6,marginBottom:2}}>
          {[["rank","🏆 순위"],["my","💼 내 투자"],["trade","📈 거래"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{
              flex:1,padding:"8px 0",borderRadius:12,border:`1px solid ${tab===k?T.accent:T.border}`,
              background:tab===k?T.accentBg:"transparent",
              color:tab===k?T.accentL:T.sub,fontFamily:T.sans,fontWeight:700,fontSize:12,cursor:"pointer"}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{flex:1,overflowY:"auto",padding:"10px 16px 16px"}}>

        {/* RANK TAB */}
        {tab==="rank" && (
          <div>
            {players.map((p,i)=>{
              const isMe = p.id==="me";
              const pos  = p.ret>=0;
              return (
                <div key={p.id} style={{
                  background:isMe?`${T.accent}10`:T.card2,
                  border:`1px solid ${isMe?T.accent:T.border}`,
                  borderRadius:14,padding:"12px 14px",marginBottom:8,
                  display:"flex",alignItems:"center",gap:10}}>
                  {/* Rank */}
                  <div style={{width:32,textAlign:"center",fontSize:i<3?22:14,
                    fontWeight:900,color:i===0?T.amber:i===1?T.sub:i===2?"#cd7f32":T.mute}}>
                    {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}
                  </div>
                  {/* Avatar */}
                  <div style={{width:36,height:36,borderRadius:"50%",
                    background:isMe?`linear-gradient(135deg,${T.accent},${T.purple})`:T.card,
                    border:`1px solid ${isMe?T.accent:T.border}`,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                    {p.avatar}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,color:isMe?T.accentL:T.text,fontSize:14}}>
                      {p.name}{isMe&&" (나)"}
                    </div>
                    <div style={{fontSize:11,color:T.sub,fontFamily:T.mono}}>
                      {fmtKRW(Math.round(p.total))}P
                    </div>
                  </div>
                  {/* Return */}
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:15,fontWeight:900,
                      color:pos?T.green:T.red,fontFamily:T.mono}}>
                      {pos?"+":""}{p.ret.toFixed(2)}%
                    </div>
                    <div style={{fontSize:10,color:T.mute}}>
                      {pos?"+":""}{fmtKRW(Math.abs(Math.round(p.total-INIT)))}P
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Mini bar chart */}
            <div style={{background:T.card2,borderRadius:14,padding:"14px 16px",
              marginTop:4,border:`1px solid ${T.border}`}}>
              <div style={{fontSize:12,fontWeight:700,color:T.sub,marginBottom:12}}>수익률 비교</div>
              {players.map((p,i)=>(
                <div key={p.id} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:11}}>
                    <span style={{color:p.id==="me"?T.accentL:T.sub}}>{p.avatar} {p.name}</span>
                    <span style={{color:p.ret>=0?T.green:T.red,fontFamily:T.mono}}>
                      {p.ret>=0?"+":""}{p.ret.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{height:6,borderRadius:4,background:T.mute,overflow:"hidden"}}>
                    <div style={{
                      height:"100%",borderRadius:4,
                      background:p.id==="me"?T.accent:p.ret>=0?T.green:T.red,
                      width:`${Math.min(100,Math.max(2,(p.ret+5)/20*100))}%`,
                      transition:"width 0.5s"}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MY HOLDINGS TAB */}
        {tab==="my" && (
          <div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <div style={{flex:1,background:T.card2,borderRadius:12,padding:"10px 12px",border:`1px solid ${T.border}`}}>
                <div style={{fontSize:10,color:T.sub}}>현금</div>
                <div style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.mono}}>{fmtKRW(myPortfolio.points)}P</div>
              </div>
              <div style={{flex:1,background:T.card2,borderRadius:12,padding:"10px 12px",border:`1px solid ${T.border}`}}>
                <div style={{fontSize:10,color:T.sub}}>주식평가</div>
                <div style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.mono}}>
                  {fmtKRW(Math.round(myTotal-myPortfolio.points))}P
                </div>
              </div>
            </div>

            {holdings.length===0 ? (
              <div style={{background:T.card2,borderRadius:14,padding:"28px 0",textAlign:"center",border:`1px solid ${T.border}`}}>
                <div style={{fontSize:28,marginBottom:6}}>📭</div>
                <div style={{color:T.sub,fontSize:13}}>아직 매수한 종목이 없어요</div>
                <button onClick={()=>setTab("trade")} style={{
                  marginTop:10,padding:"8px 18px",borderRadius:10,border:"none",
                  background:T.accentBg,color:T.accentL,fontFamily:T.sans,
                  fontWeight:700,fontSize:13,cursor:"pointer"}}>종목 매수하러 가기</button>
              </div>
            ) : holdings.map(([code,{qty,avgPrice,stock}])=>{
              const cur = stock.isUSD?stock.price*1360:stock.price;
              const pnl = ((cur-avgPrice)/avgPrice*100).toFixed(2);
              const pp  = parseFloat(pnl)>=0;
              return (
                <div key={code} style={{background:T.card2,borderRadius:14,padding:"14px 16px",
                  marginBottom:8,border:`1px solid ${T.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <div>
                      <div style={{fontWeight:700,color:T.text,fontSize:14}}>{stock.name}</div>
                      <div style={{fontSize:11,color:T.sub}}>{code} · {qty}주</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:14,fontWeight:900,color:pp?T.green:T.red}}>{pp?"+":""}{pnl}%</div>
                      <div style={{fontSize:11,color:T.sub,fontFamily:T.mono}}>{fmtKRW(Math.round(cur*qty))}P</div>
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11}}>
                    <span style={{color:T.mute}}>평균 {fmtKRW(Math.round(avgPrice))}P</span>
                    <button onClick={()=>{ setTradeTarget(stock); setTab("trade"); }} style={{
                      background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,
                      color:T.sub,padding:"3px 10px",fontSize:11,cursor:"pointer",fontFamily:T.sans}}>거래</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TRADE TAB */}
        {tab==="trade" && (
          <BattleTradePanel
            portfolio={myPortfolio}
            setPortfolio={setMyPortfolio}
          />
        )}
      </div>
    </div>
  );
}

// ── Battle Trade Panel (inline) ───────────────────────────
function BattleTradePanel({ portfolio, setPortfolio }) {
  const [market, setMarket]   = useState("KR");
  const [selected, setSelected] = useState(null);
  const [qty, setQty]         = useState(1);
  const [type, setType]       = useState("buy");
  const [done, setDone]       = useState(null);

  const stocks = market==="KR" ? KR_STOCKS : US_STOCKS;

  if (done) return (
    <div style={{textAlign:"center",padding:"32px 0"}}>
      <div style={{fontSize:48,marginBottom:12}}>{done==="buy"?"📈":"📉"}</div>
      <div style={{fontSize:18,fontWeight:900,color:T.text,marginBottom:6}}>
        {done==="buy"?"매수 완료!":"매도 완료!"}
      </div>
      <div style={{fontSize:13,color:T.sub,marginBottom:20}}>
        {selected?.name} {qty}주 {done==="buy"?"매수":"매도"}
      </div>
      <button onClick={()=>{ setDone(null); setSelected(null); }} style={{
        padding:"10px 24px",borderRadius:12,border:"none",
        background:T.accent,color:"#fff",fontFamily:T.sans,fontWeight:700,fontSize:14,cursor:"pointer"}}>
        계속 거래
      </button>
    </div>
  );

  if (selected) {
    const unitPrice = selected.isUSD ? selected.price*1360 : selected.price;
    const total     = unitPrice*qty;
    const holding   = portfolio.holdings[selected.code];

    function execute() {
      if (type==="buy") {
        if (total>portfolio.points){ alert("포인트 부족"); return; }
        setPortfolio(p=>{
          const h={...p.holdings};
          const cur=h[selected.code]||{qty:0,avgPrice:0,stock:selected};
          const nq=cur.qty+qty;
          h[selected.code]={qty:nq,avgPrice:(cur.avgPrice*cur.qty+unitPrice*qty)/nq,stock:selected};
          return {points:p.points-total,holdings:h,trades:[...p.trades,{type:"buy",code:selected.code,name:selected.name,qty,price:unitPrice,at:new Date()}]};
        });
        setDone("buy");
      } else {
        if (!holding||holding.qty<qty){ alert("보유 수량 부족"); return; }
        setPortfolio(p=>{
          const h={...p.holdings};
          const nq=h[selected.code].qty-qty;
          if(nq===0) delete h[selected.code]; else h[selected.code]={...h[selected.code],qty:nq};
          return {points:p.points+total,holdings:h,trades:[...p.trades,{type:"sell",code:selected.code,name:selected.name,qty,price:unitPrice,at:new Date()}]};
        });
        setDone("sell");
      }
    }

    return (
      <div>
        <button onClick={()=>setSelected(null)} style={{
          background:"transparent",border:"none",color:T.sub,fontSize:13,
          cursor:"pointer",marginBottom:12,padding:0,fontFamily:T.sans}}>← 종목 목록</button>
        <div style={{background:T.card2,borderRadius:16,padding:14,marginBottom:12,border:`1px solid ${T.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <div>
              <div style={{fontWeight:700,color:T.text,fontSize:15}}>{selected.name}</div>
              <div style={{fontSize:11,color:T.sub}}>{selected.code}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:17,fontWeight:700,color:T.text,fontFamily:T.mono}}>
                {selected.isUSD?`$${selected.price.toFixed(2)}`:`${selected.price.toLocaleString()}원`}
              </div>
              <div style={{fontSize:12,color:selected.change>=0?T.green:T.red,fontWeight:600}}>
                {selected.change>=0?"+":""}{selected.change}%
              </div>
            </div>
          </div>
          {selected.isUSD&&<div style={{fontSize:10,color:T.amber,background:T.amberBg,
            borderRadius:8,padding:"4px 8px"}}>💱 환율 1,360원 적용</div>}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {[["buy","매수",T.green],["sell","매도",T.red]].map(([t,l,c])=>(
            <button key={t} onClick={()=>setType(t)} style={{
              flex:1,padding:"10px 0",borderRadius:12,border:`1.5px solid ${type===t?c:T.border}`,
              background:type===t?`${c}12`:"transparent",
              color:type===t?c:T.sub,fontFamily:T.sans,fontWeight:700,fontSize:14,cursor:"pointer"}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{background:T.card2,borderRadius:14,padding:14,marginBottom:12,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:11,color:T.sub,marginBottom:8}}>수량</div>
          <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:12}}>
            <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{
              width:40,height:40,borderRadius:12,border:`1px solid ${T.border}`,
              background:T.bg,color:T.text,fontSize:20,cursor:"pointer"}}>−</button>
            <div style={{flex:1,textAlign:"center",fontSize:24,fontWeight:900,color:T.text,fontFamily:T.mono}}>{qty}</div>
            <button onClick={()=>setQty(q=>q+1)} style={{
              width:40,height:40,borderRadius:12,border:`1px solid ${T.border}`,
              background:T.bg,color:T.text,fontSize:20,cursor:"pointer"}}>+</button>
          </div>
          <Div/>
          <div style={{marginTop:10,display:"flex",justifyContent:"space-between",fontSize:13}}>
            <span style={{color:T.sub}}>총 금액</span>
            <span style={{color:T.text,fontWeight:700,fontFamily:T.mono}}>{fmtKRW(Math.round(total))}P</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginTop:4}}>
            <span style={{color:T.mute}}>가용 포인트</span>
            <span style={{color:T.sub,fontFamily:T.mono}}>{fmtKRW(portfolio.points)}P</span>
          </div>
          {holding&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginTop:4}}>
            <span style={{color:T.mute}}>보유</span>
            <span style={{color:T.green,fontFamily:T.mono}}>{holding.qty}주</span>
          </div>}
        </div>
        <button onClick={execute} style={{
          width:"100%",padding:"14px 0",borderRadius:14,border:"none",
          background:type==="buy"?T.green:T.red,color:"#fff",
          fontFamily:T.sans,fontWeight:900,fontSize:15,cursor:"pointer",
          boxShadow:type==="buy"?"0 6px 20px rgba(34,199,122,0.3)":"0 6px 20px rgba(240,84,84,0.3)"}}>
          {type==="buy"?`${fmtKRW(Math.round(total))}P 매수`:"매도 실행"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{fontSize:12,fontWeight:700,color:T.sub,marginBottom:8}}>
        가용 포인트 <span style={{color:T.accentL,fontFamily:T.mono}}>{fmtKRW(portfolio.points)}P</span>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:10}}>
        {[["KR","🇰🇷"],["US","🇺🇸"]].map(([m,l])=>(
          <button key={m} onClick={()=>setMarket(m)} style={{
            flex:1,padding:"8px 0",borderRadius:12,border:"none",
            background:market===m?T.accent:T.card2,
            color:market===m?"#fff":T.sub,
            fontFamily:T.sans,fontWeight:700,fontSize:13,cursor:"pointer"}}>
            {l} {m==="KR"?"국내":"미국"}
          </button>
        ))}
      </div>
      {stocks.map((s,i)=>{
        const held=portfolio.holdings[s.code];
        return(
          <div key={s.code}>
            <div style={{padding:"11px 0",display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                  <span style={{fontWeight:700,color:T.text,fontSize:13}}>{s.name}</span>
                  {held&&<Chip color={T.green}>{held.qty}주</Chip>}
                  <Chip color={scoreColor(s.score)}>{s.score}점</Chip>
                </div>
                <div style={{fontSize:11,color:T.sub,fontFamily:T.mono}}>
                  {s.isUSD?`$${s.price.toFixed(2)}`:`${s.price.toLocaleString()}원`}
                  <span style={{color:s.change>=0?T.green:T.red,marginLeft:6}}>{s.change>=0?"+":""}{s.change}%</span>
                </div>
              </div>
              <div style={{display:"flex",gap:5}}>
                <button onClick={()=>{ setSelected(s); setQty(1); setType("buy"); setDone(null); }} style={{
                  padding:"6px 10px",borderRadius:9,border:"none",
                  background:T.greenBg,color:T.green,fontFamily:T.sans,fontWeight:700,fontSize:11,cursor:"pointer"}}>매수</button>
                {held&&<button onClick={()=>{ setSelected(s); setQty(1); setType("sell"); setDone(null); }} style={{
                  padding:"6px 10px",borderRadius:9,border:"none",
                  background:T.redBg,color:T.red,fontFamily:T.sans,fontWeight:700,fontSize:11,cursor:"pointer"}}>매도</button>}
              </div>
            </div>
            {i<stocks.length-1&&<Div/>}
          </div>
        );
      })}
    </div>
  );
}

// ── Screener ──────────────────────────────────────────────
function ScreenerScreen({ watchlist, setWatchlist, setTradeTarget, setScreen }) {
  const [market, setMarket]       = useState("KR");
  const [perMax, setPerMax]       = useState(20);
  const [pbrMax, setPbrMax]       = useState(2);
  const [evMax, setEvMax]         = useState(12);
  const [sort, setSort]           = useState("score");
  const [showFilter, setShowFilter] = useState(false);
  const stocks = market==="KR" ? KR_STOCKS : US_STOCKS;
  const filtered = stocks
    .filter(s=>s.per<=perMax&&s.pbr<=pbrMax&&s.ev<=evMax)
    .sort((a,b)=>sort==="score"?b.score-a.score:sort==="per"?a.per-b.per:a.pbr-b.pbr);
  const inWL = code=>watchlist.some(w=>w.code===code);
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{padding:"14px 16px 0",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div>
            <div style={{fontSize:17,fontWeight:900,color:T.text}}>저평가 스크리너</div>
            <div style={{fontSize:11,color:T.sub}}>{filtered.length}개 종목</div>
          </div>
          <button onClick={()=>setShowFilter(v=>!v)} style={{
            width:36,height:36,borderRadius:12,border:`1px solid ${showFilter?T.accent:T.border}`,
            background:showFilter?T.accentBg:"transparent",color:showFilter?T.accent:T.sub,fontSize:16,cursor:"pointer"}}>⚙</button>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:showFilter?10:12}}>
          {[["KR","🇰🇷 국내"],["US","🇺🇸 미국"]].map(([m,l])=>(
            <button key={m} onClick={()=>setMarket(m)} style={{
              flex:1,padding:"9px 0",borderRadius:12,border:"none",
              background:market===m?T.accent:T.card2,color:market===m?"#fff":T.sub,
              fontFamily:T.sans,fontWeight:700,fontSize:13,cursor:"pointer"}}>{l}</button>
          ))}
        </div>
        {showFilter&&(
          <div style={{background:T.card2,borderRadius:14,padding:"14px 14px 10px",marginBottom:10,border:`1px solid ${T.border}`}}>
            {[{label:"PER",val:perMax,set:setPerMax,max:50,easy:"주가÷순이익"},
              {label:"PBR",val:pbrMax,set:setPbrMax,max:5,step:0.1,easy:"주가÷순자산"},
              {label:"EV/EBITDA",val:evMax,set:setEvMax,max:30,step:0.5,easy:"기업가치÷영업이익"}].map(f=>(
              <div key={f.label} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,color:T.text,fontWeight:600}}>{f.label} <span style={{color:T.sub,fontWeight:400,fontSize:10}}>{f.easy}</span></span>
                  <span style={{fontSize:12,fontWeight:700,color:T.accent,fontFamily:T.mono}}>{f.val}</span>
                </div>
                <input type="range" min={f.step||1} max={f.max} step={f.step||1}
                  value={f.val} onChange={e=>f.set(parseFloat(e.target.value))}
                  style={{width:"100%",accentColor:T.accent}}/>
              </div>
            ))}
            <div style={{display:"flex",gap:6}}>
              {[["score","점수순"],["per","PER순"],["pbr","PBR순"]].map(([k,l])=>(
                <button key={k} onClick={()=>setSort(k)} style={{
                  padding:"6px 12px",borderRadius:20,border:`1px solid ${sort===k?T.accent:T.border}`,
                  background:sort===k?T.accentBg:"transparent",color:sort===k?T.accentL:T.sub,
                  fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:T.sans}}>{l}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 16px 4px"}}>
        {filtered.map((s,i)=>(
          <div key={s.code}>
            <div style={{padding:"13px 0",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}
              onClick={()=>{ setTradeTarget(s); setScreen("trade"); }}>
              <div style={{flexShrink:0,width:44,height:44,borderRadius:"50%",
                border:`2px solid ${scoreColor(s.score)}`,background:`${scoreColor(s.score)}12`,
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                <div style={{fontSize:13,fontWeight:900,color:scoreColor(s.score),fontFamily:T.mono,lineHeight:1}}>{s.score}</div>
                <div style={{fontSize:7,color:scoreColor(s.score)}}>점</div>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                  <span style={{fontWeight:700,color:T.text,fontSize:14}}>{s.name}</span>
                </div>
                <div style={{fontSize:11,color:T.sub,fontFamily:T.mono}}>PER {s.per}x · PBR {s.pbr}x · {s.sector}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:T.mono}}>
                  {s.isUSD?`$${s.price.toFixed(2)}`:`${s.price.toLocaleString()}`}
                </div>
                <div style={{fontSize:12,color:s.change>=0?T.green:T.red,fontWeight:600}}>
                  {s.change>=0?"+":""}{s.change}%
                </div>
              </div>
              <button onClick={e=>{ e.stopPropagation(); inWL(s.code)?setWatchlist(w=>w.filter(x=>x.code!==s.code)):setWatchlist(w=>[...w,s]); }}
                style={{flexShrink:0,width:32,height:32,borderRadius:10,
                  border:`1px solid ${inWL(s.code)?T.amber:T.border}`,
                  background:inWL(s.code)?T.amberBg:"transparent",
                  color:inWL(s.code)?T.amber:T.mute,fontSize:16,cursor:"pointer"}}>
                {inWL(s.code)?"★":"☆"}
              </button>
            </div>
            {i<filtered.length-1&&<Div/>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Simple screens (watchlist, more) ──────────────────────
function WatchlistScreen({ watchlist, setWatchlist, setTradeTarget, setScreen }) {
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{padding:"14px 16px 12px",flexShrink:0}}>
        <div style={{fontSize:17,fontWeight:900,color:T.text}}>관심 종목 <span style={{fontSize:13,color:T.sub,fontWeight:400}}>{watchlist.length}개</span></div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 16px"}}>
        {watchlist.length===0?(
          <div style={{textAlign:"center",paddingTop:60}}>
            <div style={{fontSize:48,marginBottom:12}}>☆</div>
            <div style={{color:T.sub,fontSize:14}}>관심 종목이 없어요</div>
            <div style={{color:T.mute,fontSize:12,marginTop:4}}>스크리너에서 ☆을 눌러 추가하세요</div>
          </div>
        ):watchlist.map((s,i)=>(
          <div key={s.code}>
            <div style={{padding:"13px 0",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}
              onClick={()=>{ setTradeTarget(s); setScreen("trade"); }}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{fontWeight:700,color:T.text,fontSize:14}}>{s.name}</span>
                  <Chip color={scoreColor(s.score)}>{s.score}점</Chip>
                </div>
                <div style={{fontSize:11,color:T.sub,fontFamily:T.mono}}>PER {s.per}x · PBR {s.pbr}x · {s.sector}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:T.mono}}>
                  {s.isUSD?`$${s.price.toFixed(2)}`:`${s.price.toLocaleString()}`}
                </div>
                <div style={{fontSize:12,color:s.change>=0?T.green:T.red,fontWeight:600}}>{s.change>=0?"+":""}{s.change}%</div>
              </div>
              <button onClick={e=>{ e.stopPropagation(); setWatchlist(w=>w.filter(x=>x.code!==s.code)); }}
                style={{width:30,height:30,borderRadius:8,border:`1px solid ${T.border}`,
                  background:"transparent",color:T.mute,fontSize:14,cursor:"pointer"}}>✕</button>
            </div>
            {i<watchlist.length-1&&<Div/>}
          </div>
        ))}
      </div>
    </div>
  );
}

function MoreScreen({ user, myPortfolio, setMyPortfolio, setLoggedIn }) {
  return (
    <div style={{height:"100%",overflowY:"auto"}}>
      <div style={{padding:"14px 16px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,
          background:T.card2,borderRadius:16,padding:"14px 14px",border:`1px solid ${T.border}`}}>
          <div style={{width:42,height:42,borderRadius:"50%",
            background:`linear-gradient(135deg,${T.accent},${T.purple})`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:20,fontWeight:900,color:"#fff",flexShrink:0}}>{user.avatar}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,color:T.text,fontSize:14}}>{user.name}</div>
            <div style={{fontSize:11,color:T.sub}}>{user.email}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:T.sub}}>포인트</div>
            <div style={{fontSize:14,fontWeight:700,color:T.accent,fontFamily:T.mono}}>{fmtKRW(myPortfolio.points)}P</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          <button onClick={()=>setMyPortfolio(p=>({...p,points:p.points+100_000}))} style={{
            flex:1,padding:"10px 0",borderRadius:12,border:`1px solid ${T.border}`,
            background:T.accentBg,color:T.accentL,fontFamily:T.sans,fontWeight:700,fontSize:12,cursor:"pointer"}}>
            💰 +10만P 충전
          </button>
          <button onClick={()=>setLoggedIn(false)} style={{
            flex:1,padding:"10px 0",borderRadius:12,border:`1px solid ${T.border}`,
            background:T.redBg,color:T.red,fontFamily:T.sans,fontWeight:700,fontSize:12,cursor:"pointer"}}>
            로그아웃
          </button>
        </div>
        {[
          {id:1,type:"공지",title:"Jumisa 베타 서비스 오픈",date:"05.12",content:"초기 포인트 1,000,000P 지급됩니다."},
          {id:2,type:"공지",title:"저평가 점수 산출 기준",date:"05.10",content:"PER(30%)+PBR(30%)+EV/EBITDA(25%)+성장률(15%)"},
          {id:3,type:"FAQ",title:"대결 포인트는 어떻게 지급되나요?",date:"05.08",content:"방장이 설정한 시작 포인트를 모든 참가자가 동일하게 받습니다. 대결이 시작되면 추가 충전은 불가합니다."},
          {id:4,type:"FAQ",title:"순위는 어떻게 결정되나요?",date:"05.05",content:"대결 기간 종료 시점의 총 자산(현금+주식평가액) 기준 수익률로 순위를 결정합니다."},
        ].map(n=>(
          <div key={n.id} style={{background:T.card2,borderRadius:14,padding:"13px 14px",
            marginBottom:8,border:`1px solid ${T.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <Chip color={n.type==="FAQ"?T.amber:T.accent}>{n.type}</Chip>
              <span style={{fontSize:13,fontWeight:600,color:T.text}}>{n.title}</span>
            </div>
            <div style={{fontSize:11,color:T.sub,lineHeight:1.6}}>{n.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginScreen({ setLoggedIn, setUser }) {
  const [id, setPw_id]  = useState("");
  const [pw, setPw]     = useState("");
  const [avatar, setAv] = useState("🐂");
  const avs = ["🐂","🦅","🐻","🦁","🦊","🐯","🦈","🦋"];
  const go = () => {
    if(!id||!pw) return;
    setUser({name:id, email:`${id}@jumisa.kr`, avatar});
    setLoggedIn(true);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",padding:"0 24px"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:38,fontWeight:900,color:T.accent,letterSpacing:-1}}>JUMISA</div>
          <div style={{fontSize:12,color:T.sub,marginTop:4}}>주식에 미친 사람들 · 대결판 📈⚔️</div>
        </div>
        {/* Avatar pick */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:T.sub,marginBottom:8}}>내 아바타 선택</div>
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>
            {avs.map(a=>(
              <button key={a} onClick={()=>setAv(a)} style={{
                width:40,height:40,borderRadius:12,border:`2px solid ${avatar===a?T.accent:T.border}`,
                background:avatar===a?T.accentBg:T.card2,fontSize:20,cursor:"pointer"}}>
                {a}
              </button>
            ))}
          </div>
        </div>
        {[{label:"닉네임",val:id,set:setPw_id,type:"text",ph:"닉네임을 입력하세요"},
          {label:"비밀번호",val:pw,set:setPw,type:"password",ph:"비밀번호"}].map(f=>(
          <div key={f.label} style={{marginBottom:10}}>
            <div style={{fontSize:11,color:T.sub,marginBottom:6}}>{f.label}</div>
            <input type={f.type} value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
              onKeyDown={e=>e.key==="Enter"&&go()}
              style={{width:"100%",boxSizing:"border-box",background:T.card2,
                border:`1px solid ${T.border}`,borderRadius:12,color:T.text,
                padding:"12px 14px",fontSize:14,fontFamily:T.sans}}/>
          </div>
        ))}
        <button onClick={go} style={{
          width:"100%",padding:"14px 0",borderRadius:14,border:"none",
          background:`linear-gradient(135deg,${T.accent},${T.purple})`,
          color:"#fff",fontFamily:T.sans,fontWeight:900,fontSize:15,cursor:"pointer",marginTop:4,
          boxShadow:"0 6px 20px rgba(79,142,247,0.3)"}}>대결 시작하기 ⚔️</button>
        <div style={{display:"flex",gap:8,marginTop:8}}>
          {[["🟡","#FEE500","#000","카카오"],["🟢","#03C75A","#fff","네이버"]].map(([e,bg,c,l])=>(
            <button key={l} onClick={()=>{ setUser({name:"소셜유저",email:"social@jumisa.kr",avatar:"🦊"}); setLoggedIn(true); }}
              style={{flex:1,padding:"11px 0",borderRadius:12,border:"none",
                background:bg,color:c,fontFamily:T.sans,fontWeight:700,fontSize:13,cursor:"pointer"}}>
              {e} {l}
            </button>
          ))}
        </div>
        <div style={{marginTop:12,background:T.accentBg,borderRadius:12,padding:"10px 14px",
          fontSize:11,color:T.accentL,textAlign:"center"}}>
          🎁 가입 즉시 <b>1,000,000P</b> + 대결방 자동 참가!
        </div>
      </div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────
const NAV = [
  { id:"screener", icon:"🔍", label:"스크리너"  },
  { id:"battle",   icon:"⚔️",  label:"대결"      },
  { id:"watchlist",icon:"⭐", label:"관심종목"  },
  { id:"more",     icon:"☰",  label:"더보기"    },
];

// ── App ───────────────────────────────────────────────────
export default function App() {
  const [loggedIn,    setLoggedIn]    = useState(false);
  const [user,        setUser]        = useState({name:"투자자",email:"user@jumisa.kr",avatar:"🐂"});
  const [screen,      setScreen]      = useState("screener");
  const [watchlist,   setWatchlist]   = useState([]);
  const [tradeTarget, setTradeTarget] = useState(null);

  // Battle state
  const [battleView,  setBattleView]  = useState("lobby"); // lobby | create | room | active
  const [room,        setRoom]        = useState(null);
  const [myPortfolio, setMyPortfolio] = useState({ points:INIT_POINTS, holdings:{}, trades:[] });

  function startBattle() {
    setBattleView("active");
  }

  const renderScreen = () => {
    if (!loggedIn) return <LoginScreen setLoggedIn={setLoggedIn} setUser={setUser}/>;
    if (screen==="screener") return <ScreenerScreen {...{watchlist,setWatchlist,setTradeTarget,setScreen}}/>;
    if (screen==="watchlist") return <WatchlistScreen {...{watchlist,setWatchlist,setTradeTarget,setScreen}}/>;
    if (screen==="more") return <MoreScreen {...{user,myPortfolio,setMyPortfolio,setLoggedIn}}/>;
    if (screen==="battle") {
      if (battleView==="lobby") return <BattleLobbyScreen {...{myName:user.name,myAvatar:user.avatar,room,setRoom,setBattleView}}/>;
      if (battleView==="create") return <CreateRoomScreen {...{myName:user.name,myAvatar:user.avatar,setBattleView,setRoom}}/>;
      if (battleView==="room")   return <RoomWaitingScreen {...{room,myName:user.name,myAvatar:user.avatar,setBattleView,startBattle}}/>;
      if (battleView==="active") return <ActiveBattleScreen {...{myPortfolio,setMyPortfolio,myName:user.name,myAvatar:user.avatar,room,setBattleView,setTradeTarget,setScreen}}/>;
    }
    return null;
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      background:"#04060f",fontFamily:T.sans}}>
      <div style={{width:390,height:812,borderRadius:50,overflow:"hidden",
        boxShadow:`0 0 0 10px #181f30,0 0 0 13px #0c1020,0 40px 100px rgba(0,0,0,0.85)`,
        display:"flex",flexDirection:"column",background:T.bg}}>

        {/* Status bar */}
        <div style={{height:48,flexShrink:0,display:"flex",alignItems:"flex-end",
          justifyContent:"space-between",padding:"0 28px 8px",background:T.bg}}>
          <span style={{fontSize:13,fontWeight:700,color:T.text}}>9:41</span>
          <div style={{width:110,height:18,background:"#0c1020",borderRadius:20}}/>
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            <span style={{fontSize:11,color:T.text}}>●●●</span>
            <span style={{fontSize:11}}>📶</span>
            <span style={{fontSize:11}}>🔋</span>
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {renderScreen()}
        </div>

        {/* Bottom Nav */}
        {loggedIn && (
          <div style={{height:68,flexShrink:0,background:T.card,borderTop:`1px solid ${T.border}`,
            display:"flex",alignItems:"center",paddingTop:4}}>
            {NAV.map(n=>(
              <button key={n.id} onClick={()=>setScreen(n.id)} style={{
                flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                background:"transparent",border:"none",cursor:"pointer",padding:"4px 0"}}>
                <div style={{width:40,height:28,borderRadius:10,
                  background:screen===n.id?T.accentBg:"transparent",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:n.id==="battle"?18:15}}>
                  {n.icon}
                </div>
                <span style={{fontSize:9,fontWeight:screen===n.id?700:400,
                  color:screen===n.id?T.accent:T.mute}}>{n.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Home bar */}
        <div style={{height:22,flexShrink:0,background:T.bg,
          display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:120,height:4,background:T.border,borderRadius:2}}/>
        </div>
      </div>
    </div>
  );
}
