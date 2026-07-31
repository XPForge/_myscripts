import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Brain, Check, ChevronDown, CircleUserRound, Download, FileText, Heart, Lightbulb, Menu, Mic, Moon, Paperclip, Pause, Play, RefreshCcw, Send, ShieldCheck, Sparkles, Speaker, Square, Sun, Trash2, Volume2, X, Zap } from "lucide-react";
import AliceAvatar, { AliceStatusLegend, AliceStatusWaveform, type AliceStatus } from "./AliceAvatar";
import { lighthouseDiscoveryConfig as config } from "../../config/lighthouseDiscoveryConfig";
import { alicePromptProfiles, getAlicePromptProfile, isAlicePromptProfileId, type AlicePromptProfileId } from "../../config/alicePromptProfiles";
import { captureOzDiscovery, clearOzDiscoveryCaptures, loadOzDiscoveryCaptures } from "../../oz/ozDiscoveryCapture";
import type { OzDiscoveryCapture } from "../../oz/ozDiscoveryCaptureTypes";
import { ConcentricProgressRings, SingleProgressRing } from "../shared/ConcentricProgressRings";
import { computeSchemaCoverage, DISCOVERY_FIELD_LABELS, type SchemaCoverageReport } from "../../services/discoverySchemaTracker";
import { authorLighthouseProfile, sendProfileEmail, downloadProfilePdf, type AuthorProfileResult } from "../../services/profileAuthoringClient";
import { clearDiscoveryIdentity, loadDiscoveryIdentity } from "../../services/discoveryIdentity";
import { signOut } from "../../services/authClient";
import { clearLastVisitedPage } from "../../services/lastVisitedPage";
import { submitDiscoveryFeedback } from "../../services/feedbackClient";
import { GuidedTour, GuidedTourWaitingOverlay } from "./GuidedTour";
import "./discovery.css";

// Debug tooling below is gated to this single account and must never be
// exposed to participants.
const DEBUG_TOOLS_ACCOUNT_EMAIL = "humancapabilityprofile@gmail.com";
// Root informational/marketing site — linked from the logo, the side rail, and info panels.
const LIGHTHOUSE_INFO_SITE_URL = "https://lighthouse-discovery-oracle.lighthouse-paul.chatgpt.site";
const SAMPLE_TEST_TRANSCRIPT =
  "What motivates me most is solving something nobody else has cracked yet — I'm deeply motivated when I can see the impact of what I built. I get frustrated by unclear priorities, and it frustrates me when decisions keep changing. I learn best by building something small and breaking it, that's my learning style. When I hit a hard bug I try to figure out the smallest reproduction, then troubleshoot from there. I try to explain things simply to others, and I make sure I listen before I respond. I've had to lead a small team before, and I mentor a couple of junior engineers now. I do my best work as a team, and I love how collaborative a good sprint can feel. I thrive when the goals are clear and I'm energized by fast feedback loops. I struggle when I'm micromanaged, and I get drained by constant context switching. I adapt fairly fast when things change, even when a project pivots halfway through. Under pressure, especially near a deadline, I get very focused. There's an opportunity I'd like to explore in more technical leadership. One thing that's often overlooked about me is how much of the groundwork I do that nobody sees — it's a bit of a hidden strength. For example, last quarter I quietly rebuilt our deploy pipeline; for instance, that cut release time in half. I realized I care more about enabling others than I first said, and I noticed that pattern repeating.";
const CHECKPOINT_ANNOUNCEMENT_TEXT =
  "We've covered a lot of good ground so far. You're welcome to keep going if there's more you'd like to share, or we can wrap up here whenever you're ready — that's entirely your call.";
// Authoring is a single non-streaming model call, so there's no real
// percentage to track — this cycles through honest-feeling stages instead
// of leaving the screen static during the wait.
const AUTHORING_STAGE_MESSAGES = [
  "Reading through your conversation…",
  "Identifying patterns across what you shared…",
  "Weighing evidence for each area…",
  "Writing your profile…",
  "Almost done…",
];
type ReviewPhase = "decide" | "authoring" | "authored" | "error";
type ExportFormat = "pdf" | "text";

