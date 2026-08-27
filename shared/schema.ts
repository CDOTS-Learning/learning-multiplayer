import { z } from "zod";

// A participant who picks one card per round.
export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  isConnected: z.boolean(),
});
export type Player = z.infer<typeof playerSchema>;

// The facilitator: creates the room, steers the session, does NOT pick cards.
export const facilitatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  isConnected: z.boolean(),
});
export type Facilitator = z.infer<typeof facilitatorSchema>;

// One player's pick for the CURRENT round (index into that round's options).
export const choiceSchema = z.object({
  playerId: z.string(),
  optionIndex: z.number(),
  otherText: z.string().optional(), // free text used when the chosen option is "Other"
});
export type Choice = z.infer<typeof choiceSchema>;

// A recorded answer, kept across ALL rounds for the final overview board.
// Keyed by player NAME (stable across reconnects, unlike the socket id).
export const answerSchema = z.object({
  round: z.number(),
  playerName: z.string(),
  optionIndex: z.number(),
  otherText: z.string().optional(),
});
export type Answer = z.infer<typeof answerSchema>;

// The perspective-3 learning persona the group builds together (name + 11
// single-choice answers + an open comment).
export const personaSchema = z.object({
  name: z.string(),
  answers: z.array(z.number()),  // one option index per persona question; -1 = unanswered
  otherTexts: z.array(z.string()),// per-question free text, used when the answer is "Other"
  comment: z.string(),           // 12th open field
});
export type Persona = z.infer<typeof personaSchema>;

// One player's OWN persona during the solo build (phase personaSolo), plus a
// "done" flag they set when they've finished their intake.
export const playerPersonaSchema = z.object({
  playerName: z.string(),
  persona: personaSchema,
  done: z.boolean(),
});
export type PlayerPersona = z.infer<typeof playerPersonaSchema>;

// One player's individual backpack (their own "self" packing).
export const backpackSchema = z.object({
  playerName: z.string(),
  items: z.array(z.string()),
});
export type Backpack = z.infer<typeof backpackSchema>;

export type GamePhase =
  | "waiting"             // Lobby
  | "selecting"           // Individual reflection: everyone picks one card (in private)
  | "revealing"           // Individual reflection: picks are shown; the group discusses
  | "reflectionSelfBoard" // Overview: everyone's reflection answers, side by side
  | "backpackDemo"        // Facilitator packs an example backpack
  | "backpackBuilding1"   // Everyone packs their OWN backpack
  | "backpackSelfBoard"   // Overview: everyone's backpacks, side by side
  | "personaSolo"         // Each player builds their OWN persona (individually)
  | "personaAgree"        // The group agrees on ONE final persona, field by field
  | "personaReveal"       // "Meet your persona" break card
  | "personaRound"        // Answering the reflection questions together as the persona
  | "reflectionCompare"   // Overview: the persona's answers vs everyone's
  | "backpackBuilding2"   // One shared backpack for the persona
  | "backpackCompare"     // Overview: the persona's backpack vs everyone's
  | "ended";              // All done — closing summary

export type Role = "player" | "facilitator";

// Complete game state broadcast to everyone in a room.
export const gameStateSchema = z.object({
  roomCode: z.string(),
  phase: z.string() as z.ZodType<GamePhase>,
  players: z.array(playerSchema),
  facilitator: facilitatorSchema.nullable(),
  round: z.number(),          // 0 in the lobby, 1..totalRounds during play
  totalRounds: z.number(),
  choices: z.array(choiceSchema), // picks for the CURRENT round only
  answers: z.array(answerSchema), // all picks across rounds, for the final board
  maxPlayers: z.number(),
  // ---- Shared learning persona (phases persona / personaReveal / personaRound) ----
  controllerId: z.string(),        // who currently holds the pen (a player, or the facilitator)
  persona: personaSchema,          // the group's AGREED final persona (built in personaAgree)
  personas: z.array(playerPersonaSchema), // each player's OWN persona (built in personaSolo)
  personaStep: z.number(),         // agreement cursor: 0 name, 1..N questions, LAST comment
  personaAnswers: z.array(z.number()), // the group's shared answer per reflection question; -1 = none
  personaOtherTexts: z.array(z.string()), // free text per persona-round question when the answer is "Other"
  personaRoundQ: z.number(),       // which reflection question the persona round is on
  // ---- Backpack task ----
  demo: z.array(z.string()),           // the facilitator's demo backpack (item ids)
  backpacks: z.array(backpackSchema),  // each player's OWN backpack
  sharedBackpack: z.array(z.string()), // the group's shared persona backpack
  maxItems: z.number(),
});
export type GameState = z.infer<typeof gameStateSchema>;

// ---- Socket.IO event contracts (imported by both server and client) ----
export interface ServerToClientEvents {
  game_state: (state: GameState) => void;
  error: (message: string) => void;
  player_joined: (name: string) => void;
  player_left: (name: string) => void;
}
export interface ClientToServerEvents {
  create_room: (name: string, callback: (roomCode: string) => void) => void;
  join_room: (
    roomCode: string,
    name: string,
    role: Role,
    callback: (success: boolean, error?: string) => void
  ) => void;
  start_game: () => void;
  choose: (optionIndex: number, otherText?: string) => void;
  reveal_now: () => void;
  next_round: () => void;
  restart: () => void;
  // ---- Shared persona + backpack ----
  take_control: () => void;                 // grab the pen (personaAgree / personaRound / shared backpack)
  set_persona: (persona: Persona) => void;  // edit your OWN persona (personaSolo) or the shared one (personaAgree driver)
  persona_ready: (ready: boolean) => void;  // mark your own persona done/undone (personaSolo)
  choose_persona: (optionIndex: number, otherText?: string) => void; // the driver picks the group's answer in personaRound
  add_item: (itemId: string) => void;       // pack an item (demo / own backpack / shared backpack)
  remove_item: (itemId: string) => void;    // take an item back out
  flow_next: () => void;                     // facilitator advances the post-reflection flow
  flow_back: () => void;                     // facilitator steps back
  skip: () => void;                          // facilitator skips the current block
}
