import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Plus, Trash2, Loader2, Pencil, X, Search, Briefcase } from "lucide-react";
import type { Contact } from "@/lib/types";

interface RoleManagementProps {
  contacts: Contact[];
}

export function RoleManagement({ contacts }: RoleManagementProps) {
  const [newRole, setNewRole] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [roleAction, setRoleAction] = useState<"add" | "remove">("add");
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editedRoleName, setEditedRoleName] = useState("");
  const [deletingRole, setDeletingRole] = useState<string | null>(null);
  const [deletingMultipleRoles, setDeletingMultipleRoles] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const { toast } = useToast();

  const filteredContacts = contacts.filter((contact) =>
    contact.fullName.toLowerCase().includes(contactSearch.toLowerCase()) ||
    contact.shortName?.toLowerCase().includes(contactSearch.toLowerCase()) ||
    contact.tags?.some((tag) => tag.toLowerCase().includes(contactSearch.toLowerCase())) ||
    contact.roleTags?.some((tag) => tag.toLowerCase().includes(contactSearch.toLowerCase()))
  );

  const allRoles = Array.from(
    new Set(contacts.flatMap((c) => c.roleTags || []))
  ).sort();

  const getContactsWithRole = (role: string) => 
    contacts.filter((c) => c.roleTags?.includes(role));

  const toggleRoleSelection = (role: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  };

  const selectAllRoles = () => {
    setSelectedRoles(new Set(allRoles));
  };

  const deselectAllRoles = () => {
    setSelectedRoles(new Set());
  };

  const updateRolesMutation = useMutation({
    mutationFn: async ({ ids, role, action }: { ids: string[]; role: string; action: "add" | "remove" }) => {
      const updates = ids.map(async (id) => {
        const contact = contacts.find((c) => c.id === id);
        if (!contact) return null;

        let newRoleTags = [...(contact.roleTags || [])];
        if (action === "add" && !newRoleTags.includes(role)) {
          newRoleTags.push(role);
        } else if (action === "remove") {
          newRoleTags = newRoleTags.filter((t) => t !== role);
        }

        return bulkApi.updateContacts([id], { roleTags: newRoleTags });
      });

      return Promise.all(updates);
    },
    onSuccess: () => {
      invalidateContacts();
      setNewRole("");
      setSelectedContacts(new Set());
      toast({
        title: roleAction === "add" ? "Роль добавлена" : "Роль удалена",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const renameRoleMutation = useMutation({
    mutationFn: async ({ oldRole, newRoleName }: { oldRole: string; newRoleName: string }) => {
      const affectedContacts = getContactsWithRole(oldRole);
      const updates = affectedContacts.map(async (contact) => {
        const newRoleTags = (contact.roleTags || []).map((t) => (t === oldRole ? newRoleName : t));
        return bulkApi.updateContacts([contact.id], { roleTags: newRoleTags });
      });
      return Promise.all(updates);
    },
    onSuccess: (_, { oldRole, newRoleName }) => {
      invalidateContacts();
      setEditingRole(null);
      setEditedRoleName("");
      toast({ title: "Роль переименована", description: `"${oldRole}" → "${newRoleName}"` });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      const affectedContacts = getContactsWithRole(role);
      const updates = affectedContacts.map(async (contact) => {
        const newRoleTags = (contact.roleTags || []).filter((t) => t !== role);
        return bulkApi.updateContacts([contact.id], { roleTags: newRoleTags });
      });
      return Promise.all(updates);
    },
    onSuccess: (_, role) => {
      invalidateContacts();
      setDeletingRole(null);
      toast({ title: "Роль удалена", description: `Роль "${role}" удалена у всех контактов` });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const deleteMultipleRolesMutation = useMutation({
    mutationFn: async (roles: string[]) => {
      const affectedContactsMap = new Map<string, Contact>();
      roles.forEach((role) => {
        getContactsWithRole(role).forEach((c) => affectedContactsMap.set(c.id, c));
      });
      
      const updates = Array.from(affectedContactsMap.values()).map(async (contact) => {
        const newRoleTags = (contact.roleTags || []).filter((t) => !roles.includes(t));
        return bulkApi.updateContacts([contact.id], { roleTags: newRoleTags });
      });
      return Promise.all(updates);
    },
    onSuccess: (_, roles) => {
      invalidateContacts();
      setDeletingMultipleRoles(false);
      setSelectedRoles(new Set());
      toast({ title: "Роли удалены", description: `Удалено ${roles.length} ролей` });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const handleDeleteSelectedRoles = () => {
    if (selectedRoles.size === 0) {
      toast({ title: "Выберите роли для удаления", variant: "destructive" });
      return;
    }
    setDeletingMultipleRoles(true);
  };

  const confirmDeleteMultipleRoles = () => {
    deleteMultipleRolesMutation.mutate(Array.from(selectedRoles));
  };

  const handleEditRole = (role: string) => {
    setEditingRole(role);
    setEditedRoleName(role);
  };

  const handleSaveRename = () => {
    if (!editingRole || !editedRoleName.trim()) return;
    if (editedRoleName === editingRole) {
      setEditingRole(null);
      return;
    }
    renameRoleMutation.mutate({ oldRole: editingRole, newRoleName: editedRoleName.trim() });
  };

  const handleDeleteRole = () => {
    if (!deletingRole) return;
    deleteRoleMutation.mutate(deletingRole);
  };

  const handleApplyRole = (role: string) => {
    if (selectedContacts.size === 0) {
      toast({ title: "Выберите контакты", variant: "destructive" });
      return;
    }
    updateRolesMutation.mutate({
      ids: Array.from(selectedContacts),
      role,
      action: roleAction,
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
    <div className="space-y-6" data-testid="role-management">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Управление ролями
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={roleAction === "add" ? "default" : "outline"}
              size="sm"
              onClick={() => setRoleAction("add")}
            >
              <Plus className="h-4 w-4 mr-1" />
              Добавить
            </Button>
            <Button
              variant={roleAction === "remove" ? "default" : "outline"}
              size="sm"
              onClick={() => setRoleAction("remove")}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Удалить
            </Button>
          </div>

          <div>
            <Label className="text-sm">Новая роль</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Введите роль"
                className="flex-1"
                data-testid="input-new-role"
              />
              <Button
                onClick={() => handleApplyRole(newRole)}
                disabled={!newRole.trim() || selectedContacts.size === 0 || updateRolesMutation.isPending}
                data-testid="button-apply-role"
              >
                {updateRolesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Применить"
                )}
              </Button>
            </div>
          </div>

          {allRoles.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Существующие роли ({allRoles.length})</Label>
                <div className="flex gap-2">
                  {selectedRoles.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelectedRoles}
                      disabled={deleteMultipleRolesMutation.isPending}
                      data-testid="button-delete-selected-roles"
                    >
                      {deleteMultipleRolesMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1" />
                      )}
                      Удалить ({selectedRoles.size})
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={selectAllRoles}>
                    Все
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllRoles}>
                    Сбросить
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {allRoles.slice(0, 50).map((role) => (
                  <div 
                    key={role} 
                    className={`group flex items-center gap-1 p-1 rounded-md transition-colors ${
                      selectedRoles.has(role) ? "bg-primary/10" : ""
                    }`}
                  >
                    <Checkbox
                      checked={selectedRoles.has(role)}
                      onCheckedChange={() => toggleRoleSelection(role)}
                      className="h-4 w-4"
                      data-testid={`checkbox-role-${role}`}
                    />
                    <Badge
                      variant={selectedRoles.has(role) ? "default" : "secondary"}
                      className="cursor-pointer hover-elevate pr-1"
                      onClick={() => handleApplyRole(role)}
                      data-testid={`role-option-${role}`}
                    >
                      <span className="mr-1">{role}</span>
                      <span className="text-xs opacity-70">
                        ({getContactsWithRole(role).length})
                      </span>
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditRole(role);
                      }}
                      data-testid={`button-edit-role-${role}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingRole(role);
                      }}
                      data-testid={`button-delete-role-${role}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {allRoles.length > 50 && (
                  <span className="text-xs text-muted-foreground self-center">
                    +{allRoles.length - 50} ещё
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
              data-testid="input-role-contact-search"
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
                data-testid={`role-contact-${contact.id}`}
              >
                <Checkbox
                  checked={selectedContacts.has(contact.id)}
                  onCheckedChange={() => toggleContact(contact.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm flex-1">{contact.fullName}</span>
                <div className="flex gap-1">
                  {contact.roleTags?.slice(0, 2).map((role) => (
                    <Badge key={role} variant="outline" className="text-xs">
                      {role}
                    </Badge>
                  ))}
                  {(contact.roleTags?.length || 0) > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{(contact.roleTags?.length || 0) - 2}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Переименовать роль</DialogTitle>
            <DialogDescription>
              Роль будет переименована у {editingRole ? getContactsWithRole(editingRole).length : 0} контактов
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Новое название</Label>
              <Input
                value={editedRoleName}
                onChange={(e) => setEditedRoleName(e.target.value)}
                placeholder="Введите новое название"
                className="mt-1"
                data-testid="input-edit-role-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRole(null)}>
              Отмена
            </Button>
            <Button 
              onClick={handleSaveRename}
              disabled={!editedRoleName.trim() || renameRoleMutation.isPending}
              data-testid="button-save-role-rename"
            >
              {renameRoleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingRole} onOpenChange={(open) => !open && setDeletingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить роль?</AlertDialogTitle>
            <AlertDialogDescription>
              Роль "{deletingRole}" будет удалена у {deletingRole ? getContactsWithRole(deletingRole).length : 0} контактов. 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-role"
            >
              {deleteRoleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deletingMultipleRoles} onOpenChange={(open) => !open && setDeletingMultipleRoles(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить {selectedRoles.size} ролей?</AlertDialogTitle>
            <AlertDialogDescription>
              Выбранные роли будут удалены у всех контактов. Это действие нельзя отменить.
              <div className="mt-2 max-h-32 overflow-auto">
                <div className="flex flex-wrap gap-1">
                  {Array.from(selectedRoles).slice(0, 10).map((role) => (
                    <Badge key={role} variant="secondary" className="text-xs">
                      {role}
                    </Badge>
                  ))}
                  {selectedRoles.size > 10 && (
                    <span className="text-xs text-muted-foreground">
                      +{selectedRoles.size - 10} ещё
                    </span>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteMultipleRoles}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-multiple-roles"
            >
              {deleteMultipleRolesMutation.isPending ? (
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
