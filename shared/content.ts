// Static game content — shared by client (rendering) and server (validation).
// Three fixed rounds, always in this order, with a fixed pool of answers each.

export interface RoundContent {
  topic: string;             // question from the "yourself" perspective
  topicPersona: string;      // question from the persona perspective
  topicNeutral?: string;     // person-neutral wording for side-by-side comparisons (falls back to `topic`)
  options: string[];         // answer options (self perspective)
  optionsPersona?: string[]; // answer options for the persona perspective (falls back to `options`)
}

// The umbrella framing that sits over all three rounds.
export const FRAMING = {
  intro: "You are about to enrol into a training: what do you hope to find?",
  note: "Keep one card per round — three rounds.",
  standing: "…what do you hope to find?",
};

export const ROUNDS: RoundContent[] = [
  {
    topic: "What mattered most to you?",
    topicPersona: "What would matter most to them?",
    topicNeutral: "What mattered most?",
    options: [
      "Having the opportunity to practice through activities or exercises.",
      "Engaging in meaningful discussions with peers.",
      "Gaining valuable insights from an expert.",
      "Having dedicated time for reflection.",
      "Receiving personalized feedback or coaching.",
      "Solving real-world challenges relevant to me.",
      "Being exposed to new ideas and perspectives.",
      "Working collaboratively with others on a shared task.",
    ],
  },
  {
    topic: "What was the experience structure?",
    topicPersona: "What should be the experience structure?",
    options: [
      "Short and focused (single in-person session).",
      "Deep and comprehensive (series of shorter in-person sessions).",
      "Deep and comprehensive (single immersive in-person session).",
      "Short and self-paced (online course).",
      "Deep and comprehensive, self-paced (extended online course).",
      "Blended learning (mix of online and live sessions).",
    ],
  },
  {
    topic: "What made this experience impactful?",
    topicPersona: "What would make this experience impactful?",
    options: [
      "It changed the behaviour.",
      "I learned something new.",
      "It helped me work more efficiently.",
      "It increased my confidence in my role.",
      "It helped me solve a real challenge I was facing.",
      "It strengthened my relationships or collaboration with others.",
      "It motivated me to continue learning.",
      "It contributed to my professional growth or career development.",
    ],
    optionsPersona: [
      "It changed the behaviour.",
      "They learned something new.",
      "It helped them to work more efficiently.",
      "It increased confidence in their role.",
      "It helped them to solve a real challenge they were facing.",
      "It strengthened their relationships or collaboration with others.",
      "It motivated them to continue learning.",
      "It contributed to their professional growth or career development.",
    ],
  },
];

// Every reflection question ends with an open "Other" choice that reveals a
// free-text field, so people can give an answer that isn't in the list.
for (const r of ROUNDS) {
  if (!r.options.includes("Other")) r.options = [...r.options, "Other"];
  if (r.optionsPersona && !r.optionsPersona.includes("Other")) r.optionsPersona = [...r.optionsPersona, "Other"];
}

/** The question wording for a perspective (0 = yourself, 1 = the persona). */
export function roundTopic(question: number, perspective: number): string {
  const r = ROUNDS[question];
  return perspective === 1 ? r.topicPersona : r.topic;
}

/** Person-neutral question wording, used for side-by-side comparison boards. */
export function roundTopicNeutral(question: number): string {
  const r = ROUNDS[question];
  return r.topicNeutral ?? r.topic;
}

/** The answer options for a perspective (0 = yourself, 1 = the persona). */
export function roundOptions(question: number, perspective: number): string[] {
  const r = ROUNDS[question];
  return perspective === 1 ? (r.optionsPersona ?? r.options) : r.options;
}

/** Display text for a reflection answer — the chosen option, or the free text when "Other". */
export function roundOptionText(question: number, perspective: number, optionIndex: number, otherText?: string): string | null {
  const opts = roundOptions(question, perspective);
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
  maxSelect: number;    // 1 = single choice; >1 = pick up to this many
}

/** The single catch-all option; picking it reveals a free-text field. */
export const PERSONA_OTHER = "Other/I don’t know/Not applicable";
export function isOtherOption(option: string): boolean {
  return option.startsWith("Other");
}

