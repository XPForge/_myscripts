import { ResumeProfile } from "./ResumeEngine";

export const paulProfile: ResumeProfile = {
  name: "Paul Dwinell",
  title: "Technical + Creative Systems Specialist",

  summarySeed:
    "I naturally gravitate toward figuring out how systems work, improving processes, and solving problems that slow people down.",

  strengths: [
    "troubleshooting",
    "production",
    "creative",
    "design",
    "workflow",
    "systems",
    "printing",
    "process improvement",
  ],

  experiences: [
    {
      company: "Shutterfly",
      title: "Digital Print Press Operator",
      years: "2025",
      highlights: [
        "Worked with HP Indigo production systems.",
        "Handled troubleshooting and production flow optimization.",
      ],
      tags: ["printing", "production", "technician"],
    },

    {
      company: "U.S. Air Force",
      title: "F-16 Crew Chief",
      years: "4 Years",
      highlights: [
        "Performed diagnostics and maintenance on F-16 systems.",
        "Developed strong troubleshooting and systems-thinking abilities.",
      ],
      tags: ["technical", "systems", "diagnostics", "technician"],
    },

    {
      company: "Digital Tech Frontier",
      title: "Creative Technologist",
      years: "15 Years",
      highlights: [
        "Built AR/VR educational experiences.",
        "Handled graphics, prototyping, and interactive media production.",
      ],
      tags: ["creative", "design", "technology"],
    },
  ],
};
