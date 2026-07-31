import { useState, useEffect, useCallback } from "react";
import { getFounderIntel } from "../services/founderIntelClient";
import { signOut } from "../services/authClient";
import { clearDiscoveryIdentity } from "../services/discoveryIdentity";
import { clearLastVisitedPage } from "../services/lastVisitedPage";

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const C = {
  bg:      "#0B1929", mid:    "#112238", card:   "#172F47",
  border:  "#1E3D58", border2:"#2A5070",
  amber:   "#F5A623", gold:   "#FFD700", teal:   "#3ECFCF",
  white:   "#EEF4FB", muted:  "#7AAABF", danger: "#E05C5C",
  safe:    "#4CAF82", text:   "#C8DCED",
};

// ── KEYFRAMES (injected once) ─────────────────────────────────────────────────
const CSS = `
  @keyframes sweep { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes pulse { 0%,100%{opacity:.7} 50%{opacity:1} }
  @keyframes fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width:6px; }
  ::-webkit-scrollbar-track { background: ${C.bg}; }
  ::-webkit-scrollbar-thumb { background: ${C.border2}; border-radius:3px; }
  select, input[type=text], textarea { outline:none; }
  input[type=range] { cursor:pointer; }
`;

// ── SHARK TANK CRITERIA ───────────────────────────────────────────────────────
const SHARK = [
  { id:"problem",  label:"Problem Urgency",    w:15, desc:"Is the problem visceral and immediately felt by a Shark?",
    fix:"Lead with the stranded-person image. Smoke signals. Road flares. SOS in safety-yellow clothes. Nobody looking. Make Sharks feel the gap before naming Lighthouse." },
  { id:"solution", label:"Solution Clarity",   w:12, desc:"Explain Lighthouse in 90 seconds flat.",
    fix:"One sentence: Lighthouse is a discovery system that helps organizations see the full human — not just the résumé — before making consequential hiring decisions." },
  { id:"market",   label:"Market Size",        w:12, desc:"TAM/SAM/SOM defined and defensible?",
    fix:"US hiring market: $200B+. AI in HR is growing fast. Define your slice: mid-market employers who care about quality-of-hire, not just speed-to-fill." },
  { id:"model",    label:"Business Model",     w:12, desc:"Revenue model clear and repeatable?",
    fix:"Placement revenue dividend — flat % triggered only by successful hire, paid through independent escrow. A Shark should be able to repeat it back in one sentence." },
  { id:"traction", label:"Traction",           w:15, desc:"Sessions run? Profiles generated? Revenue?",
    fix:"Biggest gap right now. Even 10 real sessions changes the Shark conversation. Deploy → run sessions → come back with participant evidence." },
  { id:"moat",     label:"Competitive Moat",   w:10, desc:"What stops LinkedIn or Workday from copying this?",
    fix:"The Soul Kernel + participant authority architecture = a values moat. Hard to copy because it requires genuine commitment to human complexity, not efficiency. That's not a feature — it's a constraint they won't accept." },
  { id:"founder",  label:"Founder Story",      w:10, desc:"Does Paul's story make this mission inevitable?",
    fix:"You are the person this was built for. Method-consistent identity across diverse domains — the résumé couldn't hold it. Lighthouse exists because you lived this gap." },
  { id:"ask",      label:"The Ask",            w:8,  desc:"Investment amount and use of funds defined?",
    fix:"Not ready to nail down yet — but start thinking. What does $X00K actually buy? First hire? Infrastructure? Partnerships? Specificity equals credibility." },
  { id:"demo",     label:"Demo Readiness",     w:8,  desc:"Can Alice run live in the room with a Shark?",
    fix:"Prototype is built. Deploy it. A live Alice conversation is worth more than any slide. The Sharks need to feel what it's like to be discovered." },
  { id:"exit",     label:"Exit Potential",     w:8,  desc:"Can Sharks see an acquisition or scale path?",
    fix:"Name the acquirers: Workday, SAP SuccessFactors, LinkedIn Talent, Oracle HCM. They'd want this once traction is proven. Make the exit logic explicit." },
];

// ── PRODUCT ITEMS ─────────────────────────────────────────────────────────────
const PRODUCT_ITEMS = [
  { id:"landing",  label:"Marketing Landing Page",           note:"Hero copy integration pending" },
  { id:"alice",    label:"Alice Discovery Engine (/discover)",note:"Core engine functional" },
  { id:"backend",  label:"Secure Serverless Backend",        note:"API key server-side on Vercel config" },
  { id:"hero",     label:"Hero Copy",                        note:"Direction locked — final draft + integration needed" },
  { id:"deploy",   label:"Vercel Deployment (live URL)",     note:"Package ready — needs to go live" },
  { id:"domain",   label:"Custom Domain",                    note:"Not yet configured" },
  { id:"sessions", label:"First Real Participant Sessions",  note:"Blocked on deployment" },
  { id:"profile1", label:"First Published HCP Profile",     note:"Follows first sessions" },
];

