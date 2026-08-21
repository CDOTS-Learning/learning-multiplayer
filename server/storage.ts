import type { GameState, Persona, Backpack } from "@shared/schema";
import { TOTAL_ROUNDS, ROUNDS, PERSONA_QUESTIONS, PERSONA_INTAKE_LAST, emptyPersona, ITEM_BY_ID, MAX_ITEMS } from "@shared/content";

const MAX_PLAYERS = 5;
const MIN_PLAYERS = 2;

export function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

type JoinResult =
  | { ok: true; action: "joined" | "reconnected" | "already_member" }
  | { ok: false; reason: "not_found" | "full" | "not_waiting" | "duplicate_name" };

export class MemStorage {
  private rooms: Map<string, GameState> = new Map();

  /** The facilitator creates the room and holds the facilitator seat. */
  createRoom(facilitatorId: string, facilitatorName: string): string {
    const roomCode = generateRoomCode();
    const state: GameState = {
      roomCode,
      phase: "waiting",
      players: [],
      facilitator: { id: facilitatorId, name: facilitatorName, isConnected: true },
      round: 0,
      totalRounds: TOTAL_ROUNDS,
      choices: [],
      answers: [],
      maxPlayers: MAX_PLAYERS,
      controllerId: "",
      persona: emptyPersona(),
      personaStep: 0,
      personaAnswers: new Array(TOTAL_ROUNDS).fill(-1),
      personaRoundQ: 0,
      demo: [],
      backpacks: [],
      sharedBackpack: [],
      maxItems: MAX_ITEMS,
    };
    this.rooms.set(roomCode, state);
    return roomCode;
  }

  getRoom(roomCode: string): GameState | undefined {
    return this.rooms.get(roomCode);
  }

  /**
   * Claim (or reclaim, on reconnect) the single facilitator seat. Because only
   * the room creator ever navigates to the facilitator view, we simply hand the
   * seat to whoever joins as facilitator and update the socket id.
   */
  joinFacilitator(roomCode: string, socketId: string, name: string): JoinResult {
    const room = this.rooms.get(roomCode);
    if (!room) return { ok: false, reason: "not_found" };
    const isReconnect = !!room.facilitator;
    room.facilitator = { id: socketId, name, isConnected: true };
    return { ok: true, action: isReconnect ? "reconnected" : "joined" };
  }

  /**
   * Add a new player or reconnect an existing one (matched by name), updating
   * their socket id. Same-name returners always reclaim their seat once the game
   * has started; a name clash is only blocked between two different people who
   * are both present in the lobby.
   */
  addOrReconnectPlayer(roomCode: string, socketId: string, name: string): JoinResult {
    const room = this.rooms.get(roomCode);
    if (!room) return { ok: false, reason: "not_found" };

    const byId = room.players.find((p) => p.id === socketId);
    if (byId) {
      byId.isConnected = true;
      return { ok: true, action: "already_member" };
    }

    const byName = room.players.find((p) => p.name === name);
    if (byName) {
      if (byName.isConnected && room.phase === "waiting") {
        return { ok: false, reason: "duplicate_name" };
      }
      if (room.controllerId === byName.id) room.controllerId = socketId; // keep the pen after a reconnect
      byName.id = socketId;
      byName.isConnected = true;
      return { ok: true, action: "reconnected" };
    }

    if (room.players.length >= room.maxPlayers) return { ok: false, reason: "full" };
    if (room.phase !== "waiting") return { ok: false, reason: "not_waiting" };

    room.players.push({ id: socketId, name, isConnected: true });
    return { ok: true, action: "joined" };
  }

  /** Find a room where this socket is a player. */
  getRoomByPlayerId(playerId: string): GameState | undefined {
    return Array.from(this.rooms.values()).find((room) =>
      room.players.some((p) => p.id === playerId)
    );
  }

  /** Find a room where this socket is a player OR the facilitator. */
  getRoomByAnyId(id: string): GameState | undefined {
    return Array.from(this.rooms.values()).find(
      (room) => room.facilitator?.id === id || room.players.some((p) => p.id === id)
    );
  }

  isFacilitator(roomCode: string, id: string): boolean {
    const room = this.rooms.get(roomCode);
    return !!room && room.facilitator?.id === id;
  }

  /** Mark a socket (player or facilitator) connected/disconnected. */
  setConnected(id: string, isConnected: boolean): GameState | undefined {
    const room = this.getRoomByAnyId(id);
    if (!room) return undefined;
    if (room.facilitator?.id === id) room.facilitator.isConnected = isConnected;
    const player = room.players.find((p) => p.id === id);
    if (player) player.isConnected = isConnected;
    return room;
  }

