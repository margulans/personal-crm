import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsMatrix } from "@/components/crm/AnalyticsMatrix";
import { PriorityList } from "@/components/crm/PriorityList";
import { ContactDetail } from "@/components/crm/ContactDetail";
import {
  HeatStatusChart,
  ValueCategoryChart,
  ImportanceLevelChart,
  AttentionDistributionChart,
} from "@/components/crm/AnalyticsCharts";
import { interactionsApi, invalidateContacts, invalidateInteractions } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Users, TrendingUp, TrendingDown, Activity, Loader2 } from "lucide-react";
import type { Contact, Interaction } from "@/lib/types";

export default function AnalyticsPage() {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: ["/api/contacts", selectedContactId, "interactions"],
    queryFn: () => interactionsApi.getByContact(selectedContactId!),
    enabled: !!selectedContactId,
  });

  const addInteractionMutation = useMutation({
    mutationFn: ({ contactId, data }: { contactId: string; data: { date: string; type: string; channel: string; note: string; isMeaningful: boolean } }) =>
      interactionsApi.create(contactId, data),
    onSuccess: () => {
      if (selectedContactId) {
        invalidateInteractions(selectedContactId);
        invalidateContacts();
      }
      toast({ title: "Взаимодействие добавлено" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const selectedContact = contacts.find((c) => c.id === selectedContactId) || null;

  const stats = {
    total: contacts.length,
    green: contacts.filter((c) => c.heatStatus === "green").length,
    yellow: contacts.filter((c) => c.heatStatus === "yellow").length,
    red: contacts.filter((c) => c.heatStatus === "red").length,
    aClass: contacts.filter((c) => c.importanceLevel === "A").length,
    avgHeatIndex: contacts.length > 0
      ? contacts.reduce((sum, c) => sum + c.heatIndex, 0) / contacts.length
      : 0,
  };

  const urgentContacts = contacts.filter(
    (c) =>
      c.heatStatus === "red" &&
      (c.valueCategory.startsWith("A") ||
        c.valueCategory === "BA" ||
        c.valueCategory === "AB")
  );

  const developContacts = contacts.filter(
    (c) =>
      c.heatStatus === "yellow" &&
      (c.valueCategory.startsWith("A") ||
        c.valueCategory === "BA" ||
        c.valueCategory === "AB")
  );

  if (selectedContact) {
    return (
      <ContactDetail
        contact={selectedContact}
        interactions={interactions}
        onBack={() => setSelectedContactId(null)}
        onAddInteraction={(data) => {
          addInteractionMutation.mutate({ contactId: selectedContact.id, data });
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto" data-testid="analytics-page">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Аналитика</h1>
          <p className="text-muted-foreground">
            Обзор состояния вашей сети контактов
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Всего контактов</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {stats.green}
                  </div>
                  <div className="text-xs text-muted-foreground">В зелёной зоне</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">
                    {stats.red}
                  </div>
                  <div className="text-xs text-muted-foreground">В красной зоне</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Activity className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">
                    {stats.avgHeatIndex.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">Средний HeatIndex</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {contacts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Нет контактов для анализа. Добавьте контакты на странице "Контакты".
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <AnalyticsMatrix
                  contacts={contacts}
                  onCellClick={(importance, status) => {
                    console.log(`Filter: ${importance}-class, ${status} status`);
                  }}
                />
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <PriorityList
                  title="Срочно связаться"
                  description="AA/AB/BA контакты в красной зоне"
                  contacts={urgentContacts}
                  variant="urgent"
                  onContactClick={(c) => setSelectedContactId(c.id)}
                />
                <PriorityList
                  title="Для развития"
                  description="AA/AB/BA контакты в жёлтой зоне"
                  contacts={developContacts}
                  variant="develop"
                  onContactClick={(c) => setSelectedContactId(c.id)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <HeatStatusChart contacts={contacts} />
              <ImportanceLevelChart contacts={contacts} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ValueCategoryChart contacts={contacts} />
              <AttentionDistributionChart contacts={contacts} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
