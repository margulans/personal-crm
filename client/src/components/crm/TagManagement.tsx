import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { bulkApi, invalidateContacts } from "@/lib/api";
import { Plus, Trash2, Tag, Loader2, Pencil, X, Search } from "lucide-react";
import type { Contact } from "@/lib/types";

interface TagManagementProps {
  contacts: Contact[];
}

export function TagManagement({ contacts }: TagManagementProps) {
  const [newTag, setNewTag] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [tagAction, setTagAction] = useState<"add" | "remove">("add");
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editedTagName, setEditedTagName] = useState("");
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const [deletingMultipleTags, setDeletingMultipleTags] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const { toast } = useToast();

  const filteredContacts = contacts.filter((contact) =>
    contact.fullName.toLowerCase().includes(contactSearch.toLowerCase()) ||
    contact.shortName?.toLowerCase().includes(contactSearch.toLowerCase()) ||
    contact.tags?.some((tag) => tag.toLowerCase().includes(contactSearch.toLowerCase())) ||
    contact.roleTags?.some((tag) => tag.toLowerCase().includes(contactSearch.toLowerCase()))
  );

  const allTags = Array.from(
    new Set([
      ...contacts.flatMap((c) => c.tags || []),
      ...contacts.flatMap((c) => c.roleTags || [])
    ])
  ).sort();

  const getContactsWithTag = (tag: string) => 
    contacts.filter((c) => c.tags?.includes(tag) || c.roleTags?.includes(tag));
  
  const isRoleTag = (tag: string) => 
    contacts.some((c) => c.roleTags?.includes(tag));

  const toggleTagSelection = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const selectAllTags = () => {
    setSelectedTags(new Set(allTags));
  };

  const deselectAllTags = () => {
    setSelectedTags(new Set());
  };

  const updateTagsMutation = useMutation({
    mutationFn: async ({ ids, tag, action, tagType }: { ids: string[]; tag: string; action: "add" | "remove"; tagType: "tags" | "roleTags" }) => {
      const updates = ids.map(async (id) => {
        const contact = contacts.find((c) => c.id === id);
        if (!contact) return null;

        if (tagType === "roleTags") {
          let newRoleTags = [...(contact.roleTags || [])];
          if (action === "add" && !newRoleTags.includes(tag)) {
            newRoleTags.push(tag);
          } else if (action === "remove") {
            newRoleTags = newRoleTags.filter((t) => t !== tag);
          }
          return bulkApi.updateContacts([id], { roleTags: newRoleTags });
        } else {
          let newTags = [...(contact.tags || [])];
          if (action === "add" && !newTags.includes(tag)) {
            newTags.push(tag);
          } else if (action === "remove") {
            newTags = newTags.filter((t) => t !== tag);
          }
          return bulkApi.updateContacts([id], { tags: newTags });
        }
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

  const renameTagMutation = useMutation({
    mutationFn: async ({ oldTag, newTagName }: { oldTag: string; newTagName: string }) => {
      const affectedContacts = getContactsWithTag(oldTag);
      const updates = affectedContacts.map(async (contact) => {
        const newTags = (contact.tags || []).map((t) => (t === oldTag ? newTagName : t));
        return bulkApi.updateContacts([contact.id], { tags: newTags });
      });
      return Promise.all(updates);
    },
    onSuccess: (_, { oldTag, newTagName }) => {
      invalidateContacts();
      setEditingTag(null);
      setEditedTagName("");
      toast({ title: "Тег переименован", description: `"${oldTag}" → "${newTagName}"` });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      const affectedContacts = getContactsWithTag(tag);
      const updates = affectedContacts.map(async (contact) => {
        const newTags = (contact.tags || []).filter((t) => t !== tag);
        return bulkApi.updateContacts([contact.id], { tags: newTags });
      });
      return Promise.all(updates);
    },
    onSuccess: (_, tag) => {
      invalidateContacts();
      setDeletingTag(null);
      toast({ title: "Тег удалён", description: `Тег "${tag}" удалён у всех контактов` });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const deleteMultipleTagsMutation = useMutation({
    mutationFn: async (tags: string[]) => {
      const affectedContactsMap = new Map<string, Contact>();
      tags.forEach((tag) => {
        getContactsWithTag(tag).forEach((c) => affectedContactsMap.set(c.id, c));
      });
      
      const updates = Array.from(affectedContactsMap.values()).map(async (contact) => {
        const newTags = (contact.tags || []).filter((t) => !tags.includes(t));
        return bulkApi.updateContacts([contact.id], { tags: newTags });
      });
      return Promise.all(updates);
    },
    onSuccess: (_, tags) => {
      invalidateContacts();
      setDeletingMultipleTags(false);
      setSelectedTags(new Set());
      toast({ title: "Теги удалены", description: `Удалено ${tags.length} тегов` });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const handleDeleteSelectedTags = () => {
    if (selectedTags.size === 0) {
      toast({ title: "Выберите теги для удаления", variant: "destructive" });
      return;
    }
    setDeletingMultipleTags(true);
  };

  const confirmDeleteMultipleTags = () => {
    deleteMultipleTagsMutation.mutate(Array.from(selectedTags));
  };

  const handleEditTag = (tag: string) => {
    setEditingTag(tag);
    setEditedTagName(tag);
  };

  const handleSaveRename = () => {
    if (!editingTag || !editedTagName.trim()) return;
    if (editedTagName === editingTag) {
      setEditingTag(null);
      return;
    }
    renameTagMutation.mutate({ oldTag: editingTag, newTagName: editedTagName.trim() });
  };

  const handleDeleteTag = () => {
    if (!deletingTag) return;
    deleteTagMutation.mutate(deletingTag);
  };

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
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Существующие теги ({allTags.length})</Label>
                <div className="flex gap-2">
                  {selectedTags.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelectedTags}
                      disabled={deleteMultipleTagsMutation.isPending}
                      data-testid="button-delete-selected-tags"
                    >
                      {deleteMultipleTagsMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1" />
                      )}
                      Удалить ({selectedTags.size})
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={selectAllTags}>
                    Все
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllTags}>
                    Сбросить
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {allTags.slice(0, 50).map((tag) => (
                  <div 
                    key={tag} 
                    className={`group flex items-center gap-1 p-1 rounded-md transition-colors ${
                      selectedTags.has(tag) ? "bg-primary/10" : ""
                    }`}
                  >
                    <Checkbox
                      checked={selectedTags.has(tag)}
                      onCheckedChange={() => toggleTagSelection(tag)}
                      className="h-4 w-4"
                      data-testid={`checkbox-tag-${tag}`}
                    />
                    <Badge
                      variant={selectedTags.has(tag) ? "default" : "secondary"}
                      className="cursor-pointer hover-elevate pr-1"
                      onClick={() => handleApplyTag(tag)}
                      data-testid={`tag-option-${tag}`}
                    >
                      <span className="mr-1">{tag}</span>
                      <span className="text-xs opacity-70">
                        ({getContactsWithTag(tag).length})
                      </span>
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTag(tag);
                      }}
                      data-testid={`button-edit-tag-${tag}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingTag(tag);
                      }}
                      data-testid={`button-delete-tag-${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {allTags.length > 50 && (
                  <span className="text-xs text-muted-foreground self-center">
                    +{allTags.length - 50} ещё
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
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
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder="Поиск контактов..."
              className="pl-8"
              data-testid="input-contact-search"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-auto space-y-1">
            {filteredContacts.length === 0 && contactSearch && (
              <div className="text-center text-muted-foreground py-4 text-sm">
                Контакты не найдены
              </div>
            )}
            {filteredContacts.map((contact) => (
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

      <Dialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Переименовать тег</DialogTitle>
            <DialogDescription>
              Тег будет переименован у {editingTag ? getContactsWithTag(editingTag).length : 0} контактов
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Новое название</Label>
              <Input
                value={editedTagName}
                onChange={(e) => setEditedTagName(e.target.value)}
                placeholder="Введите новое название"
                className="mt-1"
                data-testid="input-edit-tag-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTag(null)}>
              Отмена
            </Button>
            <Button 
              onClick={handleSaveRename}
              disabled={!editedTagName.trim() || renameTagMutation.isPending}
              data-testid="button-save-tag-rename"
            >
              {renameTagMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingTag} onOpenChange={(open) => !open && setDeletingTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить тег?</AlertDialogTitle>
            <AlertDialogDescription>
              Тег "{deletingTag}" будет удалён у {deletingTag ? getContactsWithTag(deletingTag).length : 0} контактов. 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTag}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-tag"
            >
              {deleteTagMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deletingMultipleTags} onOpenChange={(open) => !open && setDeletingMultipleTags(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить {selectedTags.size} тегов?</AlertDialogTitle>
            <AlertDialogDescription>
              Выбранные теги будут удалены у всех контактов. Это действие нельзя отменить.
              <div className="mt-2 max-h-32 overflow-auto">
                <div className="flex flex-wrap gap-1">
                  {Array.from(selectedTags).slice(0, 10).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {selectedTags.size > 10 && (
                    <span className="text-xs text-muted-foreground">
                      +{selectedTags.size - 10} ещё
                    </span>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteMultipleTags}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-multiple-tags"
            >
              {deleteMultipleTagsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Удалить все
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