export const PERSONA_QUESTIONS: PersonaQuestion[] = [
  {
    label: "Role & Level",
    prompt: "Which category best describes the learner?",
    maxSelect: 2,
    options: [
      "General Service (GS)",
      "National Professional Officer (NPO)",
      "Professional (P1-P2)",
      "Professional (P3-P5)",
      "Director (D1-D2)",
      "Senior Leader (ASG/USG)",
      "Consultant / Individual Contractor",
      "UN Volunteer (UNV)",
      PERSONA_OTHER,
    ],
  },
  {
    label: "Primary Responsibilities",
    prompt: "What do they spend most of their time doing?",
    maxSelect: 2,
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
      PERSONA_OTHER,
    ],
  },
  {
    label: "Years of UN Experience",
    prompt: "How long have they worked in the UN system?",
    maxSelect: 1,
    options: [
      "Less than 2 years",
      "2-5 years",
      "6-10 years",
      "11-20 years",
      "More than 20 years",
      PERSONA_OTHER,
    ],
  },
  {
    label: "Topic Expertise",
    prompt: "How familiar are they with the topic?",
    maxSelect: 1,
    options: [
      "New to the topic",
      "Basic awareness",
      "Working knowledge",
      "Advanced practitioner",
      "Subject matter expert",
      PERSONA_OTHER,
    ],
  },
  {
    label: "This Learning Solution",
    prompt: "What value does this learning solution provide to the learner?",
    maxSelect: 2,
    options: [
      "Improves job performance",
      "Solves a current work challenge",
      "Meets a compliance requirement",
      "Supports team effectiveness",
      "Prepares for greater responsibilities",
      "Advances career development",
      "Increases confidence on the topic",
      "Improves programme or operational results",
      PERSONA_OTHER,
    ],
  },
  {
    label: "Work Setting",
    prompt: "Where do they typically work?",
    maxSelect: 2,
    options: [
      "Headquarters",
      "Regional Office",
      "Country Office",
      "Field Duty Station",
      "Hybrid",
      "Fully remote",
      "Frequently travelling",
      PERSONA_OTHER,
    ],
  },
  {
    label: "Primary Language",
    prompt: "Which language are they most comfortable using?",
    maxSelect: 1,
    options: [
      "English",
      "French",
      "Spanish",
      "Arabic",
      "Russian",
      "Chinese",
      PERSONA_OTHER,
    ],
  },
  {
    label: "Internet Access",
    prompt: "What is their level of connectivity?",
    maxSelect: 1,
    options: [
      "Fully connected",
      "Generally connected",
      "Occasionally disconnected",
      "Connectivity-constrained",
      "Mobile-first access",
      PERSONA_OTHER,
    ],
  },
  {
    label: "Communication Channels",
    prompt: "Where is this learner most likely to find out about learning opportunities?",
    maxSelect: 3,
    options: [
      "Email / broadcast messages",
      "iSeek / UN intranet",
      "Microsoft Teams",
      "Viva Engage / internal communities",
      "UN Knowledge Gateway",
      "Manager or supervisor",
      "Colleagues / word of mouth",
      "Communities of practice / professional networks",
      "Town halls / staff meetings / events",
      "Learning platform / learning catalogue",
      PERSONA_OTHER,
    ],
  },
  {
    label: "Learning Availability",
    prompt: "How much time can they realistically dedicate to learning?",
    maxSelect: 1,
    options: [
      "Less than 30 minutes per week",
      "30-60 minutes per week",
      "1-2 hours per week",
      "2-4 hours per week",
      "More than 4 hours per week",
      PERSONA_OTHER,
    ],
  },
  {
    label: "Biggest Challenge",
    prompt: "What is their biggest barrier to success?",
    maxSelect: 1,
    options: [
      "Lacks time for learning",
      "Has competing priorities",
      "Has limited prior knowledge",
      "Lacks confidence on the topic",
      "Has unreliable internet access",
      "Receives limited manager support",
      "Feels overwhelmed by information",
      "Struggles to apply learning to the job",
      PERSONA_OTHER,
    ],
  },
  {
    label: "Biggest Goal",
    prompt: "What are they trying to achieve?",
    maxSelect: 1,
    options: [
      "Work more efficiently",
      "Deliver stronger programme results",
      "Build professional expertise",
      "Gain confidence in their role",
      "Lead others more effectively",
      "Support teams more effectively",
      "Advance their career",
      "Better serve partners and beneficiaries",
      PERSONA_OTHER,
    ],
  },
];

export interface PersonaData {
  name: string;
  answers: number[][];   // selected option indices per question (multi-select)
  otherTexts: string[];   // per-question free text, used when that question's answer is "Other"
  comment: string;        // 12th open field
}

export function emptyPersona(): PersonaData {
  return { name: "", answers: PERSONA_QUESTIONS.map(() => []), otherTexts: PERSONA_QUESTIONS.map(() => ""), comment: "" };
}

export function personaValues(p: PersonaData, i: number): string[] {
  const q = PERSONA_QUESTIONS[i];
  const sel = p.answers?.[i] ?? [];
  return sel
    .filter((idx) => idx >= 0 && idx < q.options.length)
    .map((idx) => {
      const opt = q.options[idx];
      if (isOtherOption(opt)) return (p.otherTexts?.[i] ?? "").trim() || opt;
      return opt;
    });
}

/** All chosen values for a question, joined for display ("" if unanswered). */
export function personaValue(p: PersonaData, i: number): string {
  return personaValues(p, i).join(" · ");
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
  { id: "clock", name: "Clock" },
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
