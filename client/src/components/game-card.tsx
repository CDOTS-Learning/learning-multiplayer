import type { Card } from "@shared/schema";
import { cn } from "@/lib/utils";

interface GameCardProps {
  card: Card;
  isSelected: boolean;
  onClick?: () => void;
}

export function GameCard({ card, isSelected, onClick }: GameCardProps) {
  const deckColors = {
    1: "from-yellow-500/10 to-yellow-600/20 border-yellow-500/30",
    2: "from-orange-500/10 to-orange-600/20 border-orange-500/30",
    3: "from-purple-500/10 to-purple-600/20 border-purple-500/30",
  };

  const deckTextColors = {
    1: "text-yellow-600 dark:text-yellow-400",
    2: "text-orange-600 dark:text-orange-400",
    3: "text-purple-600 dark:text-purple-400",
  };

  return (
    <button
      data-testid={`card-${card.id}`}
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "group relative w-40 md:w-52 min-h-[15rem] md:min-h-[19rem] rounded-lg border-2 transition-all",
        "bg-gradient-to-br shadow-lg",
        deckColors[card.deckNumber as keyof typeof deckColors],
        onClick && "cursor-pointer hover-elevate active-elevate-2",
        isSelected && "ring-4 ring-primary ring-offset-2 ring-offset-background",
        !onClick && "opacity-90"
      )}
    >
      {/* Deck Number Badge */}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
        {isSelected && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary text-primary-foreground">
            ✓
          </span>
        )}
      </div>

      {/* Card Value */}
      <div className="flex items-center justify-center w-full min-h-[15rem] md:min-h-[19rem] px-3 py-6">
        <div className={cn(
          "text-sm md:text-base font-medium text-center leading-snug w-full",
          deckTextColors[card.deckNumber as keyof typeof deckTextColors]
        )}>
          {card.value}
        </div>
      </div>


    </button>
  );
}
