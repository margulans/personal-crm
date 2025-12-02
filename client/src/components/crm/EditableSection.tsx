import { useState, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableSectionProps {
  title: string;
  icon?: ReactNode;
  iconColor?: string;
  children: ReactNode;
  editContent?: ReactNode;
  isEditing?: boolean;
  onEditStart?: () => void;
  onSave?: () => Promise<void> | void;
  onCancel?: () => void;
  showEditButton?: boolean;
  className?: string;
  headerClassName?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
}

export function EditableSection({
  title,
  icon,
  iconColor = "text-muted-foreground",
  children,
  editContent,
  isEditing = false,
  onEditStart,
  onSave,
  onCancel,
  showEditButton = true,
  className,
  headerClassName,
  isEmpty = false,
  emptyMessage = "Нет данных",
}: EditableSectionProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={cn("transition-all", className)}>
      <CardHeader className={cn("flex-row items-center justify-between space-y-0 gap-2 pb-3", headerClassName)}>
        <CardTitle className="text-base flex items-center gap-2">
          {icon && <span className={iconColor}>{icon}</span>}
          {title}
        </CardTitle>
        {showEditButton && !isEditing && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={onEditStart}
            data-testid={`button-edit-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        {isEditing && (
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={handleSave}
              disabled={isSaving}
              data-testid="button-save-section"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={onCancel}
              disabled={isSaving}
              data-testid="button-cancel-section"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          editContent || children
        ) : (
          isEmpty ? (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            children
          )
        )}
      </CardContent>
    </Card>
  );
}
