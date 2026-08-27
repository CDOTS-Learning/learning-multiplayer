import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getSocket, connectSocket, disconnectSocket } from "@/lib/socket";
import type { GameState, Role, Persona } from "@shared/schema";

/**
 * Shared room connection for both the player and facilitator views.
 * Handles connect, join, reconnection (keeping the same name so the returning
 * person reclaims their seat) and exposes the actions each view needs.
 */
export function useRoom(roomCode: string, role: Role) {
  const [, setLocation] = useLocation();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState("");
  const [error, setError] = useState("");

  const search = new URLSearchParams(window.location.search);
  const rawName = (search.get("name") || "").trim();
  const nameKey = `tg_name_${roomCode}`;
  const storedName =
    typeof sessionStorage !== "undefined" ? (sessionStorage.getItem(nameKey) || "").trim() : "";
  const name = rawName || storedName || (role === "facilitator" ? "Facilitator" : "");

  useEffect(() => {
    if (!roomCode) {
      setLocation("/");
      return;
    }
    // A player who arrives without a name (e.g. opened a bare room link) is sent
    // back to the entry screen with the code prefilled, so they can name themselves.
    if (role === "player" && !name) {
      setLocation(`/?code=${roomCode}`);
      return;
    }

    connectSocket();
    const socket = getSocket();

    const onState = (state: GameState) => setGameState(state);
    const onError = (message: string) => setError(message);

    socket.on("game_state", onState);
    socket.on("error", onError);

    const doJoin = () => {
      setMyId(socket.id ?? "");
      socket.emit("join_room", roomCode, name, role, (ok: boolean, err?: string) => {
        if (!ok) {
          setError(err || "Unable to join the session.");
          setTimeout(() => setLocation("/"), 1800);
        }
      });
    };

    // Re-run on EVERY (re)connect so a reconnect after a blocking print/idle
    // refreshes our socket id and re-claims our seat cleanly.
    if (socket.connected) doJoin();
    socket.on("connect", doJoin);
    socket.io.on("reconnect", doJoin);

    return () => {
      socket.off("game_state", onState);
      socket.off("error", onError);
      socket.off("connect", doJoin);
      socket.io.off("reconnect", doJoin);
      disconnectSocket();
    };
  }, [roomCode, role, name, setLocation]);

  // Keep our name for this room so a reload / reconnect keeps the same identity.
  useEffect(() => {
    if (roomCode && name) {
      try {
        sessionStorage.setItem(nameKey, name);
      } catch {
        /* ignore storage errors */
      }
    }
  }, [roomCode, name, nameKey]);

  const socket = getSocket();
  return {
    gameState,
    myId,
    name,
    error,
    clearError: () => setError(""),
    start: () => socket.emit("start_game"),
    choose: (i: number) => socket.emit("choose", i),
    revealNow: () => socket.emit("reveal_now"),
    nextRound: () => socket.emit("next_round"),
    restart: () => socket.emit("restart"),
    takeControl: () => socket.emit("take_control"),
    setPersona: (persona: Persona) => socket.emit("set_persona", persona),
    personaReady: (ready: boolean) => socket.emit("persona_ready", ready),
    choosePersona: (i: number) => socket.emit("choose_persona", i),
    addItem: (id: string) => socket.emit("add_item", id),
    removeItem: (id: string) => socket.emit("remove_item", id),
    flowNext: () => socket.emit("flow_next"),
    flowBack: () => socket.emit("flow_back"),
    skip: () => socket.emit("skip"),
    leave: () => setLocation("/"),
    copyCode: () => {
      try {
        navigator.clipboard?.writeText(roomCode);
      } catch {
        /* ignore */
      }
    },
  };
}
