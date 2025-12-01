import { AnalyticsMatrix } from "../crm/AnalyticsMatrix";
import { mockContacts } from "@/lib/mockData";

export default function AnalyticsMatrixExample() {
  return (
    <div className="p-4 max-w-md">
      <AnalyticsMatrix
        contacts={mockContacts}
        onCellClick={(importance, status) =>
          console.log(`Clicked: ${importance}-class, ${status} status`)
        }
      />
    </div>
  );
}