const INITIAL_PRODUCT = {
  landing:"built", alice:"built", backend:"built",
  hero:"in-progress", deploy:"pending", domain:"pending",
  sessions:"pending", profile1:"pending"
};

// ── SEED TODOS ────────────────────────────────────────────────────────────────
const SEED_TODOS = [
  { id:1, pri:"urgent", label:"Finalize hero copy + integrate into landing page", done:false },
  { id:2, pri:"urgent", label:"Deploy to Vercel — get a real public URL",         done:false },
  { id:3, pri:"urgent", label:"Run first 3 real discovery sessions",              done:false },
  { id:4, pri:"high",   label:"Build Regulatory Matrix spreadsheet",              done:false },
  { id:5, pri:"high",   label:"Draft 'How Lighthouse Protects HRI' public page",  done:false },
  { id:6, pri:"high",   label:"Map Lighthouse features to NIST AI RMF functions", done:false },
  { id:7, pri:"medium", label:"Define Shark Tank ask — amount + use of funds",    done:false },
  { id:8, pri:"medium", label:"Draft Representation Integrity White Paper",       done:false },
  { id:9, pri:"medium", label:"Voluntary Responsible AI Position Statement",      done:false },
  { id:10,pri:"low",    label:"Configure custom domain",                          done:false },
];

const INITIAL_SHARK = { problem:60,solution:50,market:20,model:55,traction:5,moat:60,founder:70,ask:5,demo:20,exit:20 };

const INITIAL_STATE = {
  shark: INITIAL_SHARK,
  product: INITIAL_PRODUCT,
  disc: { sessions:0, participants:0, profiles:0 },
  todos: SEED_TODOS,
  nextId: 11,
  complianceScore: 8,
  threatScore: 0,
  commsScore: 30,
  notes: "",
};

