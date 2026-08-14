import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { getSocket, connectSocket, disconnectSocket } from "@/lib/socket";
import type { GameState } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PlayerList } from "@/components/player-list";
import { GameCard } from "@/components/game-card";

export default function Facilitator() {
  const [, params] = useRoute("/facilitator/:roomCode");
  const roomCode = params?.roomCode ?? "";

  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    connectSocket();
    const socket = getSocket();

    socket.emit("join_room", roomCode, "Facilitator", () => {
      // Facilitator joins silently
    });

    socket.on("game_state", (state: GameState) => {
      setGameState(state);
    });

    return () => {
      socket.off("game_state");
      disconnectSocket();
    };
  }, [roomCode]);

  if (!gameState) {
    return <div className="p-6 text-center">Connecting to game...</div>;
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold">Facilitator View</h1>
        <p className="text-muted-foreground">Room: {roomCode}</p>
        <p className="text-muted-foreground">Round: {gameState.round}</p>
        <Badge variant="outline">Phase: {gameState.phase}</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Players</CardTitle>
        </CardHeader>
        <CardContent>
          <PlayerList
            players={gameState.players}
            currentPlayerId={currentPlayer?.id}
            myPlayerId="facilitator"
          />
        </CardContent>
      </Card>

      {gameState.selectedCards && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Cards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <GameCard card={gameState.selectedCards.deck1Card} isSelected={false} />
              <GameCard card={gameState.selectedCards.deck2Card} isSelected={false} />
              <GameCard card={gameState.selectedCards.deck3Card} isSelected={false} />
            </div>
            <Separator />
            <p className="text-sm text-muted-foreground">
              Ratings submitted: {gameState.ratings.length} / {gameState.players.length}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
