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
import { TagManagement } from "./TagManagement";
import { Tags, Loader2, HelpCircle } from "lucide-react";
import type { Contact } from "@/lib/types";

export function TagManagementPanel() {
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
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" data-testid="button-tag-management">
          <Tags className="h-4 w-4" />
          Управление тегами
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Управление тегами
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="help-tags">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm">
                <p className="font-semibold mb-1">Что такое теги?</p>
                <p>Теги — это характеристики или атрибуты контакта (например: "Казах", "Бизнесмен", "VIP").</p>
                <p className="mt-2 text-muted-foreground">
                  <span className="font-medium text-foreground">Отличие от ролей:</span> Теги описывают кто человек, а роли — какую функцию он выполняет в вашей сети (Инвестор, Подрядчик, Ментор).
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
              Нет контактов для управления тегами
            </div>
          ) : (
            <TagManagement contacts={contacts} onEditContact={handleEditContact} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
