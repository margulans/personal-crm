import { InteractionItem } from "../crm/InteractionItem";
import { mockInteractions } from "@/lib/mockData";

export default function InteractionItemExample() {
  return (
    <div className="p-4 max-w-md space-y-2">
      {mockInteractions.slice(0, 3).map((interaction) => (
        <InteractionItem key={interaction.id} interaction={interaction} />
      ))}
    </div>
  );
}
