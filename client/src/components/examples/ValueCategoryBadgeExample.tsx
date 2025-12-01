import { ValueCategoryBadge } from "../crm/ValueCategoryBadge";

export default function ValueCategoryBadgeExample() {
  return (
    <div className="flex flex-wrap gap-2 p-4">
      <ValueCategoryBadge category="AA" />
      <ValueCategoryBadge category="AB" />
      <ValueCategoryBadge category="BA" />
      <ValueCategoryBadge category="BB" />
      <ValueCategoryBadge category="BC" />
      <ValueCategoryBadge category="CC" />
      <ValueCategoryBadge category="CD" size="sm" />
    </div>
  );
}
