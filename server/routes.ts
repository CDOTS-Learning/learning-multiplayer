import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { storage } from "./storage";
import type { ServerToClientEvents, ClientToServerEvents, CardSet } from "@shared/schema";

// Type-safe Socket.IO server
type TypedServer = SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  const io: TypedServer = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // If you have a fixed client URL on Render, set it here
      methods: ["GET", "POST"],
    },
    // Be a bit more tolerant of short network hiccups before marking a player
    // "offline". Defaults are pingInterval 25s / pingTimeout 20s; we allow up to
    // 40s without a heartbeat so brief WiFi drops don't flip players offline.
    pingInterval: 25000,
    pingTimeout: 40000,
  });

  function emitGameState(roomCode: string): void {
    const gameState = storage.getRoom(roomCode);
    if (gameState) {
      io.to(roomCode).emit("game_state", gameState);
    }
  }

  io.on("connection", (socket: TypedSocket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Host creates a room
    socket.on("create_room", (playerName: string, callback: (roomCode: string) => void) => {
      try {
        const roomCode = storage.createRoom(socket.id, playerName);
        socket.join(roomCode);

        console.log(`[Socket.IO] Room created: ${roomCode} by ${playerName}`);
        callback(roomCode);

        // Send snapshot directly to host and broadcast
        const state = storage.getRoom(roomCode);
        if (state) socket.emit("game_state", state);
        emitGameState(roomCode);
      } catch (error) {
        console.error("[Socket.IO] Error creating room:", error);
        socket.emit("error", "Failed to create room");
      }
    });

    // Player (or Facilitator) joins existing room
    socket.on(
      "join_room",
      (roomCode: string, playerName: string, callback: (success: boolean, error?: string) => void) => {
        try {
          const room = storage.getRoom(roomCode);
          if (!room) return callback(false, "Room not found");

          // Always join the Socket.IO room so this socket receives broadcasts
          socket.join(roomCode);

          // Facilitator is read-only observer (no player entry)
          if (playerName === "Facilitator") {
            callback(true);
            const state = storage.getRoom(roomCode);
            if (state) socket.emit("game_state", state);
            emitGameState(roomCode);
            return;
          }

          // Add or reconnect player (handles duplicate-name reconnection and id changes)
          const res = storage.addOrReconnectPlayer(roomCode, socket.id, playerName);

          if (!res.ok) {
            // Avoid ghost membership if we joined above
            socket.leave(roomCode);
            switch (res.reason) {
              case "not_found":
                return callback(false, "Room not found");
              case "full":
                return callback(false, "Unable to join room. Room is full.");
              case "not_waiting":
                return callback(false, "Unable to join. Game already started.");
              case "duplicate_name":
                return callback(false, "Name already in use. Choose a different name.");
              default:
                return callback(false, "Unable to join room.");
            }
          }

          // Notify others only when it's a genuine new join
          if (res.action === "joined") {
            socket.to(roomCode).emit("player_joined", playerName);
          } else if (res.action === "reconnected") {
            // Optional: announce reconnection, or keep silent
            // socket.to(roomCode).emit("player_joined", `${playerName} reconnected`);
          }

          // Ack + fresh snapshot to the joiner, then broadcast
          callback(true);
          const state = storage.getRoom(roomCode);
          if (state) socket.emit("game_state", state);
          emitGameState(roomCode);
        } catch (error) {
          console.error("[Socket.IO] Error joining room:", error);
          callback(false, "An error occurred while joining the room");
        }
      }
    );

    // Start game (typically the host)
    socket.on("start_game", () => {
      try {
        const gameState = storage.getRoomByPlayerId(socket.id);
        if (!gameState) {
          socket.emit("error", "You are not in a game");
          return;
        }

        const success = storage.startGame(gameState.roomCode);
        if (!success) {
          socket.emit(
            "error",
            "Failed to start game. Make sure there are enough players and the game hasn't already started."
          );
          return;
        }

        console.log(`[Socket.IO] Game started in room ${gameState.roomCode}`);
        emitGameState(gameState.roomCode);
      } catch (error) {
        console.error("[Socket.IO] Error starting game:", error);
        socket.emit("error", "An error occurred while starting the game");
      }
    });

    // Active player selects cards
    socket.on("select_cards", (cards: CardSet, rating: "promotes" | "hinders") => {
      try {
        const gameState = storage.getRoomByPlayerId(socket.id);
        if (!gameState) {
          socket.emit("error", "You are not in a game");
          return;
        }

        const success = storage.selectCards(gameState.roomCode, socket.id, cards, rating);
        if (!success) {
          socket.emit("error", "Failed to select cards. Make sure it's your turn.");
          return;
        }

        console.log(`[Socket.IO] Player ${socket.id} selected cards in room ${gameState.roomCode}`);
        emitGameState(gameState.roomCode);
      } catch (error) {
        console.error("[Socket.IO] Error selecting cards:", error);
        socket.emit("error", "An error occurred while selecting cards");
      }
    });

    // Non-active players submit rating
    socket.on("submit_rating", (rating: "promotes" | "hinders") => {
      try {
        const gameState = storage.getRoomByPlayerId(socket.id);
        if (!gameState) {
          socket.emit("error", "You are not in a game");
          return;
        }

        const success = storage.submitRating(gameState.roomCode, socket.id, rating);
        if (!success) {
          socket.emit("error", "Failed to submit rating");
          return;
        }

        console.log(`[Socket.IO] Player ${socket.id} submitted rating in room ${gameState.roomCode}`);
        emitGameState(gameState.roomCode);
      } catch (error) {
        console.error("[Socket.IO] Error submitting rating:", error);
        socket.emit("error", "An error occurred while submitting rating");
      }
    });

    // Move to next round
    socket.on("next_round", () => {
      try {
        const gameState = storage.getRoomByPlayerId(socket.id);
        if (!gameState) {
          socket.emit("error", "You are not in a game");
          return;
        }

        const success = storage.nextRound(gameState.roomCode);
        if (!success) {
          socket.emit("error", "Failed to start next round");
          return;
        }

        console.log(`[Socket.IO] Next round started in room ${gameState.roomCode}`);
        emitGameState(gameState.roomCode);
      } catch (error) {
        console.error("[Socket.IO] Error starting next round:", error);
        socket.emit("error", "An error occurred while starting next round");
      }
    });

    // Disconnect handling
    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      try {
        const gameState = storage.getRoomByPlayerId(socket.id);
        if (gameState) {
          const player = gameState.players.find((p) => p.id === socket.id);
          if (player) {
            console.log(`[Socket.IO] Disconnecting player: ${player.name} from room ${gameState.roomCode}`);
            storage.updatePlayerConnection(gameState.roomCode, socket.id, false);
            socket.to(gameState.roomCode).emit("player_left", player.name);
            emitGameState(gameState.roomCode);
          }
        }
      } catch (error) {
        console.error("[Socket.IO] Error handling disconnect:", error);
      }
    });
  });

  return httpServer;
}