// ── STATION DEFINITIONS ───────────────────────────────────────────────────────
const STATIONS = [
  { id:"compliance",   icon:"⚖",  color:C.teal,   label:"Compliance",          sub:"Gold Standard posture" },
  { id:"threat",       icon:"🛡",  color:C.danger,  label:"Threat Deterrent",   sub:"Standing by" },
  { id:"product",      icon:"⚡",  color:C.amber,   label:"Product & Site",     sub:"Prototype progress" },
  { id:"discovery",    icon:"◉",  color:C.safe,    label:"Discovery",           sub:"Sessions + participants" },
  { id:"investor",     icon:"★",  color:C.gold,    label:"Investor Readiness",  sub:"Shark Tank meter" },
  { id:"competitive",  icon:"◎",  color:C.teal,    label:"Competitive Intel",   sub:"AI landscape analysis" },
  { id:"ops",          icon:"⊞",  color:C.amber,   label:"Operations",          sub:"Todos + open threads" },
  { id:"comms",        icon:"◈",  color:C.safe,    label:"Communications",      sub:"Copy + messaging" },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
const PRI_C: Record<string, string> = { urgent:C.danger, high:C.amber, medium:C.teal, low:C.muted };
const ST_C: Record<string, string>  = { built:C.safe, "in-progress":C.amber, pending:C.muted, blocked:C.danger };
const PRI_O: Record<string, number> = { urgent:0, high:1, medium:2, low:3 };

const STORAGE_KEY = "lighthouse.founderDashboard.v1";

function Badge({ label, color, sm }: { label: string; color: string; sm?: boolean }) {
  const fs = sm ? 10 : 11;
  return (
    <span style={{
      background: color+"1A", color, border:`1px solid ${color}44`,
      borderRadius:4, padding:sm?"1px 6px":"2px 8px",
      fontSize:fs, fontWeight:700, letterSpacing:".06em",
      textTransform:"uppercase", whiteSpace:"nowrap", flexShrink:0
    }}>{label}</span>
  );
}

function MiniBar({ value, color, h=4 }: { value: number; color: string; h?: number }) {
  return (
    <div style={{ height:h, borderRadius:h/2, background:C.border, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${value}%`, background:color, borderRadius:h/2, transition:"width .5s ease" }}/>
    </div>
  );
}

function Slider({ value, onChange, color=C.amber }: { value: number; onChange: (v: number) => void; color?: string }) {
  return (
    <input type="range" min={0} max={100} step={5} value={value}
      onChange={e=>onChange(+e.target.value)}
      style={{ width:"100%", accentColor:color }}/>
  );
}

// ── BEACON METER (circular SVG readiness gauge) ───────────────────────────────
function BeaconMeter({ score }: { score: number }) {
  const r=42, circ=2*Math.PI*r, dash=circ*(score/100);
  const color = score>=75?C.gold:score>=50?C.teal:score>=25?C.amber:C.muted;
  const label = score>=75?"Launch Ready":score>=50?"In Build":score>=25?"Early Stage":"Just Started";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:18 }}>
      <div style={{ position:"relative", width:100, height:100, flexShrink:0 }}>
        <svg width={100} height={100} style={{ transform:"rotate(-90deg)" }}>
          <circle cx={50} cy={50} r={r} fill="none" stroke={C.border} strokeWidth={7}/>
          <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={7}
            strokeDasharray={`${dash} ${circ-dash}`} strokeLinecap="round"
            style={{ transition:"stroke-dasharray .8s ease", filter:`drop-shadow(0 0 6px ${color}88)` }}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <span style={{ color, fontWeight:900, fontSize:22, lineHeight:1 }}>{score}%</span>
          <span style={{ color:C.muted, fontSize:9, letterSpacing:".08em", marginTop:1 }}>READY</span>
        </div>
      </div>
      <div>
        <div style={{ color:C.white, fontWeight:900, fontSize:19, lineHeight:1.2, letterSpacing:"-.01em" }}>Mission Readiness</div>
        <div style={{ marginTop:6 }}><Badge label={label} color={color}/></div>
        <div style={{ color:C.muted, fontSize:12, marginTop:6, lineHeight:1.5 }}>
          {score<25?"Foundation is being laid. Every station needs attention."
           :score<50?"Building momentum. Key pillars taking shape."
           :score<75?"Strong base. Execution is the priority now."
           :score<90?"Near launch-ready. Close the remaining gaps."
           :"Lighthouse is live and operational."}
        </div>
      </div>
    </div>
  );
}

// ── STATION CARD ──────────────────────────────────────────────────────────────
function StationCard({ s, score, active, onClick, badge }: { s: typeof STATIONS[number]; score: number; active: boolean; onClick: () => void; badge?: number | null }) {
  return (
    <div onClick={onClick} style={{
      background: active ? s.color+"14" : C.card,
      border: `2px solid ${active ? s.color : C.border}`,
      borderRadius:12, padding:"15px 16px", cursor:"pointer",
      transition:"all .18s", animation:"fadein .3s ease"
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <span style={{ fontSize:20, lineHeight:1 }}>{s.icon}</span>
        {badge!=null && badge>0 &&
          <span style={{ background:C.danger, color:"#fff", borderRadius:9, padding:"1px 7px", fontSize:10, fontWeight:800 }}>{badge}</span>
        }
      </div>
      <div style={{ color:s.color, fontWeight:800, fontSize:13, letterSpacing:".02em", marginBottom:2 }}>{s.label}</div>
      <div style={{ color:C.muted, fontSize:11, marginBottom:10 }}>{s.sub}</div>
      <MiniBar value={score} color={s.color}/>
      <div style={{ color:score>=70?C.safe:score>=35?C.amber:C.muted, fontSize:11, fontWeight:700, textAlign:"right", marginTop:3 }}>{score}%</div>
    </div>
  );
}

// ── PANEL: COMPLIANCE ─────────────────────────────────────────────────────────
function CompliancePanel({ score, setScore }: { score: number; setScore: (updater: (n: number) => number) => void }) {
  const REGS: [string, string, string, string][] = [
    ["Colorado AI Act",       "IN EFFECT",  C.safe,   "Excellent alignment — participant review, correction, evidence traceability built in."],
    ["EEOC AI Guidance",      "ACTIVE",     C.amber,  "Lighthouse asks 'Have we represented this human fairly?' — not 'Who should we hire?'"],
    ["FTC AI Enforcement",    "ACTIVE",     C.amber,  "Avoid 'unbiased.' Use 'participant-authorized,' 'evidence-linked,' 'correctable.'"],
    ["Illinois AI Law",       "ACTIVE",     C.muted,  "Transparency + participant awareness already built in."],
    ["NYC AEDT Rules",        "ACTIVE",     C.amber,  "Voluntary transparency page = competitive advantage before this spreads."],
    ["California AI Guidance","ACTIVE",     C.amber,  "Keep reinforcing: Humans decide. Lighthouse helps people become more accurately understood."],
    ["NIST AI RMF",           "VOLUNTARY",  C.teal,   "Publish a Lighthouse Human Representation Integrity Profile mapped to RMF functions."],
  ];
  return (
    <div style={{ animation:"fadein .3s ease" }}>
      <div style={{ background:C.bg, border:`1px solid ${C.teal}33`, borderRadius:10, padding:"16px 18px", marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={{ color:C.white, fontWeight:700, fontSize:14 }}>Gold Standard Posture</span>
          <span style={{ color:C.teal, fontWeight:900, fontSize:22 }}>{score}%</span>
        </div>
        <MiniBar value={score} color={C.teal} h={8}/>
        <div style={{ marginTop:12 }}>
          <div style={{ color:C.muted, fontSize:11, marginBottom:6 }}>Sync from Compliance Agent</div>
          <Slider value={score} onChange={(v) => setScore(() => v)} color={C.teal}/>
        </div>
        <div style={{ color:C.muted, fontSize:12, marginTop:10, lineHeight:1.6 }}>
          Open the Lighthouse Compliance Officer agent to manage tasks, approve proposed actions, and run AI-generated regulatory briefs.
        </div>
      </div>
      <div style={{ color:C.teal, fontSize:11, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", marginBottom:8 }}>Active Watch List</div>
      {REGS.map(([name,status,color,note],i)=>(
        <div key={i} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"11px 14px", marginBottom:7 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:4 }}>
            <span style={{ color:C.white, fontSize:13, fontWeight:600, flex:1 }}>{name}</span>
            <Badge label={status} color={color} sm/>
          </div>
          <div style={{ color:C.muted, fontSize:11, lineHeight:1.5 }}>{note}</div>
        </div>
      ))}
    </div>
  );
}

// ── PANEL: THREAT DETERRENT ───────────────────────────────────────────────────
function ThreatPanel() {
  return (
    <div style={{ animation:"fadein .3s ease", textAlign:"center", padding:"40px 20px" }}>
      <div style={{ fontSize:48, marginBottom:16, animation:"pulse 2s ease infinite" }}>🛡</div>
      <div style={{ color:C.danger, fontWeight:800, fontSize:18, marginBottom:10 }}>Threat Deterrent Officer</div>
      <div style={{ color:C.muted, fontSize:13, lineHeight:1.8, maxWidth:420, margin:"0 auto 24px" }}>
        This station is armed and standing by. Once a Threat Deterrent Officer definition is added, it will be fully activated with threat classification, monitoring categories, response protocols, and an AI threat assessment interface.
      </div>
      <Badge label="Standing By — Definition Incoming" color={C.danger}/>
    </div>
  );
}

// ── PANEL: PRODUCT ────────────────────────────────────────────────────────────
function ProductPanel({ status, setStatus }: { status: Record<string, string>; setStatus: (updater: (s: Record<string, string>) => Record<string, string>) => void }) {
  const built = PRODUCT_ITEMS.filter(p=>status[p.id]==="built").length;
  const pct = Math.round((built/PRODUCT_ITEMS.length)*100);
  return (
    <div style={{ animation:"fadein .3s ease" }}>
      <div style={{ background:C.bg, border:`1px solid ${C.amber}33`, borderRadius:10, padding:"14px 18px", marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
          <span style={{ color:C.white, fontWeight:700 }}>Prototype Progress</span>
          <span style={{ color:C.amber, fontWeight:900, fontSize:22 }}>{pct}%</span>
        </div>
        <MiniBar value={pct} color={C.amber} h={8}/>
        <div style={{ color:C.muted, fontSize:12, marginTop:8 }}>
          {built} of {PRODUCT_ITEMS.length} components built.
          {status.deploy==="pending" ? " Deploy is the current critical path." : " Deployment is live."}
        </div>
      </div>
      {PRODUCT_ITEMS.map(item=>(
        <div key={item.id} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"11px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <div style={{ flex:1, minWidth:160 }}>
            <div style={{ color:C.white, fontSize:13, fontWeight:600 }}>{item.label}</div>
            <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>{item.note}</div>
          </div>
          <select value={status[item.id]} onChange={e=>setStatus(s=>({...s,[item.id]:e.target.value}))}
            style={{ background:ST_C[status[item.id]]+"18", color:ST_C[status[item.id]], border:`1px solid ${ST_C[status[item.id]]}44`, borderRadius:5, padding:"5px 9px", fontSize:11, fontWeight:700 }}>
            {["built","in-progress","pending","blocked"].map(v=>(
              <option key={v} value={v} style={{ background:C.card, color:C.text }}>{v.toUpperCase()}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

// ── PANEL: DISCOVERY ──────────────────────────────────────────────────────────
function DiscoveryPanel({ disc, setDisc }: { disc: Record<string, number>; setDisc: (updater: (d: Record<string, number>) => Record<string, number>) => void }) {
  const METRICS = [
    { key:"sessions",     label:"Discovery Sessions", color:C.safe },
    { key:"participants", label:"Total Participants",  color:C.teal },
    { key:"profiles",     label:"Profiles Generated",  color:C.amber },
  ];
  return (
    <div style={{ animation:"fadein .3s ease" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
        {METRICS.map(m=>(
          <div key={m.key} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"16px", textAlign:"center" }}>
            <div style={{ color:m.color, fontWeight:900, fontSize:38, lineHeight:1 }}>{disc[m.key]}</div>
            <div style={{ color:C.muted, fontSize:10, textTransform:"uppercase", letterSpacing:".04em", marginTop:4, lineHeight:1.3 }}>{m.label}</div>
            <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:12 }}>
              <button onClick={()=>setDisc(d=>({...d,[m.key]:Math.max(0,d[m.key]-1)}))}
                style={{ background:C.border, color:C.text, border:"none", borderRadius:5, width:28, height:28, fontWeight:700, cursor:"pointer", fontSize:16 }}>−</button>
              <button onClick={()=>setDisc(d=>({...d,[m.key]:d[m.key]+1}))}
                style={{ background:m.color, color:C.bg, border:"none", borderRadius:5, width:28, height:28, fontWeight:700, cursor:"pointer", fontSize:16 }}>+</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px" }}>
        <div style={{ color:C.safe, fontSize:11, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", marginBottom:8 }}>Discovery Intelligence</div>
        <div style={{ color:C.text, fontSize:13, lineHeight:1.75 }}>
          {disc.sessions===0
            ? "No sessions run yet. The first real participant session is the most important milestone between here and everything else. Deploy, run three sessions, listen hard. The system will tell you what to fix next."
            : disc.sessions<5
            ? `${disc.sessions} session${disc.sessions>1?"s":""} in. Signal gathering has begun. Patterns start emerging around 10 — keep going.`
            : disc.sessions<15
            ? `${disc.sessions} sessions in. You're starting to see patterns. Time to think about the first public profile — even one strong example changes the story.`
            : `${disc.sessions} sessions — meaningful discovery data. Consider a public case study or early validation narrative. You have evidence now.`}
        </div>
        {disc.sessions>0 && disc.profiles===0 && (
          <div style={{ marginTop:10, color:C.amber, fontSize:12 }}>⚑ Sessions are running but no profiles generated yet. Profiles are the output that creates visibility for participants.</div>
        )}
      </div>
    </div>
  );
}

// ── PANEL: INVESTOR / SHARK TANK ──────────────────────────────────────────────
function InvestorPanel({ scores, setScores }: { scores: Record<string, number>; setScores: (updater: (s: Record<string, number>) => Record<string, number>) => void }) {
  const total = Math.round(SHARK.reduce((s,c)=>s+(scores[c.id]/100)*c.w, 0));
  const color = total>=75?C.gold:total>=50?C.teal:total>=25?C.amber:C.muted;
  const weakest = [...SHARK].sort((a,b)=>scores[a.id]-scores[b.id])[0];
  return (
    <div style={{ animation:"fadein .3s ease" }}>
      <div style={{ background:C.bg, border:`1px solid ${C.gold}33`, borderRadius:12, padding:"18px 20px", marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:8 }}>
          <span style={{ color:C.white, fontWeight:800, fontSize:15 }}>🦈 Shark Tank Preparedness</span>
          <span style={{ color, fontWeight:900, fontSize:30 }}>{total}%</span>
        </div>
        <MiniBar value={total} color={color} h={10}/>
        {weakest && (
          <div style={{ marginTop:14, background:C.card, borderRadius:8, padding:"12px 14px", border:`1px solid ${C.amber}33` }}>
            <div style={{ color:C.amber, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>⚑ Biggest Gap — {weakest.label}</div>
            <div style={{ color:C.text, fontSize:12, lineHeight:1.65 }}>{weakest.fix}</div>
          </div>
        )}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:12 }}>
        {SHARK.map(c=>{
          const v=scores[c.id];
          const vc=v>=70?C.gold:v>=40?C.amber:C.muted;
          return (
            <div key={c.id} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"13px 15px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ color:C.white, fontWeight:600, fontSize:13 }}>{c.label}</span>
                <span style={{ color:vc, fontWeight:900, fontSize:14 }}>{v}%</span>
              </div>
              <div style={{ color:C.muted, fontSize:11, marginBottom:8, lineHeight:1.5 }}>{c.desc}</div>
              <Slider value={v} onChange={val=>setScores(s=>({...s,[c.id]:val}))} color={v>=70?C.gold:C.amber}/>
              {v<40 && <div style={{ color:C.muted, fontSize:10, marginTop:8, lineHeight:1.55, fontStyle:"italic" }}>{c.fix}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PANEL: COMPETITIVE INTEL ──────────────────────────────────────────────────
function CompetitivePanel() {
  const [mode, setMode] = useState("landscape");
  const [custom, setCustom] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const MODES = [
    { id:"landscape", label:"Full Landscape" },
    { id:"moat",      label:"Lighthouse Moat" },
    { id:"ats",       label:"vs. ATS Systems" },
    { id:"pitch",     label:"Shark Tank Response" },
    { id:"custom",    label:"Custom" },
  ];

  const run = async () => {
    if (mode === "custom" && !custom.trim()) return;
    setLoading(true); setOutput("");
    const result = await getFounderIntel(mode as "landscape" | "moat" | "ats" | "pitch" | "custom", custom);
    if (result.status === "ok") {
      setOutput(result.text);
    } else if (result.status === "unauthorized") {
      setOutput("You need to be signed in to run this.");
    } else if (result.status === "forbidden") {
      setOutput("Your account doesn't have access to founder intel.");
    } else {
      setOutput("Error reaching Claude. Try again in a moment.");
    }
    setLoading(false);
  };

  return (
    <div style={{ animation:"fadein .3s ease" }}>
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        {MODES.map(m=>(
          <button key={m.id} onClick={()=>setMode(m.id)} style={{
            background:mode===m.id?C.teal:C.bg, color:mode===m.id?C.bg:C.muted,
            border:`1px solid ${mode===m.id?C.teal:C.border}`,
            borderRadius:6, padding:"7px 14px", fontSize:12, fontWeight:700, cursor:"pointer"
          }}>{m.label}</button>
        ))}
      </div>
      {mode==="custom" && (
        <textarea value={custom} onChange={e=>setCustom(e.target.value)}
          placeholder="Ask about a specific competitor, threat, or positioning challenge…" rows={3}
          style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8,
            padding:"10px 12px", color:C.white, fontSize:13, resize:"vertical", marginBottom:12 }}/>
      )}
      <button onClick={()=>void run()} disabled={loading||(mode==="custom"&&!custom.trim())} style={{
        background:loading?C.border:C.teal, color:loading?C.muted:C.bg,
        border:"none", borderRadius:8, padding:"10px 24px",
        fontWeight:800, fontSize:13, cursor:loading?"not-allowed":"pointer", marginBottom:20
      }}>{loading?"Analyzing…":"Run Analysis"}</button>
      {output && (
        <div style={{ background:C.bg, border:`1px solid ${C.teal}44`, borderRadius:10, padding:"18px 20px" }}>
          <div style={{ color:C.teal, fontSize:10, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", marginBottom:10 }}>Intel Report</div>
          <div style={{ color:C.text, fontSize:13, lineHeight:1.78, whiteSpace:"pre-wrap" }}>{output}</div>
        </div>
      )}
    </div>
  );
}

// ── PANEL: OPERATIONS ─────────────────────────────────────────────────────────
type Todo = { id: number; pri: string; label: string; done: boolean };

function OpsPanel({ todos, setTodos, nextId, setNextId }: { todos: Todo[]; setTodos: (updater: (t: Todo[]) => Todo[]) => void; nextId: number; setNextId: (updater: (n: number) => number) => void }) {
  const [newLabel, setNewLabel] = useState("");
  const [newPri, setNewPri] = useState("high");
  const pending = [...todos.filter(t=>!t.done)].sort((a,b)=>PRI_O[a.pri]-PRI_O[b.pri]);
  const done    = todos.filter(t=>t.done);

  const add = () => {
    if(!newLabel.trim()) return;
    setTodos(ts=>[...ts, {id:nextId, pri:newPri, label:newLabel.trim(), done:false}]);
    setNextId(n=>n+1); setNewLabel("");
  };
  const toggle = (id: number) => setTodos(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t));
  const remove = (id: number) => setTodos(ts=>ts.filter(t=>t.id!==id));

  return (
    <div style={{ animation:"fadein .3s ease" }}>
      <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", marginBottom:16, display:"flex", gap:10, flexWrap:"wrap" }}>
        <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}
          placeholder="Add a task…"
          style={{ flex:1, minWidth:160, background:C.card, border:`1px solid ${C.border}`,
            borderRadius:6, padding:"8px 12px", color:C.white, fontSize:13 }}/>
        <select value={newPri} onChange={e=>setNewPri(e.target.value)}
          style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:6,
            padding:"8px 10px", color:PRI_C[newPri], fontSize:12, fontWeight:700 }}>
          {Object.keys(PRI_O).map(p=>(
            <option key={p} value={p} style={{background:C.card,color:C.text}}>{p.toUpperCase()}</option>
          ))}
        </select>
        <button onClick={add} style={{ background:C.amber, color:C.bg, border:"none", borderRadius:6, padding:"8px 18px", fontWeight:700, cursor:"pointer", fontSize:13 }}>Add</button>
      </div>

      {pending.length===0 && done.length===0 && (
        <div style={{color:C.muted,fontSize:13,textAlign:"center",padding:"20px"}}>No tasks yet. Add one above.</div>
      )}

      {pending.map(t=>(
        <div key={t.id} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", marginBottom:7, display:"flex", alignItems:"center", gap:10 }}>
          <input type="checkbox" checked={false} onChange={()=>toggle(t.id)} style={{width:15,height:15,accentColor:C.safe,cursor:"pointer",flexShrink:0}}/>
          <div style={{flex:1,color:C.white,fontSize:13}}>{t.label}</div>
          <Badge label={t.pri} color={PRI_C[t.pri]} sm/>
          <button onClick={()=>remove(t.id)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14,padding:"0 4px",flexShrink:0}}>×</button>
        </div>
      ))}

      {done.length>0 && (
        <div style={{marginTop:16}}>
          <div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>Completed ({done.length})</div>
          {done.map(t=>(
            <div key={t.id} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10,opacity:.55}}>
              <input type="checkbox" checked={true} onChange={()=>toggle(t.id)} style={{width:15,height:15,accentColor:C.safe,cursor:"pointer",flexShrink:0}}/>
              <span style={{flex:1,color:C.muted,fontSize:13,textDecoration:"line-through"}}>{t.label}</span>
              <button onClick={()=>remove(t.id)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14,padding:"0 4px",flexShrink:0}}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PANEL: COMMUNICATIONS ─────────────────────────────────────────────────────
function CommsPanel() {
  const ITEMS: { label: string; status: string; note: string }[] = [
    { label:"Hero Direction",                      status:"done",        note:"Desperate signaling → smoke signals → nobody looking → Lighthouse finds you." },
    { label:"Hero Copy Written",                   status:"in-progress", note:"Voice direction locked. Final draft needed." },
    { label:"Hero Copy Live on Page",              status:"pending",     note:"Blocked on deployment." },
    { label:"Tagline / One-Liner",                 status:"in-progress", note:"Several directions in development." },
    { label:"Participant Onboarding Copy",         status:"pending",     note:"Alice intro language needs review." },
    { label:"Employer-Facing Messaging",           status:"pending",     note:"Not yet started." },
    { label:"Regulatory Position Statement",       status:"pending",     note:"Planned in compliance track." },
    { label:"'About Lighthouse' Narrative",        status:"pending",     note:"The founding story — Paul's story." },
  ];
  const SC: Record<string, string> = { done:C.safe, "in-progress":C.amber, pending:C.muted };
  return (
    <div style={{animation:"fadein .3s ease"}}>
      <div style={{background:C.bg,border:`1px solid ${C.safe}33`,borderRadius:10,padding:"14px 18px",marginBottom:16}}>
        <div style={{color:C.safe,fontSize:11,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>Hero Direction — Locked</div>
        <div style={{color:C.text,fontSize:13,lineHeight:1.75}}>
          The hero structure is set: escalating desperation → smoke signals → road flares → SOS → <em style={{color:C.muted}}>nobody's looking</em> → the gut-drop of being unseen → the turn → <strong style={{color:C.amber}}>the Lighthouse beam sweeps across and finds you</strong>. Rhetorical questions make visitors arrive at "no" on their own. The job now is writing the final draft and getting it live.
        </div>
      </div>
      {ITEMS.map((item,i)=>(
        <div key={i} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"11px 14px",marginBottom:7,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:SC[item.status],flexShrink:0,boxShadow:item.status==="done"?`0 0 6px ${C.safe}`:""}}/>
          <div style={{flex:1}}>
            <div style={{color:C.white,fontSize:13,fontWeight:600}}>{item.label}</div>
            <div style={{color:C.muted,fontSize:11,marginTop:2}}>{item.note}</div>
          </div>
          <Badge label={item.status} color={SC[item.status]} sm/>
        </div>
      ))}
    </div>
  );
}

type DashboardState = {
  shark: Record<string, number>;
  product: Record<string, string>;
  disc: Record<string, number>;
  todos: Todo[];
  nextId: number;
  complianceScore: number;
  threatScore: number;
  commsScore: number;
  notes: string;
};

function loadState(): DashboardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DashboardState;
  } catch {
    // ignore storage errors, fall through to defaults
  }
  return INITIAL_STATE;
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
function FounderDashboard() {
  const [st, setSt]         = useState<DashboardState>(loadState);
  const [active, setActive] = useState("ops");

  // Persist state locally -- this is a founder-only, single-browser tool, so
  // localStorage (not a backend) is enough; no participant data lives here.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    } catch {
      // ignore storage errors
    }
  }, [st]);

  const upd = useCallback(
    <K extends keyof DashboardState>(key: K) =>
      (updater: DashboardState[K] | ((prev: DashboardState[K]) => DashboardState[K])) =>
        setSt((s) => ({ ...s, [key]: typeof updater === "function" ? (updater as (prev: DashboardState[K]) => DashboardState[K])(s[key]) : updater })),
    []
  );

  // Score each station
  const sharkScore   = Math.round(SHARK.reduce((s,c)=>s+(st.shark[c.id]/100)*c.w,0));
  const productScore = Math.round((PRODUCT_ITEMS.filter(p=>st.product[p.id]==="built").length/PRODUCT_ITEMS.length)*100);
  const discScore    = Math.min(100, Math.round((st.disc.sessions/15)*100));
  const opsScore     = st.todos.length ? Math.round((st.todos.filter(t=>t.done).length/st.todos.length)*100) : 0;

  const SCORES: Record<string, number> = {
    compliance:  st.complianceScore,
    threat:      st.threatScore,
    product:     productScore,
    discovery:   discScore,
    investor:    sharkScore,
    competitive: 0,
    ops:         opsScore,
    comms:       st.commsScore,
  };

  const mission = Math.round(Object.values(SCORES).reduce((s,v)=>s+v,0)/STATIONS.length);
  const urgentOpen = st.todos.filter(t=>!t.done&&t.pri==="urgent").length;

  const PANELS: Record<string, React.ReactNode> = {
    compliance:  <CompliancePanel  score={st.complianceScore} setScore={upd("complianceScore")}/>,
    threat:      <ThreatPanel/>,
    product:     <ProductPanel     status={st.product}   setStatus={upd("product")}/>,
    discovery:   <DiscoveryPanel   disc={st.disc}         setDisc={upd("disc")}/>,
    investor:    <InvestorPanel    scores={st.shark}       setScores={upd("shark")}/>,
    competitive: <CompetitivePanel/>,
    ops:         <OpsPanel         todos={st.todos}        setTodos={upd("todos")} nextId={st.nextId} setNextId={upd("nextId")}/>,
    comms:       <CommsPanel/>,
  };

  const activeS = STATIONS.find(s=>s.id===active);

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Inter','Helvetica Neue',Arial,sans-serif",color:C.text}}>
      <style>{CSS}</style>

      {/* HEADER with lighthouse sweep */}
      <div style={{position:"relative",background:C.mid,borderBottom:`1px solid ${C.border}`,overflow:"hidden"}}>
        {/* Beacon sweep animation */}
        <div style={{
          position:"absolute",right:-120,top:-120,width:400,height:400,
          background:`conic-gradient(from 0deg, transparent 0deg, ${C.amber}18 12deg, transparent 28deg)`,
          borderRadius:"50%",
          animation:"sweep 9s linear infinite",
          pointerEvents:"none"
        }}/>
        <div style={{maxWidth:1140,margin:"0 auto",padding:"18px 24px",position:"relative",display:"flex",alignItems:"center",gap:24,flexWrap:"wrap"}}>
          <div>
            <div style={{color:C.amber,fontWeight:900,fontSize:21,letterSpacing:".09em",textTransform:"uppercase",lineHeight:1}}>⬡ Project Lighthouse</div>
            <div style={{color:C.muted,fontSize:10,letterSpacing:".1em",marginTop:3}}>FOUNDER COMMAND DASHBOARD</div>
          </div>
          <div style={{flex:1}}/>
          <BeaconMeter score={mission}/>
        </div>
      </div>

      <div style={{maxWidth:1140,margin:"0 auto",padding:"22px 16px"}}>

        {/* STATION GRID */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12,marginBottom:22}}>
          {STATIONS.map(s=>(
            <StationCard key={s.id} s={s} score={SCORES[s.id]} active={active===s.id}
              onClick={()=>setActive(s.id)} badge={s.id==="ops"?urgentOpen:null}/>
          ))}
        </div>

        {/* ACTIVE STATION PANEL */}
        <div style={{background:C.mid,border:`2px solid ${activeS?.color+"33"}`,borderRadius:14,padding:"20px 22px",minHeight:300}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18,flexWrap:"wrap",borderBottom:`1px solid ${C.border}`,paddingBottom:14}}>
            <span style={{fontSize:20}}>{activeS?.icon}</span>
            <span style={{color:activeS?.color,fontWeight:900,fontSize:15,textTransform:"uppercase",letterSpacing:".06em"}}>{activeS?.label}</span>
            <div style={{flex:1}}/>
            <Badge label={`${SCORES[active]}%`} color={activeS?.color||C.muted}/>
          </div>
          {PANELS[active]}
        </div>

        {/* FOOTER */}
        <div style={{textAlign:"center",color:C.border,fontSize:11,marginTop:20,letterSpacing:".04em"}}>
          PROJECT LIGHTHOUSE · FOUNDER EYES ONLY · STATE PERSISTS ON THIS BROWSER
        </div>
      </div>
    </div>
  );
}

// ── AUTH-GATED ENTRY POINT ────────────────────────────────────────────────────
// Reuses /api/admin-stats purely for its auth check (same allowlist as
// /admin) rather than adding a dedicated endpoint -- the dashboard's own data
// lives in localStorage, not the database.
type GateState = "checking" | "authorized" | "unauthorized" | "forbidden" | "error";

export default function FounderDashboardPage() {
  const [gate, setGate] = useState<GateState>("checking");

  useEffect(() => {
    fetch("/api/admin-stats")
      .then((response) => {
        if (response.status === 200) {
          setGate("authorized");
          return;
        }
        // This page must never be the "last visited page" a signed-in,
        // non-founder user gets bounced back into from the landing page --
        // otherwise "Back to Lighthouse" loops right back here.
        clearLastVisitedPage();
        if (response.status === 401) setGate("unauthorized");
        else if (response.status === 403) setGate("forbidden");
        else setGate("error");
      })
      .catch(() => setGate("error"));
  }, []);

  const handleSignOutAndReturn = async () => {
    await signOut().catch(() => undefined);
    clearDiscoveryIdentity();
    clearLastVisitedPage();
    window.location.href = "/";
  };

  if (gate === "authorized") return <FounderDashboard />;

  const copy: Record<Exclude<GateState, "authorized">, { title: string; body: string }> = {
    checking: { title: "Loading…", body: "" },
    unauthorized: { title: "Sign in required", body: "You need to be signed in to view this page." },
    forbidden: { title: "Not authorized", body: "Your account doesn't have access to the founder dashboard." },
    error: { title: "Something went wrong", body: "Couldn't verify access. Try refreshing the page." },
  };
  const { title, body } = copy[gate];
  const linkStyle: React.CSSProperties = { display: "inline-block", marginTop: 18, color: C.teal, fontSize: 13, fontWeight: 700, textDecoration: "none", background: "none", border: 0, padding: 0, fontFamily: "inherit", cursor: "pointer" };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "grid", placeItems: "center", color: C.text, fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif", textAlign: "center", padding: 24 }}>
      <div>
        <div style={{ color: C.white, fontWeight: 800, fontSize: 20, marginBottom: 10 }}>{title}</div>
        {body && <div style={{ color: C.muted, fontSize: 13, maxWidth: 360 }}>{body}</div>}
        {gate === "forbidden" ? (
          <button type="button" style={linkStyle} onClick={() => void handleSignOutAndReturn()}>Sign out &amp; return to Lighthouse</button>
        ) : (
          gate !== "checking" && <a href="/" style={linkStyle}>Back to Lighthouse</a>
        )}
      </div>
    </div>
  );
}
