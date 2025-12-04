import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Copy, Plus, RefreshCw, Users, UserMinus, ArrowLeft, Save, RotateCcw, Trash2, Shield, Loader2 } from "lucide-react";
import type { Team, User, Backup } from "@shared/schema";
import { Link } from "wouter";

interface TeamWithMembers extends Team {
  members: { 
    id: string;
    teamId: string;
    userId: string;
    role: string;
    joinedAt: string;
    user: User;
  }[];
}

interface AuthUser extends User {
  teams: (Team & { role: string })[];
}

export default function TeamPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const { data: user, isLoading: userLoading } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
  });

  const currentTeamId = user?.teams?.[0]?.id;

  const { data: team, isLoading: teamLoading } = useQuery<TeamWithMembers>({
    queryKey: ["/api/teams", currentTeamId],
    enabled: !!currentTeamId,
  });

  const createTeamMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/teams", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setCreateDialogOpen(false);
      setNewTeamName("");
      toast({ title: "Команда создана" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const joinTeamMutation = useMutation({
    mutationFn: async (code: string) => {
      return await apiRequest("POST", "/api/teams/join", { inviteCode: code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setJoinDialogOpen(false);
      setInviteCode("");
      toast({ title: "Вы присоединились к команде" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const regenerateCodeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/teams/${currentTeamId}/regenerate-code`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", currentTeamId] });
      toast({ title: "Код обновлён" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/teams/${currentTeamId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", currentTeamId] });
      toast({ title: "Участник удалён" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const userRole = user?.teams?.find(t => t.id === currentTeamId)?.role;
  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";

  // Backup operations
  const { data: backupsList = [], isLoading: backupsLoading } = useQuery<Backup[]>({
    queryKey: ["/api/backups"],
    enabled: !!currentTeamId && isOwnerOrAdmin,
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/backups", { description: "Ручной бекап" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backups"] });
      toast({ title: "Бекап создан", description: "Данные успешно сохранены" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      return await apiRequest("POST", `/api/backups/${backupId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Бекап восстановлен", description: "Данные успешно восстановлены" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      return await apiRequest("DELETE", `/api/backups/${backupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backups"] });
      toast({ title: "Бекап удалён" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const recalculateContributionsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/contacts/recalculate-contributions");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Баллы пересчитаны", description: `Обновлено контактов: ${data.updated}` });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const copyInviteCode = () => {
    if (team?.inviteCode) {
      navigator.clipboard.writeText(team.inviteCode);
      toast({ title: "Код скопирован" });
    }
  };

  const isLoading = userLoading || teamLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild data-testid="button-back">
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Команда</h1>
      </div>

      {!currentTeamId ? (
        <Card data-testid="card-no-team">
          <CardHeader>
            <CardTitle>У вас нет команды</CardTitle>
            <CardDescription>
              Создайте новую команду или присоединитесь к существующей по коду приглашения.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-team">
                  <Plus className="h-4 w-4 mr-2" />
                  Создать команду
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создать команду</DialogTitle>
                  <DialogDescription>
                    Придумайте название для вашей команды
                  </DialogDescription>
                </DialogHeader>
                <Input
                  placeholder="Название команды"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  data-testid="input-team-name"
                />
                <DialogFooter>
                  <Button
                    onClick={() => createTeamMutation.mutate(newTeamName)}
                    disabled={!newTeamName.trim() || createTeamMutation.isPending}
                    data-testid="button-confirm-create"
                  >
                    Создать
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-join-team">
                  <Users className="h-4 w-4 mr-2" />
                  Присоединиться
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Присоединиться к команде</DialogTitle>
                  <DialogDescription>
                    Введите код приглашения от владельца команды
                  </DialogDescription>
                </DialogHeader>
                <Input
                  placeholder="Код приглашения"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  data-testid="input-invite-code"
                />
                <DialogFooter>
                  <Button
                    onClick={() => joinTeamMutation.mutate(inviteCode)}
                    disabled={!inviteCode.trim() || joinTeamMutation.isPending}
                    data-testid="button-confirm-join"
                  >
                    Присоединиться
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card data-testid="card-team-info">
            <CardHeader>
              <CardTitle data-testid="text-team-name">{team?.name}</CardTitle>
              <CardDescription>
                {team?.members?.length || 0} участник(ов)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isOwnerOrAdmin && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-muted-foreground">Код приглашения:</span>
                    <code className="px-2 py-1 bg-muted rounded font-mono" data-testid="text-invite-code">
                      {team?.inviteCode}
                    </code>
                    <Button variant="ghost" size="icon" onClick={copyInviteCode} data-testid="button-copy-code">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => regenerateCodeMutation.mutate()}
                      disabled={regenerateCodeMutation.isPending}
                      data-testid="button-regenerate-code"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Поделитесь этим кодом с коллегами для приглашения в команду.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-team-members">
            <CardHeader>
              <CardTitle>Участники</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {team?.members?.map((member) => (
                  <div key={member.id} className="flex items-center justify-between" data-testid={`row-member-${member.userId}`}>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.user.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {(member.user.firstName?.[0] || "") + (member.user.lastName?.[0] || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium" data-testid={`text-member-name-${member.userId}`}>
                          {member.user.firstName} {member.user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.role === "owner" ? "default" : "secondary"} data-testid={`badge-role-${member.userId}`}>
                        {member.role === "owner" ? "Владелец" : member.role === "admin" ? "Админ" : "Участник"}
                      </Badge>
                      {isOwnerOrAdmin && member.role !== "owner" && member.userId !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMemberMutation.mutate(member.userId)}
                          disabled={removeMemberMutation.isPending}
                          data-testid={`button-remove-member-${member.userId}`}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {isOwnerOrAdmin && (
            <Card data-testid="card-backups">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle>Резервные копии</CardTitle>
                  </div>
                  <Button
                    onClick={() => createBackupMutation.mutate()}
                    disabled={createBackupMutation.isPending}
                    data-testid="button-create-backup"
                  >
                    {createBackupMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Создать бекап
                  </Button>
                </div>
                <CardDescription>
                  Автоматические ежедневные бекапы хранятся 30 дней. Только владелец и админы могут восстанавливать данные.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {backupsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : backupsList.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Нет бекапов. Создайте первый бекап или дождитесь автоматического ежедневного бекапа.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {backupsList.slice(0, 10).map((backup) => (
                      <div key={backup.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`row-backup-${backup.id}`}>
                        <div>
                          <p className="font-medium text-sm">{backup.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(backup.createdAt)} • {backup.contactsCount} контактов
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" data-testid={`button-restore-${backup.id}`}>
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Восстановить
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Восстановить данные?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Это действие заменит все текущие контакты данными из бекапа от {formatDate(backup.createdAt)}.
                                  Перед восстановлением будет автоматически создан бекап текущих данных.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => restoreBackupMutation.mutate(backup.id)}
                                  disabled={restoreBackupMutation.isPending}
                                >
                                  {restoreBackupMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                  Восстановить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-delete-backup-${backup.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить бекап?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Это действие нельзя отменить. Бекап от {formatDate(backup.createdAt)} будет удалён.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteBackupMutation.mutate(backup.id)}
                                  disabled={deleteBackupMutation.isPending}
                                >
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                    {backupsList.length > 10 && (
                      <p className="text-center text-sm text-muted-foreground">
                        Показаны последние 10 из {backupsList.length} бекапов
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isOwnerOrAdmin && (
            <Card data-testid="card-recalculate">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  <CardTitle>Пересчёт баллов</CardTitle>
                </div>
                <CardDescription>
                  Пересчитать баллы вкладов для всех контактов. Баллы критериев (Ресурсный, Репутационный, Эмоциональный, Интеллектуальный) 
                  рассчитываются автоматически по количеству записей вкладов: 1-2 = 1 балл, 3-5 = 2 балла, 6+ = 3 балла.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => recalculateContributionsMutation.mutate()}
                  disabled={recalculateContributionsMutation.isPending}
                  data-testid="button-recalculate-contributions"
                >
                  {recalculateContributionsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Пересчитать баллы
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
