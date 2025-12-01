import { ImportanceBadge } from "../crm/ImportanceBadge";

export default function ImportanceBadgeExample() {
  return (
    <div className="flex gap-2 p-4">
      <ImportanceBadge level="A" />
      <ImportanceBadge level="B" />
      <ImportanceBadge level="C" />
      <ImportanceBadge level="A" size="sm" />
    </div>
  );
}
