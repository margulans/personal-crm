import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { bulkApi, invalidateContacts } from "@/lib/api";
import { Plus, Trash2, Tag, Loader2 } from "lucide-react";
import type { Contact } from "@/lib/types";

interface TagManagementProps {
  contacts: Contact[];
}

export function TagManagement({ contacts }: TagManagementProps) {
  const [newTag, setNewTag] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [tagAction, setTagAction] = useState<"add" | "remove">("add");
  const { toast } = useToast();

  const allTags = Array.from(
    new Set(contacts.flatMap((c) => [...(c.tags || []), ...(c.roleTags || [])]))
  ).sort();

  const updateTagsMutation = useMutation({
    mutationFn: async ({ ids, tag, action }: { ids: string[]; tag: string; action: "add" | "remove" }) => {
      const updates = ids.map(async (id) => {
        const contact = contacts.find((c) => c.id === id);
        if (!contact) return null;

        let newTags = [...(contact.tags || [])];
        if (action === "add" && !newTags.includes(tag)) {
          newTags.push(tag);
        } else if (action === "remove") {
          newTags = newTags.filter((t) => t !== tag);
        }

        return bulkApi.updateContacts([id], { tags: newTags });
      });

      return Promise.all(updates);
    },
    onSuccess: () => {
      invalidateContacts();
      setNewTag("");
      setSelectedContacts(new Set());
      toast({
        title: tagAction === "add" ? "Тег добавлен" : "Тег удалён",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const handleApplyTag = (tag: string) => {
    if (selectedContacts.size === 0) {
      toast({ title: "Выберите контакты", variant: "destructive" });
      return;
    }
    updateTagsMutation.mutate({
      ids: Array.from(selectedContacts),
      tag,
      action: tagAction,
    });
  };

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedContacts(new Set(contacts.map((c) => c.id)));
  };

  const deselectAll = () => {
    setSelectedContacts(new Set());
  };

  return (
    <div className="space-y-6" data-testid="tag-management">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Управление тегами
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={tagAction === "add" ? "default" : "outline"}
              size="sm"
              onClick={() => setTagAction("add")}
            >
              <Plus className="h-4 w-4 mr-1" />
              Добавить
            </Button>
            <Button
              variant={tagAction === "remove" ? "default" : "outline"}
              size="sm"
              onClick={() => setTagAction("remove")}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Удалить
            </Button>
          </div>

          <div>
            <Label className="text-sm">Новый тег</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Введите тег"
                className="flex-1"
                data-testid="input-new-tag"
              />
              <Button
                onClick={() => handleApplyTag(newTag)}
                disabled={!newTag.trim() || selectedContacts.size === 0 || updateTagsMutation.isPending}
                data-testid="button-apply-tag"
              >
                {updateTagsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Применить"
                )}
              </Button>
            </div>
          </div>

          {allTags.length > 0 && (
            <div>
              <Label className="text-sm">Или выберите существующий</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {allTags.slice(0, 20).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover-elevate"
                    onClick={() => handleApplyTag(tag)}
                    data-testid={`tag-option-${tag}`}
                  >
                    {tag}
                  </Badge>
                ))}
                {allTags.length > 20 && (
                  <span className="text-xs text-muted-foreground self-center">
                    +{allTags.length - 20} ещё
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Контакты ({selectedContacts.size}/{contacts.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Выбрать все
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Снять выбор
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-auto space-y-1">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer"
                onClick={() => toggleContact(contact.id)}
                data-testid={`tag-contact-${contact.id}`}
              >
                <Checkbox
                  checked={selectedContacts.has(contact.id)}
                  onCheckedChange={() => toggleContact(contact.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm flex-1">{contact.fullName}</span>
                <div className="flex gap-1">
                  {contact.tags?.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {(contact.tags?.length || 0) > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{(contact.tags?.length || 0) - 2}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
