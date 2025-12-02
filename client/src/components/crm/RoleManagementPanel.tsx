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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RoleManagement } from "./RoleManagement";
import { Briefcase, Loader2, HelpCircle } from "lucide-react";
import type { Contact } from "@/lib/types";

export function RoleManagementPanel() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    enabled: open,
  });

  const handleEditContact = (contactId: string) => {
    setOpen(false);
    setLocation(`/?contact=${contactId}&edit=true`);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" data-testid="button-role-management">
          <Briefcase className="h-4 w-4" />
          Управление ролями
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Управление ролями
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="help-roles">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm">
                <p className="font-semibold mb-1">Что такое роли?</p>
                <p>Роли — это функции, которые контакт выполняет в вашей сети (например: "Инвестор", "Подрядчик", "Ментор", "Клиент").</p>
                <p className="mt-2 text-muted-foreground">
                  <span className="font-medium text-foreground">Отличие от тегов:</span> Роли показывают что человек делает для вас, а теги — кто он по характеристикам (национальность, профессия, интересы).
                </p>
              </TooltipContent>
            </Tooltip>
          </SheetTitle>
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