  /** Facilitator starts the game from the lobby. Needs >= MIN_PLAYERS connected. */
  startGame(roomCode: string, byId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.phase !== "waiting") return false;
    if (room.facilitator?.id !== byId) return false;
    const connected = room.players.filter((p) => p.isConnected).length;
    if (connected < MIN_PLAYERS) return false;
    room.phase = "selecting";
    room.round = 1;
    room.choices = [];
    room.answers = [];
    room.persona = emptyPersona();
    room.personaStep = 0;
    room.personaAnswers = new Array(room.totalRounds).fill(-1);
    room.personaRoundQ = 0;
    room.controllerId = "";
    room.demo = [];
    room.backpacks = [];
    room.sharedBackpack = [];
    return true;
  }

  private firstPlayerId(room: GameState): string {
    return room.players.find((p) => p.isConnected)?.id ?? room.facilitator?.id ?? "";
  }

  /** Record the current round's picks (by player name) for the final board. */
  private snapshotRound(room: GameState): void {
    room.answers = room.answers.filter((a) => a.round !== room.round);
    for (const c of room.choices) {
      const player = room.players.find((p) => p.id === c.playerId);
      if (player) {
        room.answers.push({ round: room.round, playerName: player.name, optionIndex: c.optionIndex });
      }
    }
  }

  /** A player picks one option this round. Auto-reveals once everyone has picked. */
  choose(roomCode: string, playerId: string, optionIndex: number): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.phase !== "selecting") return false;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return false; // facilitator (or stranger) can't pick

    const options = ROUNDS[room.round - 1]?.options;
    if (!options || optionIndex < 0 || optionIndex >= options.length) return false;

    const existing = room.choices.find((c) => c.playerId === playerId);
    if (existing) existing.optionIndex = optionIndex;
    else room.choices.push({ playerId, optionIndex });

    // Reveal automatically once every connected player has locked in a pick.
    const connected = room.players.filter((p) => p.isConnected);
    const chosen = connected.filter((p) => room.choices.some((c) => c.playerId === p.id));
    if (connected.length > 0 && chosen.length === connected.length) {
      room.phase = "revealing";
      this.snapshotRound(room);
    }
    return true;
  }

  /** Facilitator fallback: reveal even if someone hasn't picked (e.g. dropped off). */
  revealNow(roomCode: string, byId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.phase !== "selecting") return false;
    if (room.facilitator?.id !== byId) return false;
    room.phase = "revealing";
    this.snapshotRound(room);
    return true;
  }

  /** Facilitator moves on: next round, or into the shared persona after the last one. */
  nextRound(roomCode: string, byId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.phase !== "revealing") return false;
    if (room.facilitator?.id !== byId) return false;
    if (room.round < room.totalRounds) {
      room.round += 1;
      room.choices = [];
      room.phase = "selecting";
    } else {
      // Individual reflection done → overview, then the facilitator drives the rest.
      room.phase = "reflectionSelfBoard";
    }
    return true;
  }

  private getBackpack(room: GameState, playerName: string): Backpack {
    let bp = room.backpacks.find((b) => b.playerName === playerName);
    if (!bp) {
      bp = { playerName, items: [] };
      room.backpacks.push(bp);
    }
    return bp;
  }

  /** Which backpack the current phase edits, and who may edit it. */
  private backpackTarget(room: GameState, byId: string): string[] | null {
    if (room.phase === "backpackDemo") return room.facilitator?.id === byId ? room.demo : null;
    if (room.phase === "backpackBuilding1") {
      const player = room.players.find((p) => p.id === byId);
      return player ? this.getBackpack(room, player.name).items : null;
    }
    if (room.phase === "backpackBuilding2") {
      const controller = room.controllerId || this.firstPlayerId(room);
      return byId === controller ? room.sharedBackpack : null;
    }
    return null;
  }

  addItem(roomCode: string, byId: string, itemId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || !ITEM_BY_ID[itemId]) return false;
    const target = this.backpackTarget(room, byId);
    if (!target) return false;
    if (target.includes(itemId) || target.length >= room.maxItems) return false;
    target.push(itemId);
    return true;
  }

  removeItem(roomCode: string, byId: string, itemId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    const target = this.backpackTarget(room, byId);
    if (!target) return false;
    const i = target.indexOf(itemId);
    if (i === -1) return false;
    target.splice(i, 1);
    return true;
  }

  /** Persona intake: the current driver edits the shared persona. */
  setPersona(roomCode: string, byId: string, persona: Persona): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.phase !== "persona") return false;
    const controller = room.controllerId || this.firstPlayerId(room);
    if (byId !== controller) return false;
    const answers = PERSONA_QUESTIONS.map((q, i) => {
      const v = Math.floor(Number(persona?.answers?.[i]));
      return Number.isFinite(v) && v >= 0 && v < q.options.length ? v : -1;
    });
    const otherTexts = PERSONA_QUESTIONS.map((_, i) => String(persona?.otherTexts?.[i] ?? "").slice(0, 120));
    room.persona = {
      name: String(persona?.name ?? "").slice(0, 60),
      answers,
      otherTexts,
      comment: String(persona?.comment ?? "").slice(0, 600),
    };
    return true;
  }

  /** persona / personaRound / shared backpack: grab the pen (any player or the facilitator). */
  takeControl(roomCode: string, id: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || (room.phase !== "persona" && room.phase !== "personaRound" && room.phase !== "backpackBuilding2")) return false;
    const isMember = room.facilitator?.id === id || room.players.some((p) => p.id === id);
    if (!isMember) return false;
    room.controllerId = id;
    return true;
  }

  /** personaRound: the driver picks the group's shared answer for the current question. */
  choosePersona(roomCode: string, byId: string, optionIndex: number): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.phase !== "personaRound") return false;
    const controller = room.controllerId || this.firstPlayerId(room);
    if (byId !== controller) return false;
    const options = ROUNDS[room.personaRoundQ]?.options;
    if (!options || optionIndex < 0 || optionIndex >= options.length) return false;
    room.personaAnswers[room.personaRoundQ] = optionIndex;
    return true;
  }

  /** Facilitator drives the whole post-reflection flow forward. */
  flowNext(roomCode: string, byId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.facilitator?.id !== byId) return false;
    switch (room.phase) {
      case "reflectionSelfBoard": room.phase = "backpackDemo"; return true;
      case "backpackDemo": room.phase = "backpackBuilding1"; return true;
      case "backpackBuilding1": room.phase = "backpackSelfBoard"; return true;
      case "backpackSelfBoard":
        room.phase = "persona";
        room.personaStep = 0;
        room.controllerId = this.firstPlayerId(room);
        return true;
      case "persona":
        if (room.personaStep < PERSONA_INTAKE_LAST) room.personaStep += 1;
        else room.phase = "personaReveal";
        return true;
      case "personaReveal": room.phase = "personaRound"; room.personaRoundQ = 0; return true;
      case "personaRound":
        if (room.personaRoundQ < room.totalRounds - 1) room.personaRoundQ += 1;
        else room.phase = "reflectionCompare";
        return true;
      case "reflectionCompare":
        room.phase = "backpackBuilding2";
        room.controllerId = this.firstPlayerId(room);
        return true;
      case "backpackBuilding2": room.phase = "backpackCompare"; return true;
      case "backpackCompare": room.phase = "ended"; return true;
      default: return false;
    }
  }

  /** Facilitator steps back through the post-reflection flow. */
  flowBack(roomCode: string, byId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.facilitator?.id !== byId) return false;
    switch (room.phase) {
      case "backpackDemo": room.phase = "reflectionSelfBoard"; return true;
      case "backpackBuilding1": room.phase = "backpackDemo"; return true;
      case "backpackSelfBoard": room.phase = "backpackBuilding1"; return true;
      case "persona":
        if (room.personaStep > 0) { room.personaStep -= 1; return true; }
        room.phase = "backpackSelfBoard"; return true;
      case "personaReveal": room.phase = "persona"; room.personaStep = PERSONA_INTAKE_LAST; return true;
      case "personaRound":
        if (room.personaRoundQ > 0) { room.personaRoundQ -= 1; return true; }
        room.phase = "personaReveal"; return true;
      case "reflectionCompare": room.phase = "personaRound"; room.personaRoundQ = room.totalRounds - 1; return true;
      case "backpackBuilding2": room.phase = "reflectionCompare"; return true;
      case "backpackCompare": room.phase = "backpackBuilding2"; return true;
      case "ended": room.phase = "backpackCompare"; return true;
      default: return false;
    }
  }

  /** Facilitator skips the current block (persona creation is never skippable). */
  skip(roomCode: string, byId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.facilitator?.id !== byId) return false;
    const p = room.phase;
    if (p === "selecting" || p === "revealing" || p === "reflectionSelfBoard") {
      room.phase = "backpackDemo"; return true;
    }
    if (p === "backpackDemo" || p === "backpackBuilding1" || p === "backpackSelfBoard") {
      room.phase = "persona"; room.personaStep = 0; room.controllerId = this.firstPlayerId(room); return true;
    }
    if (p === "personaRound" || p === "reflectionCompare") {
      room.phase = "backpackBuilding2"; room.controllerId = this.firstPlayerId(room); return true;
    }
    if (p === "backpackBuilding2" || p === "backpackCompare") {
      room.phase = "ended"; return true;
    }
    return false; // persona / personaReveal are not skippable
  }

  /** Facilitator can run the session again with the same group. */
  restart(roomCode: string, byId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.facilitator?.id !== byId) return false;
    room.phase = "waiting";
    room.round = 0;
    room.choices = [];
    room.answers = [];
    room.persona = emptyPersona();
    room.personaStep = 0;
    room.personaAnswers = new Array(room.totalRounds).fill(-1);
    room.personaRoundQ = 0;
    room.controllerId = "";
    room.demo = [];
    room.backpacks = [];
    room.sharedBackpack = [];
    return true;
  }
}

export const storage = new MemStorage();
