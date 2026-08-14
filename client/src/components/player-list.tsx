import type { Player } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, User, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string;
  myPlayerId: string;
}

export function PlayerList({ players, currentPlayerId, myPlayerId }: PlayerListProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {players.map((player) => {
        const isMe = player.id === myPlayerId;
        const isCurrentTurn = player.id === currentPlayerId;

        return (
          <div
            key={player.id}
            data-testid={`player-${player.id}`}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
              isCurrentTurn && "bg-primary/5 border-primary/30",
              !isCurrentTurn && "bg-card border-card-border"
            )}
          >
            <Avatar className={cn(
              "w-12 h-12 border-2",
              isCurrentTurn && "border-primary",
              !isCurrentTurn && "border-muted"
            )}>
              <AvatarFallback className={cn(
                "font-semibold",
                isCurrentTurn && "bg-primary/10 text-primary"
              )}>
                {player.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={cn(
                  "font-semibold truncate",
                  isCurrentTurn && "text-primary"
                )}>
                  {player.name}
                  {isMe && <span className="text-muted-foreground ml-1">(You)</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {isCurrentTurn && (
                  <Badge variant="default" className="text-xs gap-1">
                    <Crown className="w-3 h-3" />
                    Active
                  </Badge>
                )}
                {player.isConnected ? (
                  <Badge variant="outline" className="text-xs gap-1 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Online
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs gap-1 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Offline
                  </Badge>
                )}
              </div>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center justify-center px-2 shrink-0">
              <div className="flex items-center gap-1 text-primary">
                <Trophy className="w-3.5 h-3.5" />
                <span className="text-lg font-bold tabular-nums" data-testid={`score-${player.id}`}>
                  {player.score ?? 0}
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {(player.score ?? 0) === 1 ? "point" : "points"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
