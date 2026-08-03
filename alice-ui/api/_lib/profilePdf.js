import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const e = React.createElement;

// Mirrors src/services/ozSchemaCoverage.ts's OZ_SCHEMA_AREA_LABELS.
// Duplicated here so this serverless function has no fragile cross-file
// import chain.
const OZ_SCHEMA_AREA_LABELS = {
  capabilities: "What they're capable of",
  constraints: "What limits or constrains them",
  preferences: "How they like to work",
  motivations: "What motivates them",
  environment_fit: "The environments where they fit best",
  relationships: "How they relate to and work with others",
  values: "What matters most to them",
  decision_making: "How they make decisions",
  uncertainty: "What's still uncertain or unconfirmed",
  other: "Other notable observations",
};

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 48, paddingHorizontal: 44, fontSize: 11, fontFamily: "Helvetica", color: "#1f2937" },
  headerEyebrow: { fontSize: 9, letterSpacing: 2, color: "#b8860b", marginBottom: 4, textTransform: "uppercase" },
  headerTitle: { fontSize: 20, color: "#0f172a", marginBottom: 4, fontFamily: "Helvetica-Bold" },
  headerSub: { fontSize: 10, color: "#6b7280", marginBottom: 20 },
  summaryBox: { backgroundColor: "#fff8e6", borderWidth: 1, borderColor: "#f2d98a", borderRadius: 6, padding: 12, marginBottom: 16 },
  summaryLabel: { fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#92700c", marginBottom: 4, fontFamily: "Helvetica-Bold" },
  summaryText: { fontSize: 11, lineHeight: 1.5 },
  section: { marginBottom: 12, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 10 },
  sectionLabel: { fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#b8860b", marginBottom: 4, fontFamily: "Helvetica-Bold" },
  sectionText: { fontSize: 10.5, lineHeight: 1.5 },
  narrativeHeading: { fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#6b7280", marginTop: 20, marginBottom: 8, fontFamily: "Helvetica-Bold" },
  narrativeText: { fontSize: 10.5, lineHeight: 1.6 },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, fontSize: 8, color: "#9ca3af", textAlign: "center" },
});

function buildDocument(participantName, profile) {
  const sections = Object.entries(OZ_SCHEMA_AREA_LABELS)
    .filter(([key]) => Boolean(profile[key]))
    .map(([key, label]) =>
      e(View, { key, style: styles.section },
        e(Text, { style: styles.sectionLabel }, label),
        e(Text, { style: styles.sectionText }, profile[key])
      )
    );

  return e(Document, null,
    e(Page, { size: "A4", style: styles.page },
      e(Text, { style: styles.headerEyebrow }, "Project Lighthouse"),
      e(Text, { style: styles.headerTitle }, "Discovery Profile"),
      e(Text, { style: styles.headerSub }, participantName ? `Prepared for ${participantName}` : "Discovery Profile"),
      profile.discoverySummary
        ? e(View, { style: styles.summaryBox },
            e(Text, { style: styles.summaryLabel }, "Summary"),
            e(Text, { style: styles.summaryText }, profile.discoverySummary)
          )
        : null,
      ...sections,
      profile.generatedProfile
        ? e(View, null,
            e(Text, { style: styles.narrativeHeading }, "Full Narrative"),
            e(Text, { style: styles.narrativeText }, profile.generatedProfile)
          )
        : null,
      e(Text, { style: styles.footer, render: ({ pageNumber, totalPages }) => `Lighthouse Discovery — Page ${pageNumber} of ${totalPages}`, fixed: true })
    )
  );
}

export async function renderProfilePdf(participantName, profile) {
  const doc = buildDocument(participantName, profile);
  return renderToBuffer(doc);
}
