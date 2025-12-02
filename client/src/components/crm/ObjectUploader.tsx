import { useState, useRef, type ReactNode, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: { successful: Array<{ name: string; type: string; size: number; uploadURL: string }> }) => void;
  buttonClassName?: string;
  buttonVariant?: "default" | "ghost" | "outline" | "secondary";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  children: ReactNode;
  disabled?: boolean;
  accept?: string;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 52428800,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  buttonVariant = "ghost",
  buttonSize = "sm",
  children,
  disabled = false,
  accept = "*/*",
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesToUpload = Array.from(files).slice(0, maxNumberOfFiles);
    
    for (const file of filesToUpload) {
      if (file.size > maxFileSize) {
        alert(`Файл ${file.name} слишком большой. Максимальный размер: ${Math.round(maxFileSize / 1024 / 1024)} МБ`);
        continue;
      }
    }

    setIsUploading(true);
    const successful: Array<{ name: string; type: string; size: number; uploadURL: string }> = [];

    try {
      for (const file of filesToUpload) {
        if (file.size > maxFileSize) continue;

        const { url } = await onGetUploadParameters();
        
        const response = await fetch(url, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        });

        if (response.ok) {
          successful.push({
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            uploadURL: url,
          });
        }
      }

      if (successful.length > 0) {
        onComplete?.({ successful });
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={maxNumberOfFiles > 1}
        onChange={handleFileChange}
        className="hidden"
        data-testid="input-file-upload"
      />
      <Button
        onClick={handleClick}
        className={buttonClassName}
        variant={buttonVariant}
        size={buttonSize}
        disabled={disabled || isUploading}
        data-testid="button-upload-file"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
            Загрузка...
          </>
        ) : (
          children
        )}
      </Button>
    </div>
  );
}
