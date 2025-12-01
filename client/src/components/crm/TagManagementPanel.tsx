import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TagManagement } from "./TagManagement";
import { Tags, Loader2 } from "lucide-react";
import type { Contact } from "@/lib/types";

export function TagManagementPanel() {
  const [open, setOpen] = useState(false);

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    enabled: open,
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" data-testid="button-tag-management">
          <Tags className="h-4 w-4" />
          Управление тегами
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Управление тегами</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Нет контактов для управления тегами
            </div>
          ) : (
            <TagManagement contacts={contacts} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
