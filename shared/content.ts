// Static game content — shared by client (rendering) and server (validation).
// Three fixed rounds, always in this order, with a fixed pool of answers each.

export interface RoundContent {
  topic: string;
  options: string[];
}

// The umbrella framing that sits over all three rounds.
export const FRAMING = {
  intro: "You are about to enrol into a training: what do you hope to find?",
  note: "Keep one card per round — three rounds.",
  standing: "…what do you hope to find?",
};

export const ROUNDS: RoundContent[] = [
  {
    topic: "What learning activities matter most to you?",
    options: [
      "Practical exercises",
      "Expert knowledge",
      "Peer discussion",
      "Reflection time",
      "Job aids & resources",
    ],
  },
  {
    topic: "How long are you expecting the training to be, and how is that time distributed?",
    options: [
      "Short and efficient (one-timer)",
      "Deep and comprehensive (series of short sessions)",
      "Deep and comprehensive (one long immersive session)",
      "Short and self-paced",
      "Deep and comprehensive and self-paced",
      "Blended: self-learning objectives + in-person scheduled session",
    ],
  },
  {
    topic: "What would make this training a success?",
    options: [
      "Knowledge gained",
      "Behaviour change",
      "Team performance",
      "Learner satisfaction",
      "Organizational impact",
    ],
  },
];

// Every reflection question ends with an open "Other" choice that reveals a
// free-text field, so people can give an answer that isn't in the list.
for (const r of ROUNDS) {
  if (!r.options.includes("Other")) r.options = [...r.options, "Other"];
}

/** Display text for a reflection answer — the chosen option, or the free text when "Other". */
export function roundOptionText(question: number, optionIndex: number, otherText?: string): string | null {
  const opts = ROUNDS[question]?.options;
  if (!opts || optionIndex == null || optionIndex < 0 || optionIndex >= opts.length) return null;
  const opt = opts[optionIndex];
  if (opt === "Other") return (otherText ?? "").trim() || "Other";
  return opt;
}

export const TOTAL_ROUNDS = ROUNDS.length;

// ---------------------------------------------------------------------------
// Learning-persona intake: a short name, then 11 single-choice questions, then
// an open comment field. The group builds ONE shared persona (one driver at a
// time via take-control). Shared by client (rendering) and server (validation).
// ---------------------------------------------------------------------------

export interface PersonaQuestion {
  label: string;
  prompt: string;
  options: string[];
  allowOther?: boolean;
}

export const PERSONA_QUESTIONS: PersonaQuestion[] = [
  {
    label: "Role & Level",
    prompt: "Which category best describes the learner?",
    options: [
      "General Service (GS)",
      "National Professional Officer (NPO)",
      "Professional (P1–P2)",
      "Professional (P3–P5)",
      "Director (D1–D2)",
      "Senior Leader (ASG/USG)",
      "Consultant / Individual Contractor",
      "UN Volunteer (UNV)",
    ],
  },
  {
    label: "Primary Responsibilities",
    prompt: "What do they spend most of their time doing?",
    options: [
      "Programme coordination",
      "Project management",
      "Team leadership",
      "Stakeholder engagement",
      "Policy development",
      "Technical advisory",
      "Data analysis and reporting",
      "Operations support",
      "Administrative support",
      "Capacity development and training",
      "Field operations",
    ],
  },
  {
    label: "Years of UN Experience",
    prompt: "How long have they worked in the UN system?",
    options: ["Less than 2 years", "2–5 years", "6–10 years", "11–20 years", "More than 20 years"],
  },
  {
    label: "Topic Expertise",
    prompt: "How familiar are they with the topic?",
    options: ["New to the topic", "Basic awareness", "Working knowledge", "Advanced practitioner", "Subject matter expert"],
  },
  {
    label: "This Learning…",
    prompt: "What value does this learning provide to the learner?",
    options: [
      "Improves job performance",
      "Solves a current work challenge",
      "Meets a compliance requirement",
      "Supports team effectiveness",
      "Prepares for greater responsibilities",
      "Advances career development",
      "Increases confidence on the topic",
      "Improves programme or operational results",
    ],
  },
  {
    label: "Work Setting",
    prompt: "Where do they typically work?",
    options: ["Headquarters", "Regional Office", "Country Office", "Field Duty Station", "Hybrid", "Fully remote", "Frequently travelling"],
  },
  {
    label: "Primary Language",
    prompt: "Which language are they most comfortable using?",
    options: ["English", "French", "Spanish", "Arabic", "Russian", "Chinese", "Other"],
    allowOther: true,
  },
  {
    label: "Internet Access",
    prompt: "What is their level of connectivity?",
    options: ["Fully connected", "Generally connected", "Occasionally disconnected", "Connectivity-constrained", "Mobile-first access"],
  },
  {
    label: "Learning Availability",
    prompt: "How much time can they realistically dedicate to learning?",
    options: [
      "Less than 30 minutes per week",
      "30–60 minutes per week",
      "1–2 hours per week",
      "2–4 hours per week",
      "More than 4 hours per week",
    ],
  },
  {
    label: "Biggest Challenge",
    prompt: "What is their biggest barrier to success?",
    options: [
      "Lacks time for learning",
      "Has competing priorities",
      "Has limited prior knowledge",
      "Lacks confidence on the topic",
      "Has unreliable internet access",
      "Receives limited manager support",
      "Struggles to apply learning to the job",
      "Feels overwhelmed by information",
    ],
  },
  {
    label: "Biggest Goal",
    prompt: "What are they trying to achieve?",
    options: [
      "Works more efficiently",
      "Delivers stronger programme results",
      "Builds professional expertise",
      "Gains confidence in their role",
      "Leads others more effectively",
      "Supports teams more effectively",
      "Advances their career",
      "Better serves partners and beneficiaries",
    ],
  },
];

