import { generateProfileSections } from "../../engine/profileGenerator";
import type { ConversationMessage, MaterialItem } from "../../engine/discoveryState";

type ProfileReviewProps = {
  messages: ConversationMessage[];
  materials: MaterialItem[];
};

export default function ProfileReview({ messages, materials }: ProfileReviewProps) {
  const sections = generateProfileSections(messages, materials);

  return (
    <div className="profile-review">
      {sections.map((section) => (
        <section key={section.title} className="profile-section">
          <h3>{section.title}</h3>
          <p>{section.body}</p>
        </section>
      ))}
    </div>
  );
}

