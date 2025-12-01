import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSidebar } from "@/components/ui/sidebar";
import { RoleManagement } from "./RoleManagement";
import { Briefcase, Loader2 } from "lucide-react";
import type { Contact } from "@/lib/types";

export function RoleManagementPanel() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { setOpenMobile } = useSidebar();

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    enabled: open,
  });

  const handleEditContact = (contactId: string) => {
    setOpen(false);
    setLocation(`/?contact=${contactId}&edit=true`);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setOpenMobile(false);
    }
    setOpen(isOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" data-testid="button-role-management">
          <Briefcase className="h-4 w-4" />
          Управление ролями
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Управление ролями</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Нет контактов для управления ролями
            </div>
          ) : (
            <RoleManagement contacts={contacts} onEditContact={handleEditContact} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
