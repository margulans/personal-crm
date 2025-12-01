import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { HeatStatusBadge } from "./HeatStatusBadge";
import { ValueCategoryBadge } from "./ValueCategoryBadge";
import { ImportanceBadge } from "./ImportanceBadge";
import { AttentionLevelIndicator } from "./AttentionLevelIndicator";
import { formatDaysAgo } from "@/lib/constants";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import type { Contact } from "@/lib/types";

interface ContactCardProps {
  contact: Contact;
  onClick?: () => void;
  onDelete?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export function ContactCard({ contact, onClick, onDelete, selectionMode, isSelected, onSelect }: ContactCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiped, setIsSwiped] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const DELETE_THRESHOLD = 80;
  const SWIPE_DETECTION_THRESHOLD = 10;

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

  const handleClick = () => {
    if (isSwiped) {
      setIsSwiped(false);
      setSwipeOffset(0);
      return;
    }
    if (selectionMode) {
      onSelect?.(!isSelected);
    } else {
      onClick?.();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (selectionMode) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (selectionMode) return;
    
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    if (isHorizontalSwipe.current === null) {
      if (Math.abs(deltaX) > SWIPE_DETECTION_THRESHOLD || Math.abs(deltaY) > SWIPE_DETECTION_THRESHOLD) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (isHorizontalSwipe.current === false) {
      return;
    }

    if (isHorizontalSwipe.current === true) {
      e.preventDefault();
      
      const newOffset = isSwiped 
        ? Math.max(-DELETE_THRESHOLD, Math.min(0, deltaX - DELETE_THRESHOLD))
        : Math.max(-DELETE_THRESHOLD, Math.min(0, deltaX));
      
      setSwipeOffset(newOffset);
    }
  };

  const handleTouchEnd = () => {
    if (selectionMode || isHorizontalSwipe.current !== true) {
      isHorizontalSwipe.current = null;
      return;
    }

    if (Math.abs(swipeOffset) > DELETE_THRESHOLD / 2) {
      setSwipeOffset(-DELETE_THRESHOLD);
      setIsSwiped(true);
    } else {
      setSwipeOffset(0);
      setIsSwiped(false);
    }
    isHorizontalSwipe.current = null;
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <div 
      className="relative overflow-hidden rounded-lg touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-center bg-destructive",
          !isSwiped && "pointer-events-none"
        )}
        style={{ width: DELETE_THRESHOLD }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-full w-full rounded-none text-destructive-foreground hover:bg-destructive/90"
          onClick={handleDelete}
          data-testid={`button-delete-swipe-${contact.id}`}
          tabIndex={isSwiped ? 0 : -1}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      <Card
        className={cn(
          "hover-elevate cursor-pointer transition-transform duration-200",
          isSelected && "ring-2 ring-primary bg-primary/5",
          "relative bg-background"
        )}
        onClick={handleClick}
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 || swipeOffset === -DELETE_THRESHOLD ? 'transform 0.2s ease-out' : 'none'
        }}
        data-testid={`contact-card-${contact.id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {selectionMode && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect?.(!!checked)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1"
                data-testid={`checkbox-contact-${contact.id}`}
              />
            )}
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
    </div>
  );
}
