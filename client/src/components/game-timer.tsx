import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// Total duration of the acting/rating/discussion phase.
const DURATION_MS = 10 * 60 * 1000; // 10 minutes

interface GameTimerProps {
  /** Unix-ms timestamp when the countdown started (from the server). */
  startsAt: number;
}

/**
 * Synchronized 10-minute countdown.
 * Because every client derives the remaining time from the SAME server
 * timestamp, all players and the facilitator see the same value.
 * Counts down to 0:00, then stops (does not go negative) and turns red.
 */
export function GameTimer({ startsAt }: GameTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = now - startsAt;
  const remaining = Math.max(0, DURATION_MS - elapsed);
  const isExpired = remaining <= 0;

  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const label = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div
      data-testid="game-timer"
      className={cn(
        "flex items-center gap-2 rounded-lg border-2 px-4 py-2 font-mono text-2xl font-bold tabular-nums transition-colors",
        isExpired
          ? "border-red-600 bg-red-600 text-white"
          : "border-primary/30 bg-primary/5 text-primary"
      )}
    >
      <Clock className={cn("w-5 h-5", isExpired ? "text-white" : "text-primary")} />
      <span>{label}</span>
    </div>
  );
}
