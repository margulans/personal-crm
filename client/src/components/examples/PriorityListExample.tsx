import { PriorityList } from "../crm/PriorityList";
import { mockContacts } from "@/lib/mockData";

export default function PriorityListExample() {
  const urgentContacts = mockContacts.filter(
    (c) =>
      c.heatStatus === "red" &&
      (c.valueCategory.startsWith("A") || c.valueCategory === "BA")
  );

  const developContacts = mockContacts.filter(
    (c) =>
      c.heatStatus === "yellow" &&
      (c.valueCategory.startsWith("A") || c.valueCategory === "BA")
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 max-w-3xl">
      <PriorityList
        title="Срочно связаться"
        description="AA/AB/BA контакты в красной зоне"
        contacts={urgentContacts}
        variant="urgent"
        onContactClick={(c) => console.log("Clicked:", c.fullName)}
      />
      <PriorityList
        title="Для развития"
        description="AA/AB/BA контакты в жёлтой зоне"
        contacts={developContacts}
        variant="develop"
        onContactClick={(c) => console.log("Clicked:", c.fullName)}
      />
    </div>
  );
}
