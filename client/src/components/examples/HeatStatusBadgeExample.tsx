import { HeatStatusBadge } from "../crm/HeatStatusBadge";

export default function HeatStatusBadgeExample() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-4">
        <HeatStatusBadge status="green" heatIndex={0.85} showIndex />
        <HeatStatusBadge status="yellow" heatIndex={0.52} showIndex />
        <HeatStatusBadge status="red" heatIndex={0.28} showIndex />
      </div>
      <div className="flex items-center gap-4">
        <HeatStatusBadge status="green" size="sm" />
        <HeatStatusBadge status="green" size="md" />
        <HeatStatusBadge status="green" size="lg" />
      </div>
    </div>
  );
}
