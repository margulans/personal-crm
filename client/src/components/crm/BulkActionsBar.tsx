import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Tag, X, Loader2 } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onUpdateImportance: (level: "A" | "B" | "C") => void;
  onCancel: () => void;
  isDeleting?: boolean;
  isUpdating?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  onDelete,
  onUpdateImportance,
  onCancel,
  isDeleting,
  isUpdating,
}: BulkActionsBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Badge variant="secondary" className="text-sm">
            Выбрано: {selectedCount}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            data-testid="button-cancel-selection"
            className="sm:hidden ml-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 flex items-center gap-2 w-full sm:w-auto">
          <Select
            onValueChange={(value) => onUpdateImportance(value as "A" | "B" | "C")}
            disabled={isUpdating}
          >
            <SelectTrigger className="flex-1 sm:w-[180px]" data-testid="select-bulk-importance">
              <Tag className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Важность" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">A - Высокая</SelectItem>
              <SelectItem value="B">B - Средняя</SelectItem>
              <SelectItem value="C">C - Низкая</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            data-testid="button-bulk-delete"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">Удалить</span>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          data-testid="button-cancel-selection-desktop"
          className="hidden sm:flex"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить контакты?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить {selectedCount} контактов? 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
