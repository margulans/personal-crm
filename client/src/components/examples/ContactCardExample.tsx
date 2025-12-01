import { ContactCard } from "../crm/ContactCard";
import { mockContacts } from "@/lib/mockData";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function ContactCardExample() {
  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 max-w-2xl">
        {mockContacts.slice(0, 4).map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onClick={() => console.log("Contact clicked:", contact.fullName)}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}
