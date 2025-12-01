import { ContactDetail } from "../crm/ContactDetail";
import { mockContacts, mockInteractions } from "@/lib/mockData";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function ContactDetailExample() {
  const contact = mockContacts[0];
  const interactions = mockInteractions.filter((i) => i.contactId === contact.id);

  return (
    <TooltipProvider>
      <div className="h-[600px] border rounded-lg overflow-hidden">
        <ContactDetail
          contact={contact}
          interactions={interactions}
          onBack={() => console.log("Back clicked")}
          onAddInteraction={(data) => console.log("Add interaction:", data)}
        />
      </div>
    </TooltipProvider>
  );
}
