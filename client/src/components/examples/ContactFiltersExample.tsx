import { useState } from "react";
import { ContactFilters } from "../crm/ContactFilters";

export default function ContactFiltersExample() {
  const [filters, setFilters] = useState({
    search: "",
    importance: "",
    valueCategory: "",
    heatStatus: "",
  });

  return (
    <div className="p-4 max-w-2xl">
      <ContactFilters filters={filters} onFiltersChange={setFilters} />
      <div className="mt-4 p-3 bg-muted rounded text-sm font-mono">
        {JSON.stringify(filters, null, 2)}
      </div>
    </div>
  );
}
