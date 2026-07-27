import { FileText, Flag, Pause, Play, Square } from "lucide-react";
import { useState } from "react";
import { sendDiscoveryMessage } from "../engine/aliceApiClient";
import type { ConversationMessage, DiscoverySession, DiscoveryStage } from "../engine/discoveryState";
import AliceOrb from "../components/lighthouse/AliceOrb";
import Button from "../components/lighthouse/Button";
import Card from "../components/lighthouse/Card";
import DiscoveryChat from "../components/lighthouse/DiscoveryChat";
import VoiceControls from "../components/lighthouse/VoiceControls";

type SessionPageProps = {
  session: DiscoverySession;
  onUpdate: (updates: Partial<DiscoverySession>) => void;
  onNavigate: (stage: DiscoveryStage) => void;
};

function createMessage(role: ConversationMessage["role"], content: string): ConversationMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function localAliceReply(content: string) {
  if (content.length < 80) {
    return "That gives us a starting point. Could you choose one real example and tell me what was happening around it?";
  }
  return "I'm hearing useful context in that. What did you notice first, and what changed because of the way you approached it?";
}

export default function SessionPage({ session, onUpdate, onNavigate }: SessionPageProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async (content: string) => {
    setError("");
    const participantMessage = createMessage("participant", content);
    const nextMessages = [...session.messages, participantMessage];
    onUpdate({ messages: nextMessages });
    setBusy(true);

    try {
      const reply = await sendDiscoveryMessage(nextMessages);
      onUpdate({ messages: [...nextMessages, createMessage("alice", reply)] });
    } catch (chatError) {
      const reply = localAliceReply(content);
      onUpdate({ messages: [...nextMessages, createMessage("alice", reply)] });
      setError(chatError instanceof Error ? chatError.message : "Using local Discovery fallback.");
    } finally {
      setBusy(false);
    }
  };

  const orbState = session.paused ? "thoughtful" : busy ? "happy" : "calm";

  return (
    <div className="session-layout">
      <aside className="session-sidebar">
        <Card>
          <p className="eyebrow">Discovery Context</p>
          <AliceOrb size="medium" state={orbState} />
          <VoiceControls session={session} onChange={onUpdate} compact />
        </Card>
        <Card>
          <h2>Session notes</h2>
          <div className="note-list">
            {session.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </Card>
      </aside>
      <Card className="session-main">
        <div className="session-header">
          <div>
            <p className="eyebrow">Discovery Session</p>
            <h1>Human Clarity Interview</h1>
          </div>
          <div className="action-row">
            <Button
              variant="secondary"
              icon={session.paused ? <Play size={17} /> : <Pause size={17} />}
              onClick={() => onUpdate({ paused: !session.paused })}
            >
              {session.paused ? "Resume" : "Pause"}
            </Button>
            <Button variant="ghost" icon={<Square size={17} />} onClick={() => onNavigate("ready")}>
              End Discovery
            </Button>
            <Button icon={<FileText size={17} />} onClick={() => onNavigate("profile")}>
              Generate Profile
            </Button>
          </div>
        </div>
        {error && <p className="inline-notice">{error} The conversation remains available locally.</p>}
        <DiscoveryChat messages={session.messages} busy={busy || session.paused} onSend={handleSend} />
      </Card>
      <aside className="session-sidebar">
        <Card>
          <h2>Open questions</h2>
          <div className="question-list">
            {[
              "What connects these experiences?",
              "Where does the résumé leave out useful context?",
              "What would you want someone to understand before deciding?",
            ].map((question) => (
              <p key={question}>
                <Flag size={16} />
                <span>{question}</span>
              </p>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  );
}
