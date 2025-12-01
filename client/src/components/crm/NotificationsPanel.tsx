import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSidebar } from "@/components/ui/sidebar";
import { Bell, AlertTriangle, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/types";

interface NotificationsPanelProps {
  onContactClick?: (contactId: string) => void;
}

export function NotificationsPanel({ onContactClick }: NotificationsPanelProps) {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const { setOpenMobile } = useSidebar();

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const today = new Date();
  const getDaysSince = (dateStr: string | null) => {
    if (!dateStr) return 999;
    const date = new Date(dateStr);
    return Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  };

  const urgentContacts = contacts
    .filter((c) => c.heatStatus === "red")
    .sort((a, b) => {
      const importanceOrder = { A: 0, B: 1, C: 2 };
      return (importanceOrder[a.importanceLevel as keyof typeof importanceOrder] || 2) -
             (importanceOrder[b.importanceLevel as keyof typeof importanceOrder] || 2);
    });

  const warningContacts = contacts
    .filter((c) => c.heatStatus === "yellow" && (c.importanceLevel === "A" || c.importanceLevel === "B"))
    .sort((a, b) => {
      const importanceOrder = { A: 0, B: 1, C: 2 };
      return (importanceOrder[a.importanceLevel as keyof typeof importanceOrder] || 2) -
             (importanceOrder[b.importanceLevel as keyof typeof importanceOrder] || 2);
    });

  const totalNotifications = urgentContacts.length + warningContacts.length;

  const handleContactClick = (contactId: string) => {
    if (onContactClick) {
      onContactClick(contactId);
    } else {
      setLocation(`/?contact=${contactId}`);
    }
  };

  const getOverdueDays = (contact: Contact) => {
    const daysSince = getDaysSince(contact.lastContactDate);
    const overdue = daysSince - contact.desiredFrequencyDays;
    return overdue > 0 ? overdue : 0;
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setOpenMobile(false);
    }
    setOpen(isOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative gap-2 w-full justify-start"
          data-testid="button-notifications"
        >
          <Bell className="h-4 w-4" />
          <span>Уведомления</span>
          {totalNotifications > 0 && (
            <Badge 
              variant="destructive" 
              className="ml-auto h-5 min-w-5 px-1.5 text-xs"
            >
              {totalNotifications}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="start" 
        side="bottom"
        sideOffset={8}
      >
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">Требуют внимания</h3>
          <p className="text-xs text-muted-foreground">
            Контакты, которые пора прогреть
          </p>
        </div>

        <ScrollArea className="max-h-80">
          {totalNotifications === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Все контакты в порядке
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {urgentContacts.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    Срочно ({urgentContacts.length})
                  </div>
                  {urgentContacts.slice(0, 5).map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleContactClick(contact.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-md text-left",
                        "hover-elevate transition-colors"
                      )}
                      data-testid={`notification-urgent-${contact.id}`}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {contact.fullName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {contact.importanceLevel}-класс · просрочено на {getOverdueDays(contact)} дн.
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                  {urgentContacts.length > 5 && (
                    <div className="px-2 py-1 text-xs text-muted-foreground text-center">
                      и ещё {urgentContacts.length - 5}...
                    </div>
                  )}
                </div>
              )}

              {warningContacts.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <Clock className="h-3 w-3" />
                    Скоро ({warningContacts.length})
                  </div>
                  {warningContacts.slice(0, 5).map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleContactClick(contact.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-md text-left",
                        "hover-elevate transition-colors"
                      )}
                      data-testid={`notification-warning-${contact.id}`}
                    >
                      <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {contact.fullName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {contact.importanceLevel}-класс · {getDaysSince(contact.lastContactDate)} дн. назад
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                  {warningContacts.length > 5 && (
                    <div className="px-2 py-1 text-xs text-muted-foreground text-center">
                      и ещё {warningContacts.length - 5}...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {totalNotifications > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setLocation("/analytics")}
              data-testid="button-view-all-notifications"
            >
              Смотреть все в аналитике
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
