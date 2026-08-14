import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface RatingPanelProps {
  onSubmit: (rating: "promotes" | "hinders") => void;
  disabled: boolean;
  title: string;
}

export function RatingPanel({ onSubmit, disabled, title }: RatingPanelProps) {
  return (
    <div className="space-y-4 text-center">
      <div className="font-semibold">{title}</div>
      <div className="flex justify-center gap-3">
        <Button
          onClick={() => onSubmit("promotes")}
          disabled={disabled}
          size="lg"
          className="gap-2 bg-green-600 text-white border-2 border-green-700"
        >
          <ThumbsUp className="w-4 h-4" />
          Promotes
        </Button>
        <Button
          onClick={() => onSubmit("hinders")}
          disabled={disabled}
          size="lg"
          className="gap-2 bg-red-600 text-white border-2 border-red-700"
        >
          <ThumbsDown className="w-4 h-4" />
          Hinders
        </Button>
      </div>
    </div>
  );
}