// Persists across sessions/resets — a running cumulative total, distinct from
// the ephemeral per-visit "This Session" timer below.
const TOTAL_TIME_KEY = "lighthouse.discovery.totalTimeWithAliceMs";
function loadTotalTimeMs(): number {
  const raw = Number(localStorage.getItem(TOTAL_TIME_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}
function saveTotalTimeMs(ms: number) {
  try { localStorage.setItem(TOTAL_TIME_KEY, String(ms)); } catch { /* ignore storage errors */ }
}
// Themes carry no numeric confidence of their own — banding by how much
// evidence backs a theme keeps this honest (more corroboration = stronger
// signal) instead of implying a precision the underlying data doesn't have.
function themeSignalBand(evidenceCount: number): { label: string; percentage: number } {
  if (evidenceCount >= 3) return { label: "Strong Signal", percentage: 85 };
  if (evidenceCount === 2) return { label: "Moderate Signal", percentage: 60 };
  return { label: "Early Signal", percentage: 32 };
}
function formatDurationMs(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (totalMinutes < 1) return "< 1 min";
  return `${totalMinutes} min`;
}

type Turn = { id: string; role: "participant" | "alice" | "system"; text: string; timestamp: string; inputMode: "typed" | "voice"; transcriptEdited: boolean; aliceVoiceEnabled: boolean; quietMode: boolean; aliceStatusAtTime: AliceStatus; audioUrl?: string; source: "chat" | "transcript" | "note" };
type Tab = "speak" | "type" | "attach";
const STORAGE_KEY = "lighthouse.discovery.run1";
const PROMPT_PROFILE_STORAGE_KEY = "lighthouse.discovery.alicePromptProfile";
const now = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const seed: Turn[] = [{ id: "welcome", role: "alice", text: "To help me understand you deeply, what have been the moments in your life that changed the way you see yourself or the world?", timestamp: now(), inputMode: "typed", transcriptEdited: false, aliceVoiceEnabled: true, quietMode: false, aliceStatusAtTime: "listening", source: "chat" }];

function useAliceSession(systemPrompt: string) {
  const resumedSessionRef = useRef(localStorage.getItem(STORAGE_KEY) !== null);
  const [turns, setTurns] = useState<Turn[]>(() => { try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved).turns ?? seed : seed; } catch { return seed; } });
  const [status, setStatus] = useState<AliceStatus>("listening");
  const [voiceOn, setVoiceOn] = useState<boolean>(config.defaultVoiceOn);
  const [quietMode, setQuietMode] = useState<boolean>(config.defaultQuietMode);
  const [voiceError, setVoiceError] = useState("");
  const [ozCapture, setOzCapture] = useState<OzDiscoveryCapture | null>(() => {
    const stored = loadOzDiscoveryCaptures();
    return stored[stored.length - 1] ?? null;
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify({ turns, voiceOn, quietMode, savedAt: new Date().toISOString() }));
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ turns, voiceOn, quietMode, savedAt: new Date().toISOString() })); }, [turns, voiceOn, quietMode]);
  const stopAudio = () => { audioRef.current?.pause(); audioRef.current = null; setStatus("listening"); };
  const playVoice = async (input: string) => {
    setVoiceError(""); setStatus("loading");
    try {
      const audio = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input, voice: config.voiceName, instructions: input.length < 180 ? config.shortTtsInstructions : config.ttsInstructions, responseFormat: config.responseFormat }) });
      if (!audio.ok) throw new Error("Alice voice is temporarily unavailable.");
      const url = URL.createObjectURL(await audio.blob()); const player = new Audio(url); player.playbackRate = config.playbackRate; audioRef.current = player;
      player.onplaying = () => setStatus("speaking");
      player.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; setStatus("listening"); };
      player.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; setVoiceError("Alice voice couldn't play, but her response is still here."); setStatus("listening"); };
      await player.play();
    } catch { setVoiceError("Alice voice is temporarily unavailable. You can continue in text."); setStatus("listening"); }
  };
  const send = async (text: string, inputMode: "typed" | "voice", edited = false) => {
    const userTurn: Turn = { id: crypto.randomUUID(), role: "participant", text, timestamp: now(), inputMode, transcriptEdited: edited, aliceVoiceEnabled: voiceOn, quietMode, aliceStatusAtTime: "listening", source: "chat" };
    const next = [...turns, userTurn]; setTurns(next); setStatus("thinking");
    const priorParticipantTurns = turns.filter(turn => turn.role === "participant");
    const hasTranscript = turns.length > 1 || priorParticipantTurns.length > 0 || resumedSessionRef.current;
    const sessionContext = [
      "Runtime session context:",
      `- isNewSession: ${!resumedSessionRef.current && !hasTranscript}`,
      `- hasTranscript: ${hasTranscript}`,
      `- turnCount: ${next.length}`,
      `- lastParticipantMessage: ${JSON.stringify(text)}`,
      `- resumedSession: ${resumedSessionRef.current}`,
      "The participant has provided a meaningful message. Respond from that message and the existing transcript. Do not use the default opening fallback.",
    ].join("\n");
    let reply = "Thank you for sharing that. What did that experience teach you about yourself?";
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system: `${systemPrompt}\n\n${sessionContext}`, messages: next.filter(t => t.role !== "system").map(t => ({ role: t.role === "participant" ? "user" : "assistant", content: t.text })) }) });
      if (response.ok) reply = (await response.json()).reply || reply;
    } catch { /* preserve a natural offline fallback */ }
    const aliceTurn: Turn = { id: crypto.randomUUID(), role: "alice", text: reply, timestamp: now(), inputMode, transcriptEdited: false, aliceVoiceEnabled: voiceOn, quietMode, aliceStatusAtTime: quietMode || !voiceOn ? "thinking" : "speaking", source: "chat" };
    const completedExchange = [...next, aliceTurn];
    setTurns(current => [...current, aliceTurn]);
    captureOzDiscovery(completedExchange.map(turn => ({ id: turn.id, role: turn.role, text: turn.text, timestamp: turn.timestamp }))).then(setOzCapture).catch(() => undefined);
    if (voiceOn && !quietMode) await playVoice(reply); else setStatus("listening");
  };
  const markAsNewSession = () => { resumedSessionRef.current = false; };
  const isBrandNewSession = () => !resumedSessionRef.current;
  const sendOpeningIntroduction = async () => {
    setStatus("thinking");
    const discoveryCategories = Object.values(DISCOVERY_FIELD_LABELS).join(", ");
    let reply = seed[0].text;
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        system: `${systemPrompt}\n\nYou are Alice, the frontline AI for Project Lighthouse. Your job is to discover the following through casual, guided conversation: ${discoveryCategories}. This is the very first message of a brand-new Discovery session. Introduce yourself in your own natural words: say that you're Alice and that this is Lighthouse Discovery, and briefly what it's for (understanding how the participant thinks, works, and thrives — not a test, not scored, not an evaluation) and how it works (one question at a time, and they can redirect you anytime). Keep it warm, brief, and conversational — not a long recitation. Then ask exactly one open question to begin, based on your own judgment of what would open the conversation well.`,
        messages: [{ role: "user", content: "Please begin." }],
      }) });
      if (response.ok) reply = (await response.json()).reply || reply;
    } catch { /* keep the plain fallback question */ }
    const aliceTurn: Turn = { id: crypto.randomUUID(), role: "alice", text: reply, timestamp: now(), inputMode: "typed", transcriptEdited: false, aliceVoiceEnabled: voiceOn, quietMode, aliceStatusAtTime: quietMode || !voiceOn ? "thinking" : "speaking", source: "chat" };
    setTurns([aliceTurn]);
    if (voiceOn && !quietMode) await playVoice(reply); else setStatus("listening");
  };
  return { turns, setTurns, status, setStatus, voiceOn, setVoiceOn, quietMode, setQuietMode, voiceError, setVoiceError, ozCapture, setOzCapture, playVoice, save, stopAudio, send, markAsNewSession, isBrandNewSession, sendOpeningIntroduction };
}

const PlaceholderButton = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button className="outline-button" onClick={onClick}>{children}</button>;
const LearnMoreLink = () => <a className="outline-button learn-more-link" href={LIGHTHOUSE_INFO_SITE_URL} target="_blank" rel="noopener noreferrer">Learn more about Lighthouse ↗</a>;
const CollapsibleCard = ({ title, collapsed, onToggle, children, dataTour, className = "" }: { title: string; collapsed: boolean; onToggle: () => void; children: React.ReactNode; dataTour?: string; className?: string }) => (
  <section className={`rail-card ${className}`} data-tour={dataTour}>
    <h2 style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={onToggle}>
      {title}
      <span aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`} style={{ fontSize: "1rem" }}>{collapsed ? "+" : "−"}</span>
    </h2>
    {!collapsed && children}
  </section>
);
const CollapsibleSection = ({ title, collapsed, onToggle, children }: { title: string; collapsed: boolean; onToggle: () => void; children: React.ReactNode }) => (
  <>
    <h3 style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={onToggle}>
      {title}
      <span aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`} style={{ fontSize: "0.9rem" }}>{collapsed ? "+" : "−"}</span>
    </h3>
    {!collapsed && children}
  </>
);

