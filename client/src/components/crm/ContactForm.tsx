import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ATTENTION_LEVELS, ROLE_TAGS, CONTRIBUTION_CRITERIA, POTENTIAL_CRITERIA } from "@/lib/constants";
import { X, Plus, Loader2 } from "lucide-react";
import type { Contact, InsertContact } from "@/lib/types";

interface ContactFormProps {
  initialData?: Contact;
  onSubmit: (data: InsertContact) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ContactForm({ initialData, onSubmit, onCancel, isLoading }: ContactFormProps) {
  const [formData, setFormData] = useState<InsertContact>({
    fullName: initialData?.fullName || "",
    shortName: initialData?.shortName || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    socialLinks: initialData?.socialLinks || [],
    tags: initialData?.tags || [],
    roleTags: initialData?.roleTags || [],
    importanceLevel: initialData?.importanceLevel || "C",
    attentionLevel: initialData?.attentionLevel || 1,
    desiredFrequencyDays: initialData?.desiredFrequencyDays || 30,
    responseQuality: initialData?.responseQuality || 2,
    relationshipEnergy: initialData?.relationshipEnergy || 3,
    attentionTrend: initialData?.attentionTrend || 0,
    contributionDetails: initialData?.contributionDetails || {
      financial: 0,
      network: 0,
      tactical: 0,
      strategic: 0,
      loyalty: 0,
    },
    potentialDetails: initialData?.potentialDetails || {
      personal: 0,
      resources: 0,
      network: 0,
      synergy: 0,
      systemRole: 0,
    },
    lastContactDate: initialData?.lastContactDate || null,
  });

  const [newSocialLink, setNewSocialLink] = useState("");
  const [newTag, setNewTag] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addSocialLink = () => {
    if (newSocialLink.trim()) {
      setFormData({
        ...formData,
        socialLinks: [...(formData.socialLinks || []), newSocialLink.trim()],
      });
      setNewSocialLink("");
    }
  };

  const removeSocialLink = (index: number) => {
    setFormData({
      ...formData,
      socialLinks: formData.socialLinks?.filter((_, i) => i !== index) || [],
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), newTag.trim()],
      });
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    });
  };

  const toggleRoleTag = (tag: string) => {
    const currentTags = formData.roleTags || [];
    if (currentTags.includes(tag)) {
      setFormData({
        ...formData,
        roleTags: currentTags.filter((t) => t !== tag),
      });
    } else {
      setFormData({
        ...formData,
        roleTags: [...currentTags, tag],
      });
    }
  };

  const updateContribution = (key: string, value: number) => {
    setFormData({
      ...formData,
      contributionDetails: {
        ...formData.contributionDetails!,
        [key]: value,
      },
    });
  };

  const updatePotential = (key: string, value: number) => {
    setFormData({
      ...formData,
      potentialDetails: {
        ...formData.potentialDetails!,
        [key]: value,
      },
    });
  };

  const attentionInfo = ATTENTION_LEVELS.find((l) => l.id === formData.attentionLevel);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Основное</TabsTrigger>
          <TabsTrigger value="priority">Приоритеты</TabsTrigger>
          <TabsTrigger value="contribution">Вклад</TabsTrigger>
          <TabsTrigger value="potential">Потенциал</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Полное имя *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Иван Иванов"
                required
                data-testid="input-fullName"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortName">Короткое имя</Label>
              <Input
                id="shortName"
                value={formData.shortName || ""}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                placeholder="Ваня"
                data-testid="input-shortName"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+7 999 123-45-67"
                data-testid="input-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                data-testid="input-email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Социальные ссылки</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.socialLinks?.map((link, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {link}
                  <button type="button" onClick={() => removeSocialLink(i)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newSocialLink}
                onChange={(e) => setNewSocialLink(e.target.value)}
                placeholder="t.me/username"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSocialLink())}
              />
              <Button type="button" variant="outline" size="icon" onClick={addSocialLink}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Роли</Label>
            <div className="flex flex-wrap gap-2">
              {ROLE_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={formData.roleTags?.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleRoleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Теги</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags?.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Добавить тег"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" size="icon" onClick={addTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="priority" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Важность контакта</Label>
              <Select
                value={formData.importanceLevel}
                onValueChange={(v) => setFormData({ ...formData, importanceLevel: v as "A" | "B" | "C" })}
              >
                <SelectTrigger data-testid="select-importance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A - Высокая</SelectItem>
                  <SelectItem value="B">B - Средняя</SelectItem>
                  <SelectItem value="C">C - Низкая</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Желаемая частота контакта (дней)</Label>
              <Input
                type="number"
                min={1}
                value={formData.desiredFrequencyDays}
                onChange={(e) => setFormData({ ...formData, desiredFrequencyDays: parseInt(e.target.value) || 30 })}
                data-testid="input-frequency"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Уровень внимания: {formData.attentionLevel}</Label>
            <Slider
              value={[formData.attentionLevel || 1]}
              onValueChange={([v]) => setFormData({ ...formData, attentionLevel: v })}
              min={1}
              max={10}
              step={1}
              className="w-full"
              data-testid="slider-attention"
            />
            {attentionInfo && (
              <p className="text-sm text-muted-foreground">
                {attentionInfo.name}: {attentionInfo.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Качество ответа</Label>
              <Select
                value={String(formData.responseQuality)}
                onValueChange={(v) => setFormData({ ...formData, responseQuality: parseInt(v) })}
              >
                <SelectTrigger data-testid="select-response">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 - Не отвечает</SelectItem>
                  <SelectItem value="1">1 - Редко отвечает</SelectItem>
                  <SelectItem value="2">2 - Нормально</SelectItem>
                  <SelectItem value="3">3 - Быстро отвечает</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Энергия связи</Label>
              <Select
                value={String(formData.relationshipEnergy)}
                onValueChange={(v) => setFormData({ ...formData, relationshipEnergy: parseInt(v) })}
              >
                <SelectTrigger data-testid="select-energy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Очень слабая</SelectItem>
                  <SelectItem value="2">2 - Слабая</SelectItem>
                  <SelectItem value="3">3 - Средняя</SelectItem>
                  <SelectItem value="4">4 - Сильная</SelectItem>
                  <SelectItem value="5">5 - Очень сильная</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Тренд внимания</Label>
            <Select
              value={String(formData.attentionTrend)}
              onValueChange={(v) => setFormData({ ...formData, attentionTrend: parseInt(v) })}
            >
              <SelectTrigger data-testid="select-trend">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-1">Падает</SelectItem>
                <SelectItem value="0">Стабилен</SelectItem>
                <SelectItem value="1">Растёт</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Дата последнего контакта</Label>
            <Input
              type="date"
              value={formData.lastContactDate || ""}
              onChange={(e) => setFormData({ ...formData, lastContactDate: e.target.value || null })}
              data-testid="input-lastContact"
            />
          </div>
        </TabsContent>

        <TabsContent value="contribution" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Оцените вклад контакта по каждому критерию от 0 до 3
          </p>
          {CONTRIBUTION_CRITERIA.map((criterion) => (
            <div key={criterion.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{criterion.label}</Label>
                <span className="text-sm font-mono">
                  {formData.contributionDetails?.[criterion.key as keyof typeof formData.contributionDetails] || 0}/3
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{criterion.description}</p>
              <Slider
                value={[formData.contributionDetails?.[criterion.key as keyof typeof formData.contributionDetails] || 0]}
                onValueChange={([v]) => updateContribution(criterion.key, v)}
                min={0}
                max={3}
                step={1}
                className="w-full"
              />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="potential" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Оцените потенциал контакта по каждому критерию от 0 до 3
          </p>
          {POTENTIAL_CRITERIA.map((criterion) => (
            <div key={criterion.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{criterion.label}</Label>
                <span className="text-sm font-mono">
                  {formData.potentialDetails?.[criterion.key as keyof typeof formData.potentialDetails] || 0}/3
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{criterion.description}</p>
              <Slider
                value={[formData.potentialDetails?.[criterion.key as keyof typeof formData.potentialDetails] || 0]}
                onValueChange={([v]) => updatePotential(criterion.key, v)}
                min={0}
                max={3}
                step={1}
                className="w-full"
              />
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Отмена
        </Button>
        <Button type="submit" disabled={isLoading || !formData.fullName} data-testid="button-submit">
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {initialData ? "Сохранить" : "Создать"}
        </Button>
      </div>
    </form>
  );
}
