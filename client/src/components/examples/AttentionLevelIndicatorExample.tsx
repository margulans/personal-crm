import { AttentionLevelIndicator } from "../crm/AttentionLevelIndicator";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function AttentionLevelIndicatorExample() {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-2">
          <AttentionLevelIndicator level={3} />
          <AttentionLevelIndicator level={6} />
          <AttentionLevelIndicator level={9} showLabel />
        </div>
        <div className="flex gap-4">
          <AttentionLevelIndicator level={5} compact />
          <AttentionLevelIndicator level={8} compact />
        </div>
      </div>
    </TooltipProvider>
  );
}