export default function DiscoveryPage({ onRestart }: { onRestart: () => void }) {
  const [promptProfileId, setPromptProfileId] = useState<AlicePromptProfileId>(() => { const saved = localStorage.getItem(PROMPT_PROFILE_STORAGE_KEY); return isAlicePromptProfileId(saved) ? saved : config.defaultAlicePromptProfileId; });
  const activePromptProfile = useMemo(() => getAlicePromptProfile(promptProfileId), [promptProfileId]);
  const session = useAliceSession(activePromptProfile.systemPrompt);
  const [theme, setTheme] = useState<"dark" | "light">(() => localStorage.getItem("lighthouse.discovery.theme") === "light" ? "light" : "dark");
  const [tab, setTab] = useState<Tab>("speak"); const [typed, setTyped] = useState(""); const [recording, setRecording] = useState(false); const [paused, setPaused] = useState(false); const [seconds, setSeconds] = useState(0); const [review, setReview] = useState(""); const [originalReview, setOriginalReview] = useState("");
  // Nudges the participant to actually press send once something is ready to
  // go but hasn't moved in a while -- resets on every edit, so it only fires
  // after real inactivity, not immediately after typing/recording.
  const [sendReminder, setSendReminder] = useState(false);
  useEffect(() => {
    setSendReminder(false);
    if (!typed.trim() && !review.trim()) return;
    const id = window.setTimeout(() => setSendReminder(true), 8000);
    return () => window.clearTimeout(id);
  }, [typed, review]);
  const [modal, setModal] = useState<"transcript" | "placeholder" | "delete" | "reset-profile" | "review" | "privacy" | "insights" | null>(null); const [placeholder, setPlaceholder] = useState(""); const [mobileRail, setMobileRail] = useState<"left" | "right" | null>(null); const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  // Traditional close mechanisms for the mobile drawer, alongside the existing X
  // button: Escape key, and tapping the scrim behind it (wired below).
  useEffect(() => {
    if (!mobileRail) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileRail(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileRail]);
  const recorder = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]); const chatTop = useRef<HTMLDivElement | null>(null);
  const discoveryIdentity = useMemo(() => loadDiscoveryIdentity(), []);
  const isDebugAccount = discoveryIdentity?.email === DEBUG_TOOLS_ACCOUNT_EMAIL;
  const [collapsedPanels, setCollapsedPanels] = useState<Record<string, boolean>>({});
  const togglePanel = (id: string) => setCollapsedPanels((p) => ({ ...p, [id]: !p[id] }));
  const [checkpointAnnounced, setCheckpointAnnounced] = useState(false);
  const [reviewPhase, setReviewPhase] = useState<ReviewPhase>("decide");
  const [authoringStageIndex, setAuthoringStageIndex] = useState(0);
  useEffect(() => {
    if (reviewPhase !== "authoring") { setAuthoringStageIndex(0); return; }
    const id = window.setInterval(() => {
      setAuthoringStageIndex((i) => Math.min(i + 1, AUTHORING_STAGE_MESSAGES.length - 1));
    }, 2600);
    return () => clearInterval(id);
  }, [reviewPhase]);
  const [authoredProfile, setAuthoredProfile] = useState<AuthorProfileResult | null>(null);
  const [authoringError, setAuthoringError] = useState("");
  const [reviewName, setReviewName] = useState(() => discoveryIdentity?.name ?? "");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("text");
  const [deliveryEmail, setDeliveryEmail] = useState(() => discoveryIdentity?.email ?? "");
  const [deliveryRequested, setDeliveryRequested] = useState(false);
  const [deliverySending, setDeliverySending] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");
  const [allowDevelopmentCopy, setAllowDevelopmentCopy] = useState(false);
  const [feedbackTab, setFeedbackTab] = useState<"speak" | "type">("type");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackConsent, setFeedbackConsent] = useState(false);
  const [feedbackRecording, setFeedbackRecording] = useState(false);
  const [feedbackTranscribing, setFeedbackTranscribing] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const feedbackRecorderRef = useRef<MediaRecorder | null>(null);
  const feedbackChunksRef = useRef<BlobPart[]>([]);
  const [tourState, setTourState] = useState<"idle" | "waiting" | "active">("idle");
  const [tourKey, setTourKey] = useState(0);
  const startGuidedTour = () => {
    // Forces a fresh GuidedTour instance every time, so it always begins at step 1
    // regardless of where a previous run was left off.
    setTourKey((key) => key + 1);
    setTourState(session.status === "listening" ? "active" : "waiting");
  };
  useEffect(() => {
    if (tourState === "waiting" && session.status === "listening") {
      setTourState("active");
    }
  }, [tourState, session.status]);
  const sessionStartRef = useRef(Date.now());
  const [sessionElapsedMs, setSessionElapsedMs] = useState(0);
  const [totalTimeMs, setTotalTimeMs] = useState(() => loadTotalTimeMs());
  useEffect(() => {
    const interval = window.setInterval(() => {
      setSessionElapsedMs(Date.now() - sessionStartRef.current);
      setTotalTimeMs(current => {
        const next = current + 1000;
        saveTotalTimeMs(next);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);
  const introFiredRef = useRef(false);
  useEffect(() => {
    if (introFiredRef.current) return;
    if (!session.isBrandNewSession()) return;
    if (session.turns.length !== 1 || session.turns[0].id !== "welcome") return;
    introFiredRef.current = true;
    void session.sendOpeningIntroduction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [showTourPrompt, setShowTourPrompt] = useState(false);
  const tourPromptShownRef = useRef(false);
  useEffect(() => {
    if (tourPromptShownRef.current) return;
    if (!introFiredRef.current) return;
    if (!session.isBrandNewSession()) return;
    if (session.status !== "listening") return;
    tourPromptShownRef.current = true;
    setShowTourPrompt(true);
  }, [session.status]);
  const transcriptText = useMemo(() => session.turns.map(t => t.text).join(" "), [session.turns]);
  const participantTurnCount = useMemo(() => session.turns.filter(t => t.role === "participant").length, [session.turns]);
  const schemaCoverage: SchemaCoverageReport = useMemo(
    () => computeSchemaCoverage(transcriptText, participantTurnCount),
    [transcriptText, participantTurnCount]
  );
  const emergingThemes = session.ozCapture?.emergingThemes ?? [];
  useEffect(() => {
    if (checkpointAnnounced || schemaCoverage.profileReadinessPercentage < 100) return;
    const checkpointTurn: Turn = { id: crypto.randomUUID(), role: "alice", text: CHECKPOINT_ANNOUNCEMENT_TEXT, timestamp: now(), inputMode: "typed", transcriptEdited: false, aliceVoiceEnabled: session.voiceOn, quietMode: session.quietMode, aliceStatusAtTime: "speaking", source: "chat" };
    session.setTurns(current => [...current, checkpointTurn]);
    if (session.voiceOn && !session.quietMode) void session.playVoice(CHECKPOINT_ANNOUNCEMENT_TEXT);
    setCheckpointAnnounced(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkpointAnnounced, schemaCoverage.profileReadinessPercentage]);
  const visibleTurns = useMemo(() => [...session.turns].reverse(), [session.turns]);
  useEffect(() => { chatTop.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [session.turns.length]);
  useEffect(() => { if (!recording || paused) return; const id = window.setInterval(() => setSeconds(s => s + 1), 1000); return () => clearInterval(id); }, [recording, paused]);
  const openPlaceholder = (name: string) => { setPlaceholder(name); setModal("placeholder"); };
  const startRecording = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const r = new MediaRecorder(stream); chunks.current = []; r.ondataavailable = e => chunks.current.push(e.data); r.start(); recorder.current = r; setRecording(true); setPaused(false); setSeconds(0); session.setStatus("listening"); } catch { openPlaceholder("Microphone access is unavailable. Check your browser permission, or use Type Instead."); } };
  const finishRecording = () => { const r = recorder.current; if (!r) return; r.onstop = async () => { r.stream.getTracks().forEach(t => t.stop()); setRecording(false); setPaused(false); session.setStatus("loading"); const blob = new Blob(chunks.current, { type: r.mimeType || "audio/webm" }); try { const form = new FormData(); form.append("file", blob, "answer.webm"); form.append("model", config.transcriptionModel); form.append("language", "en"); const response = await fetch("/api/transcribe", { method: "POST", body: form }); if (!response.ok) throw new Error(); const text = (await response.json()).text || ""; setReview(text); setOriginalReview(text); } catch { setReview("Your recording is ready. Transcription needs a configured server connection; you can type or edit your answer here."); setOriginalReview(""); } finally { session.setStatus("listening"); } }; r.stop(); };
  const cancelRecording = () => { recorder.current?.stop(); recorder.current?.stream.getTracks().forEach(t => t.stop()); setRecording(false); setPaused(false); setSeconds(0); session.setStatus("listening"); };
  const sendText = async () => { const value = typed.trim(); if (!value) return; setTyped(""); await session.send(value, "typed"); };
  const sendReview = async () => { const value = review.trim(); if (!value) return; const edited = value !== originalReview; setReview(""); await session.send(value, "voice", edited); };
  const exportTranscript = () => { const content = session.turns.map(t => `[${t.timestamp}] ${t.role === "participant" ? "You" : "Alice"}: ${t.text}`).join("\n\n"); const url = URL.createObjectURL(new Blob([content], { type: "text/plain" })); const a = document.createElement("a"); a.href = url; a.download = "lighthouse-discovery-transcript.txt"; a.click(); URL.revokeObjectURL(url); };
  const clearData = () => { session.stopAudio(); session.setTurns(seed); localStorage.removeItem(STORAGE_KEY); clearOzDiscoveryCaptures(); session.setOzCapture(null); setModal(null); };
  // Resetting Discovery starts a fresh conversation for the same signed-in
  // account -- it must not clear the real identity/session, only the
  // conversation state. Signing out is a separate, explicit action.
  const resetProfile = () => { session.stopAudio(); if (recording) cancelRecording(); session.setTurns(seed); localStorage.removeItem(STORAGE_KEY); clearOzDiscoveryCaptures(); session.setOzCapture(null); session.markAsNewSession(); setTyped(""); setReview(""); setOriginalReview(""); setSeconds(0); setRecording(false); setPaused(false); session.setStatus("listening"); setModal(null); setCheckpointAnnounced(false); setReviewPhase("decide"); setAuthoredProfile(null); setAuthoringError(""); setDeliveryRequested(false); setAllowDevelopmentCopy(false); onRestart(); };
  const handleSignOut = async () => { await signOut().catch(() => undefined); clearDiscoveryIdentity(); clearLastVisitedPage(); window.location.href = "/"; };
  const openReviewModal = () => { setReviewPhase("decide"); setAuthoringError(""); setModal("review"); };
  const generateProfileFromReview = async () => {
    setReviewPhase("authoring"); setAuthoringError("");
    try {
      const result = await authorLighthouseProfile(
        transcriptText,
        reviewName.trim() || "Participant",
        deliveryEmail.trim() || discoveryIdentity?.email || "",
        allowDevelopmentCopy
      );
      setAuthoredProfile(result);
      setReviewPhase("authored");
    } catch (error) {
      setAuthoringError(error instanceof Error ? error.message : "Unable to generate the profile.");
      setReviewPhase("error");
    }
  };
  const downloadPlainTextProfile = () => {
    const text = authoredProfile?.fields.generatedProfile;
    if (!text) return;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a"); a.href = url; a.download = "lighthouse-discovery-profile.txt"; a.click(); URL.revokeObjectURL(url);
  };
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const handleDownloadPdf = async () => {
    if (!authoredProfile) return;
    setPdfDownloading(true); setPdfError("");
    try {
      await downloadProfilePdf(reviewName.trim() || "Participant", authoredProfile.fields);
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "Unable to generate the PDF.");
    } finally {
      setPdfDownloading(false);
    }
  };
  const requestProfileDelivery = async () => {
    if (!authoredProfile) return;
    setDeliverySending(true); setDeliveryError(""); setDeliveryRequested(false);
    try {
      await sendProfileEmail(reviewName.trim() || "Participant", deliveryEmail.trim(), authoredProfile.fields);
      setDeliveryRequested(true);
    } catch (error) {
      setDeliveryError(error instanceof Error ? error.message : "Unable to send the email.");
    } finally {
      setDeliverySending(false);
    }
  };
  const startFeedbackRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      feedbackChunksRef.current = [];
      r.ondataavailable = (e) => feedbackChunksRef.current.push(e.data);
      r.start();
      feedbackRecorderRef.current = r;
      setFeedbackRecording(true);
      setFeedbackError("");
    } catch {
      setFeedbackError("Microphone access is unavailable. Check your browser permission, or type your feedback instead.");
    }
  };
  const finishFeedbackRecording = () => {
    const r = feedbackRecorderRef.current;
    if (!r) return;
    r.onstop = async () => {
      r.stream.getTracks().forEach((t) => t.stop());
      setFeedbackRecording(false);
      setFeedbackTranscribing(true);
      const blob = new Blob(feedbackChunksRef.current, { type: r.mimeType || "audio/webm" });
      try {
        const form = new FormData();
        form.append("file", blob, "feedback.webm");
        form.append("model", config.transcriptionModel);
        form.append("language", "en");
        const response = await fetch("/api/transcribe", { method: "POST", body: form });
        if (!response.ok) throw new Error();
        const text = (await response.json()).text || "";
        setFeedbackText(text);
      } catch {
        setFeedbackError("Transcription didn't come through — you can type your feedback instead.");
      } finally {
        setFeedbackTranscribing(false);
      }
    };
    r.stop();
  };
  const submitFeedback = async () => {
    const value = feedbackText.trim();
    if (!value) return;
    setFeedbackSubmitting(true); setFeedbackError("");
    try {
      await submitDiscoveryFeedback(
        reviewName.trim() || discoveryIdentity?.name || "",
        deliveryEmail.trim() || discoveryIdentity?.email || "",
        value,
        feedbackTab === "speak" ? "voice" : "typed",
        feedbackConsent
      );
      setFeedbackSubmitted(true);
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Unable to send feedback.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };
  const debugFillSampleTranscript = () => {
    if (!isDebugAccount) return;
    session.setTurns(current => [...current, { id: crypto.randomUUID(), role: "participant", text: SAMPLE_TEST_TRANSCRIPT, timestamp: now(), inputMode: "typed", transcriptEdited: false, aliceVoiceEnabled: session.voiceOn, quietMode: session.quietMode, aliceStatusAtTime: "listening", source: "chat" }]);
  };
  const toggleVoice = () => { const next = !session.voiceOn; session.setVoiceOn(next); session.setQuietMode(!next); if (!next) session.stopAudio(); };
  const toggleTheme = () => { const next = theme === "dark" ? "light" : "dark"; setTheme(next); localStorage.setItem("lighthouse.discovery.theme", next); };
  const selectPromptProfile = (id: AlicePromptProfileId) => { setPromptProfileId(id); localStorage.setItem(PROMPT_PROFILE_STORAGE_KEY, id); };
  const showPromptProfileSelector = isDebugAccount;
  const elapsed = useMemo(() => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`, [seconds]);
  return <div className={`discovery-page discovery-page--${theme}`}>
    <img src="/domain-wheel-graphic.png" alt="" aria-hidden="true" className="domain-wheel-decor" />
    <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileRail((current) => current === "left" ? null : "left")} aria-label={mobileRail === "left" ? "Close progress menu" : "Open progress menu"}><Menu /></button><a className="brand" href={LIGHTHOUSE_INFO_SITE_URL} target="_blank" rel="noopener noreferrer" title="Visit the Lighthouse informational site"><img className="brand-logo-img" src="/project-lighthouse-logo.png" alt="Project Lighthouse"/></a><div className="page-title"><strong>LIGHTHOUSE DISCOVERY ENGINE</strong><small>You guide the conversation. <b>Alice</b> helps you be fully seen.</small></div><div className="top-actions" data-tour="top-actions"><span className="session-pill" data-tour="brand-status"><small>Session Status</small><b>● &nbsp; In Progress</b></span><button className="top-action-button" onClick={startGuidedTour}>Take the Tour</button><button className="top-action-button icon-button theme-toggle" onClick={toggleTheme} aria-label={`Use ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun/> : <Moon/>}</button><button className="top-action-button icon-button" aria-label="Notifications"><Bell /></button><span style={{ position: "relative" }}><button className="top-action-button profile-button" onClick={() => setProfileMenuOpen(v => !v)} aria-label={discoveryIdentity?.name ? `Open profile menu for ${discoveryIdentity.name}` : "Open profile menu"} aria-expanded={profileMenuOpen} title={discoveryIdentity?.name}><span>{discoveryIdentity?.name?.trim()?.[0]?.toUpperCase() ?? "?"}</span><ChevronDown/></button>{profileMenuOpen && <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#fff", border: "1px solid #dce3ef", borderRadius: "8px", boxShadow: "0 8px 24px rgba(24,39,75,.12)", minWidth: "160px", padding: "6px", zIndex: 30 }}>{discoveryIdentity?.name && <div style={{ padding: "6px 8px", fontSize: "0.78rem", opacity: 0.7, borderBottom: "1px solid #eef1f6", marginBottom: "4px" }}>{discoveryIdentity.name}<br/><span style={{ fontSize: "0.72rem" }}>{discoveryIdentity.email}</span></div>}<button onClick={() => { setProfileMenuOpen(false); void handleSignOut(); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "8px", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem" }}>Sign out</button></div>}</span></div><button className="icon-button mobile-menu" onClick={() => setMobileRail((current) => current === "right" ? null : "right")} aria-label={mobileRail === "right" ? "Close insights menu" : "Open insights menu"}><Sparkles /></button></header>
    <main className="three-column">
      {mobileRail && <button type="button" className="mobile-rail-scrim" aria-label="Close menu" onClick={() => setMobileRail(null)} />}
      <aside className={`left-rail ${mobileRail === "left" ? "rail-open" : ""}`}><button className="drawer-close" onClick={() => setMobileRail(null)}><X /></button>
        <CollapsibleCard title="DISCOVERY PROGRESS" collapsed={!!collapsedPanels["discovery-progress"]} onToggle={() => togglePanel("discovery-progress")} dataTour="discovery-progress">
          <div style={{ display: "grid", justifyItems: "center", gap: "8px" }}>
            {discoveryIdentity?.name && <b style={{ fontSize: "1.3rem", lineHeight: 1.2, textAlign: "center" }}>{discoveryIdentity.name}</b>}
            <SingleProgressRing percentage={schemaCoverage.profileReadinessPercentage} label="profile progress" />
          </div>
        </CollapsibleCard>
        <CollapsibleCard title="SESSION INFO" collapsed={!!collapsedPanels["session-info"]} onToggle={() => togglePanel("session-info")} dataTour="session-info">
          <dl className="session-info">{discoveryIdentity?.name && <div><dt>◒ &nbsp; Participant</dt><dd>{discoveryIdentity.name}</dd></div>}<div><dt>◷ &nbsp; Started</dt><dd>Today, {seed[0].timestamp}</dd></div><div><dt>◷ &nbsp; This Session</dt><dd>{formatDurationMs(sessionElapsedMs)}</dd></div><div><dt>◷ &nbsp; Overall Time with Alice</dt><dd>{formatDurationMs(totalTimeMs)}</dd></div><div><dt>▣ &nbsp; Conversations</dt><dd>{session.turns.length}</dd></div><div><dt>▤ &nbsp; Last Saved</dt><dd>just now</dd></div></dl><PlaceholderButton onClick={() => setModal("transcript")}>View Full Transcript</PlaceholderButton>
        </CollapsibleCard>
        <CollapsibleCard title="QUICK ACTIONS" collapsed={!!collapsedPanels["quick-actions"]} onToggle={() => togglePanel("quick-actions")} dataTour="quick-actions">
          <div className="quick-actions"><button onClick={openReviewModal}><Sparkles/>Review & Generate Profile</button><button onClick={()=>openPlaceholder("Insights review is coming soon.")}><FileText/>Review My Insights</button><button onClick={()=>openPlaceholder("Preferences are coming soon.")}><Check/>Update My Preferences</button><button onClick={exportTranscript}><Download/>Export My Transcript</button><button onClick={()=>setModal("reset-profile")}><RefreshCcw/>Reset Discovery Profile</button><button onClick={()=>setModal("delete")}><Trash2/>Delete My Data</button></div>
        </CollapsibleCard>
        <CollapsibleCard title="TALKING WITH ALICE" collapsed={!!collapsedPanels["talking-with-alice"]} onToggle={() => togglePanel("talking-with-alice")}><Info icon={<Mic/>} title="Press to speak" text="Tap the mic, say your answer, tap again when done."/><Info icon={<FileText/>} title="Review before sending" text="Your words appear as text — fix anything that's off."/><Info icon={<Send/>} title="Send when ready" text="Nothing goes to Alice until you press send."/><LearnMoreLink/></CollapsibleCard>
        <CollapsibleCard title="ABOUT LIGHTHOUSE" collapsed={!!collapsedPanels["about-lighthouse"]} onToggle={() => togglePanel("about-lighthouse")}><Info icon={<Lightbulb/>} title="What is Lighthouse?" text="See the discovery engine, the philosophy behind it, and what's coming next."/><LearnMoreLink/></CollapsibleCard>
      </aside>
      <section className="center-panel"><div className="discovery-console"><div className="alice-identity"><AliceAvatar status={session.status} size="lg"/><h1>A.L.I.CE. <Sparkles/></h1><b>Your Discovery Guide</b><button className={`voice-mode-button ${session.voiceOn?"active":""}`} onClick={toggleVoice} aria-pressed={session.voiceOn}><Volume2/> Voice {session.voiceOn?"On":"Off"}</button><span className={`alice-debug alice-debug--${session.status}`}>Alice status: {session.status}{showPromptProfileSelector ? ` · ${activePromptProfile.name}` : ""}</span>{showPromptProfileSelector && <label className="prompt-mode-control">Alice Prompt Mode<select value={promptProfileId} onChange={event=>selectPromptProfile(event.target.value as AlicePromptProfileId)}>{alicePromptProfiles.map(profile=><option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>}</div>
        <div className="composer" data-tour="composer"><div className="tabs"><button className={tab==="speak"?"active":""} onClick={()=>setTab("speak")}><Mic/> Speak Your Answer</button><button className={tab==="type"?"active":""} onClick={()=>setTab("type")}><FileText/> Type Instead</button><button className="disabled" disabled title="Attach isn't available yet — coming in a future update."><Paperclip/> Attach (Coming Soon)</button></div>
          {tab === "speak" && <div className="speak-pane"><b>Push to Talk</b><small>Tap to record. Review before Alice responds.</small><div className="record-line" data-tour="mic-button"><AliceStatusWaveform status={recording&&!paused?"listening":"loading"}/><button className={`record-button ${recording?"recording":""}`} onClick={recording?finishRecording:startRecording} aria-label={recording?"Done speaking":"Start recording"}>{recording?<Square/>:<Mic/>}</button><AliceStatusWaveform status={recording&&!paused?"listening":"loading"}/></div><strong>{elapsed}</strong><span>{recording ? paused ? "Recording paused" : "Listening..." : "Ready to record"}</span><div className="record-actions"><button disabled={!recording} onClick={()=>{ if(!recorder.current)return; if (paused) recorder.current.resume(); else recorder.current.pause(); setPaused(!paused); }}>{paused?<Play/>:<Pause/>} {paused?"Resume":"Pause"}</button><button disabled={!recording} onClick={finishRecording}><Check/> Done Speaking</button><button disabled={!recording} onClick={cancelRecording}><X/> Cancel</button></div></div>}
          {tab === "type" && <div className="type-pane"><textarea value={typed} onChange={e=>setTyped(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault(); void sendText();}}} placeholder="Share what’s on your mind…"/><button className={sendReminder && typed.trim() ? "send-pulse" : undefined} onClick={sendText} disabled={!typed.trim()}><Send/> Send to Alice</button></div>}
          {tab === "attach" && <div className="attach-pane"><Paperclip/><b>Attach context later</b><span>Coming soon — attachments are not processed in Run 1.</span></div>}
        </div></div>
        <div className="transcript-review" data-tour="transcript-review"><div><b>Your Transcript <span>(Review before sending)</span></b><label><FileText/> Edit</label></div><textarea value={review} onChange={e=>setReview(e.target.value)} placeholder="Your recorded transcript will appear here for review."/><button className={sendReminder && review.trim() ? "send-pulse" : undefined} onClick={sendReview} disabled={!review.trim()}><Send/> Send to Alice</button></div>
        <div className="voice-error-slot">{session.voiceError && <div className="voice-error" role="status"><Speaker/> {session.voiceError}<button onClick={()=>session.setVoiceError("")}><X/></button></div>}</div>
        <div className="conversation-divider"><span>Conversation</span><i /></div>
        <div className="chat" data-tour="conversation-log"><div ref={chatTop}/>{visibleTurns.map(turn => <div className={`message-row message-row--${turn.role}`} key={turn.id}>{turn.role === "alice" && <AliceAvatar status={turn.aliceStatusAtTime} size="sm"/>}<div className="bubble"><time>{turn.timestamp}</time><p>{turn.text}</p>{turn.role === "alice" && turn.aliceVoiceEnabled && <Volume2 className="bubble-speaker"/>}</div>{turn.role === "participant" && <span className="user-dot" title={discoveryIdentity?.name}>{discoveryIdentity?.name?.trim()?.[0]?.toUpperCase() ?? "?"}</span>}</div>)}</div>
      </section>
      <aside className={`right-rail ${mobileRail === "right" ? "rail-open" : ""}`}><button className="drawer-close" onClick={() => setMobileRail(null)}><X /></button>
        <CollapsibleCard title="DISCOVERY INSIGHTS" collapsed={!!collapsedPanels["discovery-insights"]} onToggle={() => togglePanel("discovery-insights")}>
          <h3>Emerging Themes</h3>
          {emergingThemes.length === 0 && <p style={{ fontSize: "0.78rem", opacity: 0.7 }}>Nothing has surfaced yet — insights will appear here as the conversation continues.</p>}
          {emergingThemes.map((theme, i) => {
            const band = themeSignalBand(theme.evidenceItemIds.length);
            return <div className={`signal signal-${i % 5}`} key={theme.id}><span><Sparkles/><b>{theme.title}</b><small>{band.label}</small></span><i><em style={{ width: `${band.percentage}%` }} /></i></div>;
          })}
          <PlaceholderButton onClick={() => setModal("insights")} >Explore Insights</PlaceholderButton>
        </CollapsibleCard>
        <CollapsibleCard title="WHAT ALICE IS LEARNING" collapsed={!!collapsedPanels["alice-learning"]} onToggle={() => togglePanel("alice-learning")}><Info icon={<Heart/>} title="What matters to you" text="Your values and priorities"/><Info icon={<Brain/>} title="How you think" text="Your perspective and patterns"/><Info icon={<Zap/>} title="What drives you" text="Your motivations and energy"/><Info icon={<CircleUserRound/>} title="How you contribute" text="Your unique strengths"/><PlaceholderButton onClick={()=>openPlaceholder("The Learning Map is coming soon.")}>View Learning Map</PlaceholderButton><LearnMoreLink/></CollapsibleCard>
        <CollapsibleCard title="PRIVACY & TRUST" collapsed={!!collapsedPanels["privacy-trust"]} onToggle={() => togglePanel("privacy-trust")}><Info icon={<ShieldCheck/>} title="Your data is yours" text="We do not sell your information or use it to exploit you."/><Info icon={<ShieldCheck/>} title="Private by default" text="You choose what is saved, shared, exported, or shown to others."/><Info icon={<ShieldCheck/>} title="Protected by design" text="Your profile, story, and discovery materials are handled with care."/><Info icon={<ShieldCheck/>} title="No hidden judgment" text="Lighthouse is built to understand you, not secretly score or rank you."/><Info icon={<ShieldCheck/>} title="Participant authority" text="You remain the final authority over how you are represented."/><PlaceholderButton onClick={()=>setModal("privacy")}>Learn More</PlaceholderButton><LearnMoreLink/></CollapsibleCard>
        {isDebugAccount && <CollapsibleCard title="DEVELOPER TOOLS" className="developer-tools-card" collapsed={!!collapsedPanels["developer-tools"]} onToggle={() => togglePanel("developer-tools")}>
          <div style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "0.78rem", opacity: 0.75 }}>Visible only to this account.</span>
            <PlaceholderButton onClick={debugFillSampleTranscript}>Fill Sample Transcript</PlaceholderButton>
            <PlaceholderButton onClick={() => setModal("reset-profile")}>Reset Discovery</PlaceholderButton>
            <PlaceholderButton onClick={openReviewModal}>Jump to Review Screen</PlaceholderButton>
          </div>
        </CollapsibleCard>}
      </aside>
    </main>
    <footer className="bottom-bar"><div className="footer-graphic-slot" /><div><CollapsibleSection title="SESSION SHORTCUTS" collapsed={!!collapsedPanels["session-shortcuts"]} onToggle={() => togglePanel("session-shortcuts")}><span className="shortcut-grid"><button onClick={()=>{session.save();openPlaceholder("Progress saved on this device.")}}>Save Progress</button><button onClick={()=>openPlaceholder("Notes are coming soon.")}>Add Note</button><button onClick={()=>setTab("type")}>Ask Alice Anything</button><button onClick={()=>openPlaceholder("Topic navigation is coming soon.")}>Jump to Topic</button></span></CollapsibleSection></div><div className="next"><CollapsibleSection title="WHAT HAPPENS NEXT?" collapsed={!!collapsedPanels["whats-next"]} onToggle={() => togglePanel("whats-next")}><p>When you feel ready, you can turn your insights into a complete profile and choose opportunities that fit you.</p><button onClick={()=>openPlaceholder("Snapshot Profile generation is separate from live Discovery and is coming soon.")}>Generate Snapshot Profile →</button></CollapsibleSection></div><div><CollapsibleSection title="ALICE STATUS LEGEND" collapsed={!!collapsedPanels["status-legend"]} onToggle={() => togglePanel("status-legend")}><AliceStatusLegend/></CollapsibleSection></div></footer>
    {modal && <div className="modal-backdrop" onMouseDown={()=>setModal(null)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setModal(null)}><X/></button>{modal==="transcript"&&<><h2>Full Transcript</h2><div className="full-transcript">{session.turns.map(t=><p key={t.id}><b>{t.role==="participant"?"You":"Alice"}</b><time>{t.timestamp}</time>{t.text}</p>)}</div><button className="primary" onClick={exportTranscript}><Download/> Export Transcript</button></>}{modal==="placeholder"&&<><Lightbulb className="modal-icon"/><h2>{placeholder}</h2><p>This space is intentionally light in the Run 1 baseline.</p><button className="primary" onClick={()=>setModal(null)}>Got it</button></>}{modal==="reset-profile"&&<><RefreshCcw className="modal-icon"/><h2>Reset Discovery profile?</h2><p>This starts Discovery over with a fresh conversation and clears the current Oz captures. Your theme, voice mode, and Alice Prompt Mode preferences will stay the same.</p><div className="modal-actions"><button onClick={()=>setModal(null)}>Cancel</button><button className="primary" onClick={resetProfile}><RefreshCcw/> Reset Profile</button></div></>}{modal==="delete"&&<><Trash2 className="modal-icon danger"/><h2>Delete local Discovery data?</h2><p>This clears the transcript saved in this browser. This cannot be undone.</p><div className="modal-actions"><button onClick={()=>setModal(null)}>Cancel</button><button className="danger-button" onClick={clearData}>Delete My Data</button></div></>}{modal==="privacy"&&<><ShieldCheck className="modal-icon"/><h2>Privacy &amp; Trust</h2><p>Lighthouse is built around a simple principle: you should not have to surrender control of your story in order to be seen.</p><p>Your discovery profile may contain personal history, work experience, strengths, struggles, patterns, goals, and context that ordinary résumés often leave out. That kind of information deserves careful handling.</p><p>Lighthouse is designed to protect:</p><ul style={{margin:"0 0 14px",paddingLeft:"20px",fontSize:"12px",lineHeight:1.7}}><li>your privacy</li><li>your consent</li><li>your context</li><li>your right to review</li><li>your authority over representation</li><li>your ability to decide what is shared</li></ul><p>We do not treat your story as raw material to extract from you.</p><p>We do not sell your information.</p><p>We do not secretly rank you behind your back.</p><p>We do not turn your complexity into a hidden score.</p><p>The purpose of Lighthouse is to help you become more accurately understood, not to make you easier to reduce, filter, or exploit.</p><p>Before anything is shared outside your private workspace, you should know what is being shared, why it is being shared, and who it is being shared with.</p><p><b>Privacy is not an add-on here. It is part of the foundation.</b></p><button className="primary" onClick={()=>setModal(null)}>Got it</button></>}{modal==="insights"&&<><Sparkles className="modal-icon"/><h2>Discovery Insights</h2><p>These are patterns Alice is noticing as the conversation unfolds — not conclusions, not scores. You can confirm, refine, or redirect anything here.</p>{emergingThemes.length===0&&<p>Nothing has surfaced yet — keep talking with Alice and insights will start to appear here.</p>}{emergingThemes.map(theme=>{const evidence=(session.ozCapture?.evidenceItems??[]).filter(e=>theme.evidenceItemIds.includes(e.id));const band=themeSignalBand(theme.evidenceItemIds.length);return <div key={theme.id} style={{marginBottom:"18px",paddingBottom:"14px",borderBottom:"1px solid #e7eaf1"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:"10px"}}><b style={{fontSize:"13px"}}>{theme.title}</b><small style={{opacity:0.7,whiteSpace:"nowrap"}}>{band.label}</small></div><p style={{margin:"6px 0"}}>{theme.description}</p>{evidence.length>0&&<div style={{fontSize:"11px",opacity:0.8}}><b>What this is based on</b><ul style={{margin:"4px 0 0",paddingLeft:"18px"}}>{evidence.map(e=><li key={e.id}>&ldquo;{e.excerpt}&rdquo;</li>)}</ul></div>}{theme.uncertaintyNotes.length>0&&<p style={{fontSize:"11px",opacity:0.65,marginTop:"6px"}}>Still uncertain: {theme.uncertaintyNotes.join(" ")}</p>}</div>;})}<button className="primary" onClick={()=>setModal(null)}>Got it</button></>}
      {modal === "review" && (
        <div style={{ display: "grid", gap: "14px", textAlign: "left" }}>
          <h2>Review Discovery before generating a profile</h2>
          <p>This is your call. You can keep talking with Alice, or generate a profile now from what's been discovered so far. The diagram below shows how much of the schema each area of the conversation has touched — a rough guide, not a requirement.</p>
          <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", alignItems: "center" }}>
            <ConcentricProgressRings outerPercentage={schemaCoverage.coveragePercentage} innerPercentage={schemaCoverage.profileReadinessPercentage} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "6px", flex: 1, minWidth: "240px" }}>
              {schemaCoverage.fields.map(entry => (
                <div key={entry.field} style={{ display: "flex", justifyContent: "space-between", gap: "8px", padding: "6px 10px", borderRadius: "8px", border: "1px solid rgba(148,163,184,0.18)", fontSize: "0.78rem" }}>
                  <span>{DISCOVERY_FIELD_LABELS[entry.field]}</span>
                  <b style={{ color: entry.status === "filled" ? "#16a34a" : entry.status === "touched" ? "#ca8a04" : "#94a3b8" }}>{entry.status}</b>
                </div>
              ))}
            </div>
          </div>
          {reviewPhase === "decide" && (
            <div style={{ display: "grid", gap: "14px" }}>
              <div
                style={{
                  display: "grid",
                  gap: "8px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1px solid rgba(234,179,8,0.4)",
                  background: "rgba(234,179,8,0.1)",
                }}
              >
                <strong style={{ fontSize: "0.8rem", letterSpacing: "0.04em", textTransform: "uppercase", color: "#ca8a04" }}>
                  🛡 Participant Authority
                </strong>
                <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "0.88rem", lineHeight: 1.5 }}>
                  <input
                    type="checkbox"
                    checked={allowDevelopmentCopy}
                    onChange={(event) => setAllowDevelopmentCopy(event.target.checked)}
                    style={{ marginTop: "3px" }}
                  />
                  <span>
                    May Lighthouse keep a copy of this generated profile for development purposes? It will be
                    removed once that work is done. This is entirely optional — declining does not affect your
                    profile, your session, or anything else.
                  </span>
                </label>
              </div>
              <div className="modal-actions">
                <button onClick={() => setModal(null)}>Continue Discovery</button>
                <button className="primary" onClick={() => void generateProfileFromReview()}>Finish & Generate Profile</button>
              </div>
            </div>
          )}
          {reviewPhase === "authoring" && (
            <div style={{ display: "grid", justifyItems: "center", gap: "14px", padding: "20px 0" }}>
              <AliceAvatar status="loading" size="md" />
              <div className="authoring-progress-track">
                <div className="authoring-progress-fill" />
              </div>
              <p style={{ margin: 0, fontSize: "0.88rem", opacity: 0.85 }}>{AUTHORING_STAGE_MESSAGES[authoringStageIndex]}</p>
            </div>
          )}
          {reviewPhase === "error" && (
            <div><p style={{ color: "#b91c1c" }}>{authoringError}</p><button className="primary" onClick={() => void generateProfileFromReview()}>Try again</button></div>
          )}
          {reviewPhase === "authored" && authoredProfile && (
            <div style={{ display: "grid", gap: "12px" }}>
              <span style={{ fontSize: "0.8rem", opacity: 0.75 }}>Authored by <b>{authoredProfile.model}</b> (flagship text model — never the realtime voice model).</span>
              <div className="full-transcript" style={{ maxHeight: "30vh", overflowY: "auto" }}><p>{authoredProfile.fields.generatedProfile}</p></div>
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1px solid rgba(59,130,246,0.25)",
                  background: "rgba(59,130,246,0.08)",
                  fontSize: "0.85rem",
                  lineHeight: 1.55,
                }}
              >
                📬 When Lighthouse officially launches, we'll notify you by email. When you return, all you'll need
                to do is upload this profile artifact to have your permanent professional profile filled in
                automatically from today's session — no need to start over.
              </div>
              <label>Your name (for the profile)<input value={reviewName} onChange={e => setReviewName(e.target.value)} placeholder="Your name" /></label>
              <span>Choose a format for your emailed document:</span>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {(["pdf", "text"] as ExportFormat[]).map(format => (
                  <button key={format} className={exportFormat === format ? "primary" : ""} onClick={() => setExportFormat(format)}>
                    {format === "pdf" ? "PDF" : "Plain text"}
                  </button>
                ))}
              </div>
              {discoveryIdentity?.email ? (
                <span style={{ fontSize: "0.85rem" }}>
                  We'll send your finished profile to <b>{discoveryIdentity.email}</b>.{" "}
                  <button
                    type="button"
                    style={{ background: "none", border: "none", padding: 0, textDecoration: "underline", cursor: "pointer", fontSize: "inherit" }}
                    onClick={() => setDeliveryEmail(deliveryEmail === discoveryIdentity.email ? "" : discoveryIdentity.email)}
                  >
                    {deliveryEmail === discoveryIdentity.email ? "Use a different email" : "Use my sign-in email instead"}
                  </button>
                </span>
              ) : null}
              {(!discoveryIdentity?.email || deliveryEmail !== discoveryIdentity.email) && (
                <label>Email address to send the finished profile to<input type="email" value={deliveryEmail} onChange={e => setDeliveryEmail(e.target.value)} placeholder="you@example.com" /></label>
              )}
              <div className="modal-actions">
                <button onClick={downloadPlainTextProfile}>Download plain text</button>
                <button onClick={() => void handleDownloadPdf()} disabled={pdfDownloading}>{pdfDownloading ? "Preparing PDF…" : "Download PDF"}</button>
                <button className="primary" disabled={!deliveryEmail.trim() || deliverySending} onClick={() => void requestProfileDelivery()}>{deliverySending ? "Sending…" : "Email me this profile"}</button>
              </div>
              {pdfError && <span style={{ fontSize: "0.8rem", color: "#b91c1c" }}>{pdfError}</span>}
              {deliveryRequested && <span style={{ fontSize: "0.8rem", color: "#16a34a" }}>Sent! Check {deliveryEmail} for your profile (PDF attached).</span>}
              {deliveryError && <span style={{ fontSize: "0.8rem", color: "#b91c1c" }}>{deliveryError}</span>}

              <div
                style={{
                  marginTop: "8px",
                  paddingTop: "16px",
                  borderTop: "1px solid rgba(148,163,184,0.18)",
                  display: "grid",
                  gap: "10px",
                }}
              >
                <b style={{ fontSize: "0.95rem" }}>Before you go</b>
                {feedbackSubmitted ? (
                  <span style={{ fontSize: "0.85rem", color: "#16a34a" }}>
                    Thank you — your feedback has been shared and will be reviewed before it's used anywhere.
                  </span>
                ) : (
                  <>
                    <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                      Would you share what this experience was like for you? Optional — speak it or type it, whichever's easier.
                    </span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className={feedbackTab === "speak" ? "primary" : ""} onClick={() => setFeedbackTab("speak")}><Mic size={14} /> Speak</button>
                      <button className={feedbackTab === "type" ? "primary" : ""} onClick={() => setFeedbackTab("type")}><FileText size={14} /> Type</button>
                    </div>
                    {feedbackTab === "speak" && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <button
                          className={`record-button ${feedbackRecording ? "recording" : ""}`}
                          style={{ width: "40px", height: "40px" }}
                          onClick={feedbackRecording ? finishFeedbackRecording : startFeedbackRecording}
                          aria-label={feedbackRecording ? "Done speaking" : "Start recording feedback"}
                        >
                          {feedbackRecording ? <Square size={16} /> : <Mic size={16} />}
                        </button>
                        <span style={{ fontSize: "0.8rem", opacity: 0.75 }}>
                          {feedbackRecording ? "Listening…" : feedbackTranscribing ? "Transcribing…" : "Tap to record, tap again when done"}
                        </span>
                      </div>
                    )}
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="What stood out, what felt off, anything at all…"
                      style={{ minHeight: "70px", borderRadius: "8px", border: "1px solid rgba(148,163,184,0.3)", padding: "8px 10px", fontFamily: "inherit" }}
                    />
                    <div
                      style={{
                        display: "grid",
                        gap: "8px",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid rgba(234,179,8,0.4)",
                        background: "rgba(234,179,8,0.1)",
                      }}
                    >
                      <label style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontSize: "0.82rem", lineHeight: 1.5 }}>
                        <input type="checkbox" checked={feedbackConsent} onChange={(e) => setFeedbackConsent(e.target.checked)} style={{ marginTop: "3px" }} />
                        <span>🛡 May Lighthouse use this as a testimonial? It will be reviewed before it's ever shown anywhere, and this is entirely optional.</span>
                      </label>
                    </div>
                    <div className="modal-actions">
                      <button disabled={!feedbackText.trim() || feedbackSubmitting} className="primary" onClick={() => void submitFeedback()}>
                        {feedbackSubmitting ? "Sending…" : "Share feedback"}
                      </button>
                    </div>
                    {feedbackError && <span style={{ fontSize: "0.8rem", color: "#b91c1c" }}>{feedbackError}</span>}
                  </>
                )}
              </div>

              <button onClick={() => setModal(null)}>Back to conversation</button>
            </div>
          )}
        </div>
      )}</div></div>}
    {showTourPrompt && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(2,6,23,0.55)",
        }}
      >
        <div
          style={{
            width: "min(360px, 90vw)",
            borderRadius: "18px",
            padding: "24px",
            background: "rgba(15,23,42,0.97)",
            border: "1px solid rgba(250,204,21,0.35)",
            color: "#e2e8f0",
            textAlign: "center",
            display: "grid",
            gap: "14px",
          }}
        >
          <div style={{ fontSize: "1.15rem", fontWeight: 800 }}>New here?</div>
          <div style={{ fontSize: "0.9rem", color: "rgba(226,232,240,0.85)", lineHeight: 1.6 }}>
            Want a quick tour of how Discovery works before you get started?
          </div>
          <div style={{ display: "grid", gap: "10px" }}>
            <button
              type="button"
              onClick={() => {
                setShowTourPrompt(false);
                startGuidedTour();
              }}
              style={{
                padding: "12px 16px",
                borderRadius: "14px",
                border: "1px solid rgba(250,204,21,0.5)",
                background: "rgba(250,204,21,0.18)",
                color: "#fde68a",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Yes, show me around
            </button>
            <button
              type="button"
              onClick={() => setShowTourPrompt(false)}
              style={{
                padding: "12px 16px",
                borderRadius: "14px",
                border: "1px solid rgba(148,163,184,0.24)",
                background: "rgba(255,255,255,0.04)",
                color: "#e2e8f0",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              No thanks
            </button>
          </div>
        </div>
      </div>
    )}
    {tourState === "waiting" && <GuidedTourWaitingOverlay onCancel={() => setTourState("idle")} />}
    {tourState === "active" && <GuidedTour key={tourKey} onClose={() => setTourState("idle")} />}
  </div>;
}

function Info({icon,title,text}:{icon:React.ReactNode;title:string;text:string}) { return <div className="info-row"><i>{icon}</i><span><b>{title}</b><small>{text}</small></span></div>; }
