import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ObjectUploader } from "./ObjectUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Link,
  Globe,
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type AttachmentCategory = 
  | "personal" 
  | "family" 
  | "team" 
  | "work" 
  | "documents" 
  | "other"
  | "hobbies"
  | "gifts"
  | "preferences"
  | "dates"
  | "notes";

interface SectionAttachmentsProps {
  contactId: string;
  category: AttachmentCategory;
  subCategory?: string;
  label?: string;
  compact?: boolean;
}

const CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  personal: "Личные файлы",
  family: "Семья",
  team: "Команда",
  work: "Работа",
  documents: "Документы",
  other: "Прочее",
  hobbies: "Хобби и увлечения",
  gifts: "Идеи подарков",
  preferences: "Предпочтения",
  dates: "Важные даты",
  notes: "Заметки",
};

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico', '.heic', '.heif'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
const PDF_EXTENSIONS = ['.pdf'];

function isImageFile(fileType: string, fileName: string): boolean {
  if (fileType.startsWith("image/")) return true;
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return IMAGE_EXTENSIONS.includes(ext);
}

function isPdfFile(fileType: string, fileName: string): boolean {
  if (fileType === "application/pdf") return true;
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return PDF_EXTENSIONS.includes(ext);
}

function PdfThumbnail({ url, fileName }: { url: string; fileName: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <FileText className="h-8 w-8 text-muted-foreground mb-1" />
        <span className="text-xs text-muted-foreground text-center truncate w-full px-1">
          PDF
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <Document
        file={url}
        onLoadSuccess={() => {
          console.log("[PDF] Loaded:", fileName);
          setLoading(false);
        }}
        onLoadError={(err) => {
          console.error("[PDF] Error loading:", fileName, err?.message || err);
          setLoading(false);
          setError(true);
        }}
        loading={null}
        className="flex items-center justify-center"
      >
        <Page 
          pageNumber={1} 
          width={120}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          onRenderSuccess={() => console.log("[PDF] Page rendered:", fileName)}
          onRenderError={(err) => console.error("[PDF] Page render error:", fileName, err)}
        />
      </Document>
    </div>
  );
}

function isVideoFile(fileType: string, fileName: string): boolean {
  if (fileType.startsWith("video/")) return true;
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return VIDEO_EXTENSIONS.includes(ext);
}

function isAudioFile(fileType: string, fileName: string): boolean {
  if (fileType.startsWith("audio/")) return true;
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return AUDIO_EXTENSIONS.includes(ext);
}