// Every persona question ends with "N/A" (not applicable) and an open "Other"
// choice that reveals a free-text field.
for (const q of PERSONA_QUESTIONS) {
  const base = q.options.filter((o) => o !== "Other" && o !== "N/A");
  q.options = [...base, "N/A", "Other"];
  q.allowOther = true;
}

export interface PersonaData {
  name: string;
  answers: number[];      // one option index per PERSONA_QUESTIONS entry; -1 = unanswered
  otherTexts: string[];   // per-question free text, used when that question's answer is "Other"
  comment: string;        // 12th open field
}

export function emptyPersona(): PersonaData {
  return { name: "", answers: PERSONA_QUESTIONS.map(() => -1), otherTexts: PERSONA_QUESTIONS.map(() => ""), comment: "" };
}

export function personaValue(p: PersonaData, i: number): string {
  const q = PERSONA_QUESTIONS[i];
  const idx = p.answers?.[i];
  if (idx == null || idx < 0 || idx >= q.options.length) return "";
  const opt = q.options[idx];
  if (opt === "Other") return (p.otherTexts?.[i] ?? "").trim() || "Other";
  return opt;
}

// ---------------------------------------------------------------------------
// Backpack task: a fixed pool of objects to pack (3 things for the journey).
// ---------------------------------------------------------------------------

export const BACKPACK_FRAMING = {
  intro: "Imagine you are going on a learning journey.",
  question: "What three things would you put in your backpack to ensure success?",
};

export interface BackpackItem {
  id: string;
  name: string;
}

export const ITEMS: BackpackItem[] = [
  { id: "map", name: "Map" },
  { id: "compass", name: "Compass" },
  { id: "flashlight", name: "Flashlight" },
  { id: "tent", name: "Tent" },
  { id: "notebook", name: "Notebook" },
  { id: "star", name: "North star" },
  { id: "firstaid", name: "First-aid kit" },
  { id: "binoculars", name: "Binoculars" },
  { id: "water", name: "Water bottle" },
  { id: "snacks", name: "Snacks" },
  { id: "matches", name: "Matches" },
  { id: "boots", name: "Boots" },
  { id: "powerbank", name: "Powerbank" },
  { id: "swissknife", name: "Swiss knife" },
];

export const ITEM_BY_ID: Record<string, BackpackItem> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// A packed slot can be a preset item id OR a free-text "something else" the
// person names themselves, stored as "custom:<their text>".
export const CUSTOM_PREFIX = "custom:";
export const CUSTOM_MAX_LEN = 40;
export function isCustomItem(id: string): boolean {
  return typeof id === "string" && id.startsWith(CUSTOM_PREFIX);
}
export function customItemText(id: string): string {
  return isCustomItem(id) ? id.slice(CUSTOM_PREFIX.length) : "";
}
/** Display name for any packed slot — preset or custom. */
export function itemName(id: string): string {
  if (isCustomItem(id)) return customItemText(id).trim() || "Something else";
  return ITEM_BY_ID[id]?.name ?? id;
}

export const MAX_ITEMS = 3;

export function personaRows(p: PersonaData): { label: string; value: string }[] {
  return PERSONA_QUESTIONS.map((q, i) => ({ label: q.label, value: personaValue(p, i) }));
}

export function personaPlainText(p: PersonaData): string {
  const lines = [`Learning persona — ${p.name || "—"}`];
  personaRows(p).forEach((r) => lines.push(`${r.label}: ${r.value || "—"}`));
  if (p.comment.trim()) lines.push(`Other comments: ${p.comment.trim()}`);
  return lines.join("\n");
}

// The intake is a facilitator-driven counter: 0 = name, 1..N = the N questions,
// last = the open comment. (LAST = PERSONA_QUESTIONS.length + 1.)
export const PERSONA_INTAKE_LAST = PERSONA_QUESTIONS.length + 1;

export function personaIntakeInfo(step: number): { kind: "personaName" | "personaQuestion" | "personaComment"; index: number } {
  if (step <= 0) return { kind: "personaName", index: -1 };
  if (step >= PERSONA_INTAKE_LAST) return { kind: "personaComment", index: -1 };
  return { kind: "personaQuestion", index: step - 1 };
}
