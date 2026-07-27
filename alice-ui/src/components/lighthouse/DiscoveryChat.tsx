import { Send } from "lucide-react";
import { useState } from "react";
import type { ConversationMessage } from "../../engine/discoveryState";
import Button from "./Button";

type DiscoveryChatProps = {
  messages: ConversationMessage[];
  busy: boolean;
  onSend: (content: string) => void;
};

export default function DiscoveryChat({ messages, busy, onSend }: DiscoveryChatProps) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    const content = draft.trim();
    if (!content || busy) return;
    setDraft("");
    onSend(content);
  };

  return (
    <section className="discovery-chat" aria-label="Discovery transcript">
      <div className="transcript">
        {messages.map((message) => (
          <article key={message.id} className={`message message--${message.role}`}>
            <p className="message__role">{message.role === "alice" ? "Alice" : "You"}</p>
            <p>{message.content}</p>
          </article>
        ))}
        {busy && (
          <article className="message message--alice">
            <p className="message__role">Alice</p>
            <p>Alice is listening and forming the next open question.</p>
          </article>
        )}
      </div>
      <div className="chat-input">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Type your response..."
          rows={3}
        />
        <Button icon={<Send size={18} />} onClick={submit} disabled={busy || !draft.trim()} type="button">
          Send
        </Button>
      </div>
    </section>
  );
}

