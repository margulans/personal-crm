import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeatStatusBadge } from "./HeatStatusBadge";
import { ValueCategoryBadge } from "./ValueCategoryBadge";
import { ImportanceBadge } from "./ImportanceBadge";
import { AttentionLevelIndicator } from "./AttentionLevelIndicator";
import { formatDaysAgo } from "@/lib/constants";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Contact } from "@/lib/types";

interface ContactCardProps {
  contact: Contact;
  onClick?: () => void;
}

export function ContactCard({ contact, onClick }: ContactCardProps) {
  const today = new Date();
  const lastContact = contact.lastContactDate ? new Date(contact.lastContactDate) : null;
  const daysSince = lastContact 
    ? Math.floor((today.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
    : contact.desiredFrequencyDays;

  const initials = contact.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card
      className="hover-elevate cursor-pointer transition-all"
      onClick={onClick}
      data-testid={`contact-card-${contact.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm truncate" data-testid="contact-name">
                {contact.fullName}
              </h3>
              <HeatStatusBadge status={contact.heatStatus} size="sm" />
            </div>
            
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {contact.roleTags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
              {contact.roleTags.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{contact.roleTags.length - 2}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ценность:</span>
                <ValueCategoryBadge category={contact.valueCategory} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Важность:</span>
                <ImportanceBadge level={contact.importanceLevel} size="sm" />
              </div>
              <div className="flex items-center justify-between col-span-2 mt-1">
                <span className="text-muted-foreground">Внимание:</span>
                <AttentionLevelIndicator level={contact.attentionLevel} compact />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
          <span data-testid="last-contact">{formatDaysAgo(daysSince)}</span>
          <span>каждые {contact.desiredFrequencyDays} дн.</span>
        </div>
      </CardContent>
    </Card>
  );
}
