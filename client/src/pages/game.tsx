import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { getSocket, connectSocket, disconnectSocket } from "@/lib/socket";
import type { GameState, Card as CardType, CardSet } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Copy, Check } from "lucide-react";
import { GameCard } from "@/components/game-card";
import { PlayerList } from "@/components/player-list";
import { RatingPanel } from "@/components/rating-panel";
import { ResultsPanel } from "@/components/results-panel";
import { WaitingRoom } from "@/components/waiting-room";
import { GameTimer } from "@/components/game-timer";

export default function Game() {
  const [, params] = useRoute("/game/:roomCode");
  const [, setLocation] = useLocation();
  const roomCode = params?.roomCode ?? "";
  const search = new URLSearchParams(window.location.search);

  // Identity: facilitator if ?name=Facilitator OR ?role=fac
  const rawName = (search.get("name") || "").trim();
  const roleParam = (search.get("role") || "").trim().toLowerCase();

  // Remember the player's name per browser tab so that a reconnect or a page
  // reload keeps the SAME identity. Without this we'd rejoin as "Anonymous",
  // the server wouldn't recognise the returning player, and (mid-game) would
  // lock them out. sessionStorage is per-tab, so multiple tabs can each keep
  // their own name.
  const nameStorageKey = `lsu_name_${roomCode}`;
  const storedName =
    typeof sessionStorage !== "undefined" ? (sessionStorage.getItem(nameStorageKey) || "").trim() : "";

  const resolvedName = rawName.length > 0 ? rawName : storedName.length > 0 ? storedName : "Anonymous";
  const isFacilitator = resolvedName.toLowerCase() === "facilitator" || roleParam === "fac";
  const playerName = resolvedName;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>("");
  const [selectedCards, setSelectedCards] = useState<{ deck1?: CardType; deck2?: CardType; deck3?: CardType }>({});
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!roomCode) {
      setLocation("/");
      return;
    }

    connectSocket();
    const socket = getSocket();

    const onGameState = (state: GameState) => setGameState(state);
    const onError = (message: string) =>
      toast({ variant: "destructive", title: "Error", description: message });
    const onPlayerJoined = (name: string) =>
      toast({ title: "Player joined", description: `${name} has joined the game.` });
    const onPlayerLeft = (name: string) =>
      toast({ title: "Player left", description: `${name} has left the game.` });

    socket.on("game_state", onGameState);
    socket.on("error", onError);
    socket.on("player_joined", onPlayerJoined);
    socket.on("player_left", onPlayerLeft);

    const doJoin = () => {
      // socket.id is valid after connect/reconnect
      setMyPlayerId(socket.id);

      socket.emit("join_room", roomCode, isFacilitator ? "Facilitator" : playerName, (success: boolean, error?: string) => {
        if (!success) {
          toast({
            variant: "destructive",
            title: "Failed to join room",
            description: error ?? "Unknown error",
          });
          setLocation("/");
        }
      });
    };

    if (socket.connected) doJoin();
    else socket.once("connect", doJoin);

    socket.io.on("reconnect", doJoin);

    // Clean up listeners and connection
    return () => {
      socket.off("game_state", onGameState);
      socket.off("error", onError);
      socket.off("player_joined", onPlayerJoined);
      socket.off("player_left", onPlayerLeft);
      socket.off("connect", doJoin);
      socket.io.off("reconnect", doJoin);
      disconnectSocket();
    };
  }, [roomCode, playerName, isFacilitator, setLocation, toast]);

  // Persist a real (non-anonymous) name so future reconnects/reloads reuse it.
  useEffect(() => {
    if (roomCode && playerName && playerName !== "Anonymous") {
      try {
        sessionStorage.setItem(nameStorageKey, playerName);
      } catch {
        /* ignore storage errors (private mode, etc.) */
      }
    }
  }, [roomCode, playerName, nameStorageKey]);

  // If the room was created by this browser and has ?created=true, strip it for a clean share link
  useEffect(() => {
    const isCreated = search.get("created") === "true";
    if (isCreated) {
      window.history.replaceState({}, "", `/game/${roomCode}${isFacilitator ? "?name=Facilitator" : ""}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, isFacilitator]);

  // --- UI handlers (guard writes when facilitator) ---
  const handleLeaveGame = () => setLocation("/");

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast({
      title: "Room code copied!",
      description: "Share this code with your players/facilitator.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCardSelect = (card: CardType) => {
    const deckKey = `deck${card.deckNumber}` as keyof typeof selectedCards;
    if (selectedCards[deckKey]?.id === card.id) {
      setSelectedCards((prev) => ({ ...prev, [deckKey]: undefined }));
    } else {
      setSelectedCards((prev) => ({ ...prev, [deckKey]: card }));
    }
  };

  const handleSubmitCards = (rating: "promotes" | "hinders") => {
    if (isFacilitator) return; // read-only
    if (!selectedCards.deck1 || !selectedCards.deck2 || !selectedCards.deck3) {
      toast({
        variant: "destructive",
        title: "Incomplete selection",
        description: "Please select one card from each deck.",
      });
      return;
    }
    const cardSet: CardSet = {
      deck1Card: selectedCards.deck1,
      deck2Card: selectedCards.deck2,
      deck3Card: selectedCards.deck3,
    };
    const socket = getSocket();
    socket.emit("select_cards", cardSet, rating);
    setSelectedCards({});
  };

  const handleSubmitRating = (rating: "promotes" | "hinders") => {
    if (isFacilitator) return; // read-only
    getSocket().emit("submit_rating", rating);
  };

  const handleNextRound = () => {
    if (isFacilitator) {
      toast({ title: "Observer mode", description: "Facilitators don’t advance rounds." });
      return;
    }
    getSocket().emit("next_round");
  };

  // --- Loading state ---
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Connecting to game...</p>
        </div>
      </div>
    );
  }

  const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === myPlayerId;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const myRating = gameState.ratings.find((r) => r.playerId === myPlayerId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button data-testid="button-leave-game" variant="ghost" size="icon" onClick={handleLeaveGame}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Card Match {isFacilitator && <span className="text-xs text-muted-foreground">(Facilitator)</span>}</h1>
                <p className="text-sm text-muted-foreground">Round {gameState.round}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 10-minute phase timer — visible to all players + facilitator */}
              {gameState.timerStartsAt &&
                (gameState.phase === "rating" || gameState.phase === "revealing") && (
                  <GameTimer startsAt={gameState.timerStartsAt} />
                )}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {gameState.players.length}/{gameState.maxPlayers}
                </Badge>
                <Button
                  data-testid="button-copy-code"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyRoomCode}
                  className="gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="font-mono font-semibold">{roomCode}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Waiting Room */}
        {gameState.phase === "waiting" && (
          <WaitingRoom gameState={gameState} myPlayerId={myPlayerId} roomCode={roomCode} />
        )}

        {/* Active Game */}
        {gameState.phase !== "waiting" && (
          <>
            {/* Players Section */}
            <Card className="border-2">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Players
                  </span>
                  {currentPlayer && (
                    <Badge variant={isMyTurn ? "default" : "secondary"} className="text-sm">
                      {isMyTurn ? "Your Turn" : `${currentPlayer.name}'s Turn`}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PlayerList
                  players={gameState.players}
                  currentPlayerId={currentPlayer?.id}
                  myPlayerId={myPlayerId}
                />
              </CardContent>
            </Card>

            {/* Card Selection Phase (facilitator never sees the selector) */}
            {gameState.phase === "selecting" && !isFacilitator && isMyTurn && gameState.activePlayerHand && (
              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Select Your Cards</CardTitle>
                  <p className="text-sm text-muted-foreground">Choose one card from each deck to create your set</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Deck 2: Role (First) */}
                  <DeckSection
                    title="Role Card"
                    selected={!!selectedCards.deck2}
                    cards={gameState.activePlayerHand.deck2}
                    isSelected={(c) => selectedCards.deck2?.id === c.id}
                    onClick={handleCardSelect}
                  />
                  <Separator />
                  {/* Deck 3: Context (Second) */}
                  <DeckSection
                    title="Context Card"
                    selected={!!selectedCards.deck3}
                    cards={gameState.activePlayerHand.deck3}
                    isSelected={(c) => selectedCards.deck3?.id === c.id}
                    onClick={handleCardSelect}
                  />
                  <Separator />
                  {/* Deck 1: Statement (Third) */}
                  <DeckSection
                    title="Statement Cards"
                    selected={!!selectedCards.deck1}
                    cards={gameState.activePlayerHand.deck1}
                    isSelected={(c) => selectedCards.deck1?.id === c.id}
                    onClick={handleCardSelect}
                  />
                  <Separator />
                  <RatingPanel
                    onSubmit={handleSubmitCards}
                    disabled={!selectedCards.deck1 || !selectedCards.deck2 || !selectedCards.deck3}
                    title="Rate your card set"
                  />
                </CardContent>
              </Card>
            )}

            {/* Waiting for Active Player */}
            {gameState.phase === "selecting" && (!isMyTurn || isFacilitator) && (
              <Card className="border-2">
                <CardContent className="py-12 text-center">
                  <div className="animate-pulse space-y-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Users className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">Waiting for {currentPlayer?.name}...</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentPlayer?.name} is selecting their card set
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rating Phase */}
            {gameState.phase === "rating" && gameState.selectedCards && (
              <Card className="border-2">
                <CardHeader>
                  <CardTitle>{isMyTurn ? "Your Card Set" : `${currentPlayer?.name}'s Card Set`}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {isMyTurn
                      ? "Waiting for others to rate your set..."
                      : "Rate this card set - does it promote or hinder psychological safety?"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Display Selected Cards (Reordered: Role -> Context -> Statement) */}
                  <div className="flex gap-4 justify-center flex-wrap">
                    <ShowCard label="Role" card={gameState.selectedCards.deck2Card} />
                    <ShowCard label="Context" card={gameState.selectedCards.deck3Card} />
                    <ShowCard label="Statement" card={gameState.selectedCards.deck1Card} />
                  </div>

                  {/* Observers do not rate */}
                  {!isFacilitator && !isMyTurn && !myRating && (
                    <>
                      <Separator />
                      <RatingPanel onSubmit={handleSubmitRating} disabled={false} title="Submit your rating" />
                    </>
                  )}

                  {!isFacilitator && myRating && (
                    <div className="text-center py-4">
                      <Badge variant="outline" className="text-sm">
                        You rated this as: <span>{myRating.rating === "promotes" ? "Promotes" : "Hinders"}</span>
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-2">
                        Waiting for other players... ({gameState.ratings.length}/{gameState.players.length})
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Results Phase (observer can view, but Next Round guarded in handler) */}
            {gameState.phase === "revealing" && gameState.selectedCards && (
              <ResultsPanel
                gameState={gameState}
                currentPlayer={currentPlayer}
                myPlayerId={myPlayerId}
                onNextRound={handleNextRound}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

function DeckSection({
  title,
  selected,
  cards,
  isSelected,
  onClick,
}: {
  title: string;
  selected: boolean;
  cards: CardType[];
  isSelected: (c: CardType) => boolean;
  onClick: (c: CardType) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</Label>
        {selected && <Badge variant="outline" className="text-xs">Selected</Badge>}
      </div>
      <div className="flex gap-3 flex-wrap">
        {cards.map((card) => (
          <GameCard key={card.id} card={card} isSelected={isSelected(card)} onClick={() => onClick(card)} />
        ))}
      </div>
    </div>
  );
}

function ShowCard({ label, card }: { label: string; card: CardType | null }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {card ? <GameCard card={card} isSelected={false} /> : <div className="text-sm text-muted-foreground">N/A</div>}
    </div>
  );
}