function getFileIcon(fileType: string, fileName: string = "") {
  if (isImageFile(fileType, fileName)) return Image;
  if (isVideoFile(fileType, fileName)) return FileVideo;
  if (isAudioFile(fileType, fileName)) return FileAudio;
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
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const fetchedIdsRef = useRef<Set<string>>(new Set());
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);

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

  useEffect(() => {
    let isCancelled = false;
    
    const fetchSignedUrls = async () => {
      const toFetch = filteredAttachments.filter(
        a => !fetchedIdsRef.current.has(a.id)
      );
      
      if (toFetch.length === 0) return;
      
      // Fetch all URLs in parallel
      const results = await Promise.all(
        toFetch.map(async (attachment) => {
          if (attachment.storagePath.startsWith("http://") || attachment.storagePath.startsWith("https://")) {
            return { id: attachment.id, url: attachment.storagePath };
          }
          
          try {
            const res = await fetch(`/api/attachments/${attachment.id}/url`, {
              credentials: "include",
            });
            if (res.ok) {
              const { url } = await res.json();
              return { id: attachment.id, url };
            }
          } catch (err) {
            console.error("[SectionAttachments] Error fetching signed URL:", err);
          }
          return null;
        })
      );
      
      if (isCancelled) return;
      
      const newUrls: Record<string, string> = {};
      results.forEach(result => {
        if (result?.url) {
          newUrls[result.id] = result.url;
          // Only mark as fetched AFTER successful URL retrieval
          fetchedIdsRef.current.add(result.id);
        }
      });
      
      if (Object.keys(newUrls).length > 0) {
        setSignedUrls(prev => ({ ...prev, ...newUrls }));
      }
    };
    
    if (filteredAttachments.length > 0) {
      fetchSignedUrls();
    }
    
    return () => {
      isCancelled = true;
    };
  }, [filteredAttachments]);

  const getDisplayUrl = (attachment: Attachment): string | undefined => {
    return signedUrls[attachment.id];
  };

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

  const handleAddFromUrl = async () => {
    if (!urlInput.trim()) {
      toast({ title: "Введите URL изображения", variant: "destructive" });
      return;
    }

    const url = urlInput.trim();
    
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      toast({ title: "URL должен начинаться с http:// или https://", variant: "destructive" });
      return;
    }

    setUrlLoading(true);
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/");
      let fileName = pathParts[pathParts.length - 1] || "image";
      
      if (!fileName.includes(".")) {
        fileName += ".jpg";
      }

      const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
      let fileType = "image/jpeg";
      if (ext === ".png") fileType = "image/png";
      else if (ext === ".gif") fileType = "image/gif";
      else if (ext === ".webp") fileType = "image/webp";
      else if (ext === ".svg") fileType = "image/svg+xml";

      await apiRequest("POST", `/api/contacts/${contactId}/attachments`, {
        category,
        subCategory,
        fileName,
        originalName: fileName,
        fileType,
        fileSize: 0,
        externalUrl: url,
      });

      setSignedUrls({});
      fetchedIdsRef.current.clear();
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "attachments", category] });
      toast({ title: "Изображение добавлено" });
      setShowUrlDialog(false);
      setUrlInput("");
    } catch (err) {
      console.error("Failed to add from URL:", err);
      toast({ title: "Ошибка добавления изображения", variant: "destructive" });
    } finally {
      setUrlLoading(false);
    }
  };

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

    setSignedUrls({});
    fetchedIdsRef.current.clear();
    queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "attachments", category] });
    toast({ title: "Файл загружен" });
  };

  const handlePreview = async (attachment: Attachment) => {
    if (isImageFile(attachment.fileType, attachment.originalName)) {
      const url = getDisplayUrl(attachment);
      if (url) {
        setPreviewUrl(url);
        setPreviewType(attachment.fileType);
      }
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    const url = getDisplayUrl(attachment);
    if (!url) return;
    
    const link = document.createElement("a");
    link.href = url;
    link.download = attachment.originalName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (compact) {
    return (
      <div className="space-y-2">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUrlDialog(true)}
            data-testid="button-add-url-compact"
          >
            <Globe className="h-4 w-4 mr-1" />
            <span className="text-xs">По ссылке</span>
          </Button>
          {filteredAttachments.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({filteredAttachments.length})
            </span>
          )}
        </div>
        
        {filteredAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filteredAttachments.map((attachment) => {
              const FileIcon = getFileIcon(attachment.fileType, attachment.originalName);
              const isImage = isImageFile(attachment.fileType, attachment.originalName);
              const isPdf = isPdfFile(attachment.fileType, attachment.originalName);
              const displayUrl = getDisplayUrl(attachment);

              return (
                <div
                  key={attachment.id}
                  className="group relative w-16 h-16 rounded-lg border bg-muted/30 overflow-hidden hover:bg-muted/50 transition-colors"
                  data-testid={`attachment-compact-${attachment.id}`}
                >
                  {isImage ? (
                    <div className="w-full h-full relative bg-black/5 dark:bg-white/5 flex items-center justify-center">
                      {displayUrl ? (
                        <img
                          src={displayUrl}
                          alt={attachment.originalName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const parent = target.parentElement;
                            if (parent) {
                              const fallback = document.createElement("div");
                              fallback.className = "flex items-center justify-center w-full h-full";
                              fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  ) : isPdf ? (
                    <div className="w-full h-full relative bg-white dark:bg-gray-100 flex items-center justify-center overflow-hidden">
                      {displayUrl ? (
                        <Document
                          file={displayUrl}
                          loading={<Loader2 className="h-4 w-4 animate-spin" />}
                          error={<FileText className="h-6 w-6 text-muted-foreground" />}
                          className="flex items-center justify-center scale-[0.4] origin-center"
                        >
                          <Page 
                            pageNumber={1} 
                            width={160}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />
                        </Document>
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-1">
                      <FileIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Delete button overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-white hover:text-destructive hover:bg-white/20"
                      onClick={() => deleteMutation.mutate(attachment.id)}
                      disabled={deleteMutation.isPending}
                      data-testid="button-delete-compact"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Preview dialog */}
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
        
        {/* URL dialog */}
        <Dialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Добавить изображение по ссылке</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url-input">URL изображения</Label>
                <Input
                  id="url-input"
                  placeholder="https://example.com/image.jpg"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  data-testid="input-image-url"
                />
                <p className="text-xs text-muted-foreground">
                  Найдите изображение в Google, нажмите правой кнопкой и выберите "Копировать адрес изображения"
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowUrlDialog(false);
                  setUrlInput("");
                }}
              >
                Отмена
              </Button>
              <Button
                onClick={handleAddFromUrl}
                disabled={urlLoading || !urlInput.trim()}
              >
                {urlLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Globe className="h-4 w-4 mr-2" />
                )}
                Добавить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUrlDialog(true)}
            data-testid="button-add-url"
          >
            <Globe className="h-3 w-3 mr-1" />
            По ссылке
          </Button>
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
            const FileIcon = getFileIcon(attachment.fileType, attachment.originalName);
            const isImage = isImageFile(attachment.fileType, attachment.originalName);
            const isPdf = isPdfFile(attachment.fileType, attachment.originalName);
            const displayUrl = getDisplayUrl(attachment);

            return (
              <div
                key={attachment.id}
                className="group relative rounded-lg border bg-muted/30 overflow-hidden hover:bg-muted/50 transition-colors"
                data-testid={`attachment-${attachment.id}`}
              >
                {isImage ? (
                  <div className="aspect-square relative bg-black/5 dark:bg-white/5 flex items-center justify-center">
                    {displayUrl ? (
                      <img
                        src={displayUrl}
                        alt={attachment.originalName}
                        className="max-w-full max-h-full object-contain"
                        onLoad={() => console.log("[Image] Loaded:", attachment.originalName)}
                        onError={(e) => {
                          console.error("[Image] Error loading:", attachment.originalName, displayUrl?.substring(0, 60));
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement("div");
                            fallback.className = "flex flex-col items-center justify-center gap-1";
                            fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span class="text-xs text-muted-foreground">Ошибка загрузки</span>`;
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Загрузка...</span>
                      </div>
                    )}
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
                ) : isPdf ? (
                  <div className="aspect-square relative bg-white dark:bg-gray-100 flex items-center justify-center overflow-hidden">
                    {displayUrl ? (
                      <PdfThumbnail url={displayUrl} fileName={attachment.originalName} />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Загрузка...</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-white"
                        onClick={() => handleDownload(attachment)}
                        data-testid="button-preview-pdf"
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

                <div className="px-2 py-1.5 border-t bg-background/80">
                  <p className="text-xs truncate font-medium" title={attachment.originalName}>
                    {attachment.originalName}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.fileSize)}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleDownload(attachment)}
                        data-testid="button-download"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteMutation.mutate(attachment.id)}
                        disabled={deleteMutation.isPending}
                        data-testid="button-delete-attachment"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
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

      {/* URL dialog */}
      <Dialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить изображение по ссылке</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url-input-full">URL изображения</Label>
              <Input
                id="url-input-full"
                placeholder="https://example.com/image.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                data-testid="input-image-url-full"
              />
              <p className="text-xs text-muted-foreground">
                Найдите изображение в Google, нажмите правой кнопкой и выберите "Копировать адрес изображения"
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUrlDialog(false);
                setUrlInput("");
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={handleAddFromUrl}
              disabled={urlLoading || !urlInput.trim()}
            >
              {urlLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Globe className="h-4 w-4 mr-2" />
              )}
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
