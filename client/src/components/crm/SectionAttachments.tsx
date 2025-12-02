import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ObjectUploader } from "./ObjectUploader";
import { Button } from "@/components/ui/button";
import { 
  Paperclip, 
  Image, 
  FileVideo, 
  FileAudio, 
  FileText, 
  File, 
  X, 
  Download,
  Loader2,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Attachment } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SectionAttachmentsProps {
  contactId: string;
  category: "personal" | "family" | "team" | "work" | "documents" | "other";
  subCategory?: string;
  label?: string;
  compact?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  personal: "Личные файлы",
  family: "Семья",
  team: "Команда",
  work: "Работа",
  documents: "Документы",
  other: "Прочее",
};

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return Image;
  if (fileType.startsWith("video/")) return FileVideo;
  if (fileType.startsWith("audio/")) return FileAudio;
  if (fileType.includes("pdf") || fileType.includes("document") || fileType.includes("text")) return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " Б";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " КБ";
  return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
}

export function SectionAttachments({
  contactId,
  category,
  subCategory,
  label,
  compact = false,
}: SectionAttachmentsProps) {
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>("");

  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey: ["/api/contacts", contactId, "attachments", category],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${contactId}/attachments/${category}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch attachments");
      return res.json();
    },
  });

  const filteredAttachments = subCategory
    ? attachments.filter((a) => a.subCategory === subCategory)
    : attachments;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/attachments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "attachments", category] });
      toast({ title: "Файл удалён" });
    },
    onError: () => {
      toast({ title: "Ошибка удаления", variant: "destructive" });
    },
  });

  const handleGetUploadParameters = async () => {
    const res = await fetch("/api/objects/upload", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Failed to get upload URL");
    const { uploadURL } = await res.json();
    return { method: "PUT" as const, url: uploadURL };
  };

  const handleUploadComplete = async (result: any) => {
    if (!result.successful?.length) return;

    for (const file of result.successful) {
      try {
        await apiRequest("POST", `/api/contacts/${contactId}/attachments`, {
          category,
          subCategory,
          fileName: file.name,
          originalName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          uploadURL: file.uploadURL,
        });
      } catch (err) {
        console.error("Failed to save attachment:", err);
        toast({ title: "Ошибка сохранения файла", variant: "destructive" });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "attachments", category] });
    toast({ title: "Файл загружен" });
  };

  const handlePreview = (attachment: Attachment) => {
    if (attachment.fileType.startsWith("image/")) {
      setPreviewUrl(attachment.storagePath);
      setPreviewType(attachment.fileType);
    }
  };

  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement("a");
    link.href = attachment.storagePath;
    link.download = attachment.originalName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <ObjectUploader
          maxNumberOfFiles={5}
          onGetUploadParameters={handleGetUploadParameters}
          onComplete={handleUploadComplete}
          buttonVariant="ghost"
          buttonSize="sm"
        >
          <Paperclip className="h-4 w-4 mr-1" />
          <span className="text-xs">Прикрепить</span>
        </ObjectUploader>
        {filteredAttachments.length > 0 && (
          <span className="text-xs text-muted-foreground">
            ({filteredAttachments.length})
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {label || CATEGORY_LABELS[category]}
          </span>
          {filteredAttachments.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({filteredAttachments.length})
            </span>
          )}
        </div>
        <ObjectUploader
          maxNumberOfFiles={10}
          onGetUploadParameters={handleGetUploadParameters}
          onComplete={handleUploadComplete}
          buttonVariant="outline"
          buttonSize="sm"
        >
          <Paperclip className="h-3 w-3 mr-1" />
          Добавить
        </ObjectUploader>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : filteredAttachments.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Нет вложений</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {filteredAttachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.fileType);
            const isImage = attachment.fileType.startsWith("image/");

            return (
              <div
                key={attachment.id}
                className="group relative rounded-lg border bg-muted/30 overflow-hidden hover:bg-muted/50 transition-colors"
                data-testid={`attachment-${attachment.id}`}
              >
                {isImage ? (
                  <div className="aspect-square relative bg-black/5 dark:bg-white/5 flex items-center justify-center">
                    <img
                      src={attachment.storagePath}
                      alt={attachment.originalName}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-white"
                        onClick={() => handlePreview(attachment)}
                        data-testid="button-preview"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square flex flex-col items-center justify-center p-2">
                    <FileIcon className="h-8 w-8 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground text-center truncate w-full px-1">
                      {attachment.originalName}
                    </span>
                  </div>
                )}

                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-6 w-6"
                    onClick={() => handleDownload(attachment)}
                    data-testid="button-download"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-6 w-6"
                    onClick={() => deleteMutation.mutate(attachment.id)}
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-attachment"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                <div className="px-2 py-1 border-t bg-background/50">
                  <p className="text-xs truncate" title={attachment.originalName}>
                    {attachment.originalName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.fileSize)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Просмотр</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="flex items-center justify-center max-h-[70vh]">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
