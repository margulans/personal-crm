import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Upload, FileJson, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Smartphone } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function ImportExportPanel() {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExportJSON = () => {
    window.location.href = "/api/export/json";
    toast({ title: "Экспорт JSON начат" });
  };

  const handleExportCSV = () => {
    window.location.href = "/api/export/csv";
    toast({ title: "Экспорт CSV начат" });
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(",").map(h => h.trim());
    const result: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      result.push(row);
    }
    
    return result;
  };

  const parseVCF = (text: string): Record<string, unknown>[] => {
    const contacts: Record<string, unknown>[] = [];
    const vcards = text.split(/(?=BEGIN:VCARD)/i).filter(v => v.trim());
    
    for (const vcard of vcards) {
      const lines = vcard.split(/\r?\n/);
      const contact: Record<string, unknown> = {
        roleTags: ["iPhone"],
        tags: [],
      };
      
      let fullName = "";
      const phones: string[] = [];
      const emails: string[] = [];
      
      for (const line of lines) {
        const colonIndex = line.indexOf(":");
        if (colonIndex === -1) continue;
        
        const keyPart = line.substring(0, colonIndex).toUpperCase();
        const value = line.substring(colonIndex + 1).trim();
        
        if (!value) continue;
        
        if (keyPart === "FN" || keyPart.startsWith("FN;")) {
          fullName = value;
        } else if (keyPart === "N" || keyPart.startsWith("N;")) {
          if (!fullName) {
            const parts = value.split(";");
            const lastName = parts[0] || "";
            const firstName = parts[1] || "";
            fullName = `${firstName} ${lastName}`.trim();
          }
        } else if (keyPart.startsWith("TEL") || keyPart === "TEL") {
          phones.push(value.replace(/[^\d+\-() ]/g, ""));
        } else if (keyPart.startsWith("EMAIL") || keyPart === "EMAIL") {
          emails.push(value);
        } else if (keyPart === "ORG" || keyPart.startsWith("ORG;")) {
          const org = value.split(";")[0];
          if (org) {
            (contact.tags as string[]).push(org);
          }
        } else if (keyPart === "TITLE" || keyPart.startsWith("TITLE;")) {
          (contact.roleTags as string[]).push(value);
        } else if (keyPart === "NOTE" || keyPart.startsWith("NOTE;")) {
          contact.notes = value;
        }
      }
      
      if (fullName) {
        contact.fullName = fullName;
        contact.phone = phones[0] || "";
        contact.email = emails[0] || "";
        
        if (phones.length > 1 || emails.length > 1) {
          const socialLinks: string[] = [];
          phones.slice(1).forEach(p => socialLinks.push(`тел: ${p}`));
          emails.slice(1).forEach(e => socialLinks.push(`email: ${e}`));
          if (socialLinks.length > 0) {
            contact.socialLinks = socialLinks.join(", ");
          }
        }
        
        contacts.push(contact);
      }
    }
    
    return contacts;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      let contacts: Record<string, unknown>[];

      if (file.name.endsWith(".json")) {
        contacts = JSON.parse(text);
        if (!Array.isArray(contacts)) {
          contacts = [contacts];
        }
      } else if (file.name.endsWith(".csv")) {
        contacts = parseCSV(text);
      } else if (file.name.endsWith(".vcf")) {
        contacts = parseVCF(text);
      } else {
        throw new Error("Поддерживаются только файлы .json, .csv и .vcf");
      }

      const response = await apiRequest("POST", "/api/import", { contacts });
      const result = await response.json();
      
      setImportResult({
        success: result.success,
        failed: result.failed,
        errors: result.errors || [],
      });

      if (result.success > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
        toast({ 
          title: "Импорт завершён", 
          description: `Добавлено ${result.success} контактов` 
        });
      }
    } catch (error) {
      setImportResult({
        success: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : "Неизвестная ошибка"],
      });
      toast({ 
        title: "Ошибка импорта", 
        description: error instanceof Error ? error.message : "Неизвестная ошибка",
        variant: "destructive" 
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            data-testid="button-import-export"
          >
            <Download className="h-4 w-4" />
            <span>Импорт/Экспорт</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" sideOffset={8} className="w-48">
          <DropdownMenuItem onClick={handleExportJSON} data-testid="button-export-json">
            <FileJson className="h-4 w-4 mr-2" />
            Экспорт в JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportCSV} data-testid="button-export-csv">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Экспорт в CSV
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowImportDialog(true)} data-testid="button-import">
            <Upload className="h-4 w-4 mr-2" />
            Импорт контактов
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Импорт контактов</DialogTitle>
            <DialogDescription>
              Загрузите файл JSON или CSV с контактами
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.vcf"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-import-file"
              />
              {isImporting ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Импортируем...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Нажмите для выбора файла
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Поддерживаются .json, .csv и .vcf (iPhone)
                  </p>
                </div>
              )}
            </div>

            {importResult && (
              <Alert variant={importResult.failed > 0 ? "destructive" : "default"}>
                {importResult.failed > 0 ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <div className="font-medium mb-1">
                    Результат импорта
                  </div>
                  <div className="text-sm">
                    Успешно: {importResult.success}, Ошибок: {importResult.failed}
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 text-xs max-h-24 overflow-auto">
                      {importResult.errors.slice(0, 5).map((error, i) => (
                        <div key={i} className="truncate">{error}</div>
                      ))}
                      {importResult.errors.length > 5 && (
                        <div>...и ещё {importResult.errors.length - 5} ошибок</div>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="iphone" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="iphone" className="text-xs">
                  <Smartphone className="h-3 w-3 mr-1" />
                  iPhone
                </TabsTrigger>
                <TabsTrigger value="other" className="text-xs">Другие</TabsTrigger>
              </TabsList>
              <TabsContent value="iphone" className="text-xs text-muted-foreground space-y-2 mt-2">
                <p className="font-medium">Как экспортировать контакты с iPhone:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Откройте приложение <strong>Контакты</strong></li>
                  <li>Нажмите <strong>Списки</strong> (вверху слева)</li>
                  <li>Удерживайте <strong>"Все контакты"</strong></li>
                  <li>Выберите <strong>Экспортировать</strong></li>
                  <li>Отправьте файл .vcf на этот компьютер</li>
                </ol>
                <p className="text-xs opacity-75">Или через iCloud.com → Контакты → Экспорт vCard</p>
              </TabsContent>
              <TabsContent value="other" className="text-xs text-muted-foreground space-y-1 mt-2">
                <p className="font-medium">Формат JSON:</p>
                <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`[{
  "fullName": "Имя Фамилия",
  "phone": "+7...",
  "email": "email@..."
}]`}
                </pre>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
