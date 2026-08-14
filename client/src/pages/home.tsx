
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Users, Play, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSocket, connectSocket } from "@/lib/socket";

export default function Home() {
  const [, setLocation] = useLocation();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter your name to create a game room.",
      });
      return;
    }
    setIsCreating(true);
    connectSocket();
    const socket = getSocket();
    socket.emit("create_room", playerName.trim(), (newRoomCode: string) => {
      setIsCreating(false);
      // Remember our name for this room so reconnect/reload keeps the same identity.
      try {
        sessionStorage.setItem(`lsu_name_${newRoomCode}`, playerName.trim());
      } catch {
        /* ignore storage errors */
      }
      setLocation(`/game/${newRoomCode}?created=true`); // ✅ updated with created=true
    });
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter your name to join a game.",
      });
      return;
    }
    if (!roomCode.trim()) {
      toast({
        variant: "destructive",
        title: "Room code required",
        description: "Please enter a room code to join.",
      });
      return;
    }
    setIsJoining(true);
    connectSocket();
    const socket = getSocket();
    socket.emit(
      "join_room",
      roomCode.trim().toUpperCase(),
      playerName.trim(),
      (success: boolean, error?: string) => {
        setIsJoining(false);
        if (success) {
          const code = roomCode.trim().toUpperCase();
          // Remember our name for this room so reconnect/reload keeps the same identity.
          try {
            sessionStorage.setItem(`lsu_name_${code}`, playerName.trim());
          } catch {
            /* ignore storage errors */
          }
          setLocation(`/game/${code}`);
        } else {
          toast({
            variant: "destructive",
            title: "Failed to join room",
            description: error ?? "Unable to join the game room. Please try again.",
          });
        }
      }
    );
  };

  return (

    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Let's Speak Up
            </h1>
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            A Demo Version for Facilitators!
          </p>
        </div>

        {/* Player Name Input */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Your Name
            </CardTitle>
            <CardDescription>Enter your name to start playing</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              data-testid="input-player-name"
              type="text"
              placeholder="Enter your name..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && playerName.trim()) {
                  handleCreateRoom();
                }
              }}
              maxLength={20}
              className="text-lg"
            />
          </CardContent>
        </Card>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Create Room */}
          <Card className="border-2 hover-elevate transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" />
                Create New Game
              </CardTitle>
              <CardDescription>Start a new game room; 3–6 players</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                data-testid="button-create-room"
                onClick={handleCreateRoom}
                disabled={!playerName.trim() || isCreating}
                className="w-full"
                size="lg"
              >
                {isCreating ? "Creating..." : "Create Room"}
              </Button>
            </CardContent>
          </Card>

          {/* Join Room */}
          <Card className="border-2 hover-elevate transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Join Existing Game
              </CardTitle>
              <CardDescription>Enter a room code to join a game</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room-code">Room Code</Label>
                <Input
                  data-testid="input-room-code"
                  id="room-code"
                  type="text"
                  placeholder="e.g., CD0T51"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && playerName.trim() && roomCode.trim()) {
                      handleJoinRoom();
                    }
                  }}
                  maxLength={6}
                  className="uppercase"
                />
              </div>
              <Button
                data-testid="button-join-room"
                onClick={handleJoinRoom}
                disabled={!playerName.trim() || !roomCode.trim() || isJoining}
                className="w-full"
                size="lg"
                variant="secondary"
              >
                {isJoining ? "Joining..." : "Join Room"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Game Rules */}
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-lg">How to Play</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                1
              </span>
              <p>Each player starts with 6 cards: 1 Role Card, 1 Context Card and 4 Statement Cards.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                2
              </span>
              <p>On your turn (Active Player), select one card from each deck to create a set and secretly rate it as "Promotes" if you think it promotes psychological safety or "Hinders" if you think it hinders psychological safety.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                3
              </span>
              <p>The other players will secretly rate the Active Player's card set.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                4
              </span>
              <p>After all ratings are submitted, see who matched the Active Player's rating!</p>             
            </div>
<div className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-red/10 text-primary font-semibold text-xs">
                NOTE:
              </span>
              <p>This online version is a simplified adaptation of the Let's Speak Up card game. It is intended solely for training purposes and must be used exclusively during a facilitated training session.</p>             
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
