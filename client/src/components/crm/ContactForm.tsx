import { useState, useRef, useEffect } from "react";
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
  allTags?: string[];
  allRoles?: string[];
  initialTab?: "basic" | "priority" | "contribution" | "potential";
}

export function ContactForm({ initialData, onSubmit, onCancel, isLoading, allTags = [], allRoles = [], initialTab = "basic" }: ContactFormProps) {
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
    contributionDetails: (() => {
      if (initialData?.contributionDetails) {
        const oldData = initialData.contributionDetails as { 
          financial?: number; network?: number; tactical?: number; 
          strategic?: number; loyalty?: number; trust?: number 
        };
        if ('trust' in oldData) {
          return { financial: oldData.financial || 0, network: oldData.network || 0, trust: oldData.trust || 0 };
        }
        const trustValue = Math.min(3, Math.round(((oldData.tactical || 0) + (oldData.strategic || 0) + (oldData.loyalty || 0)) / 3));
        return { financial: oldData.financial || 0, network: oldData.network || 0, trust: trustValue };
      }
      return { financial: 0, network: 0, trust: 0 };
    })(),
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
  const [newRole, setNewRole] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagSuggestionsRef = useRef<HTMLDivElement>(null);
  const roleInputRef = useRef<HTMLInputElement>(null);
  const roleSuggestionsRef = useRef<HTMLDivElement>(null);

  const tagSuggestions = newTag.trim()
    ? allTags.filter(
        (tag) =>
          tag.toLowerCase().includes(newTag.toLowerCase()) &&
          !formData.tags?.includes(tag)
      )
    : [];

  const combinedRoles = Array.from(new Set([...ROLE_TAGS, ...allRoles])).sort();
  const roleSuggestions = newRole.trim()
    ? combinedRoles.filter(
        (role) =>
          role.toLowerCase().includes(newRole.toLowerCase()) &&
          !formData.roleTags?.includes(role)
      )
    : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tagSuggestionsRef.current &&
        !tagSuggestionsRef.current.contains(event.target as Node) &&
        tagInputRef.current &&
        !tagInputRef.current.contains(event.target as Node)
      ) {
        setShowTagSuggestions(false);
      }
      if (
        roleSuggestionsRef.current &&
        !roleSuggestionsRef.current.contains(event.target as Node) &&
        roleInputRef.current &&
        !roleInputRef.current.contains(event.target as Node)
      ) {
        setShowRoleSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const addTag = (tagToAdd?: string) => {
    const tag = tagToAdd || newTag.trim();
    if (tag && !formData.tags?.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tag],
      });
      setNewTag("");
      setShowTagSuggestions(false);
    }
  };

  const selectTagSuggestion = (tag: string) => {
    addTag(tag);
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    });
  };

  const addRole = (roleToAdd?: string) => {
    const role = roleToAdd || newRole.trim();
    if (role && !formData.roleTags?.includes(role)) {
      setFormData({
        ...formData,
        roleTags: [...(formData.roleTags || []), role],
      });
      setNewRole("");
      setShowRoleSuggestions(false);
    }
  };

  const selectRoleSuggestion = (role: string) => {
    addRole(role);
  };

  const removeRole = (role: string) => {
    setFormData({
      ...formData,
      roleTags: formData.roleTags?.filter((t) => t !== role) || [],
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
      <Tabs defaultValue={initialTab} className="w-full">
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
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.roleTags?.map((role) => (
                <Badge key={role} variant="secondary" className="gap-1">
                  {role}
                  <button type="button" onClick={() => removeRole(role)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 relative">
              <div className="flex-1 relative">
                <Input
                  ref={roleInputRef}
                  value={newRole}
                  onChange={(e) => {
                    setNewRole(e.target.value);
                    setShowRoleSuggestions(true);
                  }}
                  onFocus={() => setShowRoleSuggestions(true)}
                  placeholder="Добавить роль"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (roleSuggestions.length > 0) {
                        selectRoleSuggestion(roleSuggestions[0]);
                      } else {
                        addRole();
                      }
                    }
                  }}
                  data-testid="input-add-role"
                />
                {showRoleSuggestions && roleSuggestions.length > 0 && (
                  <div
                    ref={roleSuggestionsRef}
                    className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-auto"
                  >
                    {roleSuggestions.slice(0, 10).map((role) => (
                      <div
                        key={role}
                        className="px-3 py-2 cursor-pointer hover:bg-accent text-sm"
                        onClick={() => selectRoleSuggestion(role)}
                        data-testid={`role-suggestion-${role}`}
                      >
                        {role}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => addRole()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {allRoles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-xs text-muted-foreground mr-1">Существующие:</span>
                {allRoles.filter(role => !formData.roleTags?.includes(role)).slice(0, 8).map((role) => (
                  <Badge
                    key={role}
                    variant="outline"
                    className="cursor-pointer text-xs hover-elevate"
                    onClick={() => addRole(role)}
                  >
                    {role}
                  </Badge>
                ))}
              </div>
            )}
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
            <div className="flex gap-2 relative">
              <div className="flex-1 relative">
                <Input
                  ref={tagInputRef}
                  value={newTag}
                  onChange={(e) => {
                    setNewTag(e.target.value);
                    setShowTagSuggestions(true);
                  }}
                  onFocus={() => setShowTagSuggestions(true)}
                  placeholder="Добавить тег"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (tagSuggestions.length > 0) {
                        selectTagSuggestion(tagSuggestions[0]);
                      } else {
                        addTag();
                      }
                    }
                  }}
                  data-testid="input-add-tag"
                />
                {showTagSuggestions && tagSuggestions.length > 0 && (
                  <div
                    ref={tagSuggestionsRef}
                    className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-auto"
                  >
                    {tagSuggestions.slice(0, 10).map((tag) => (
                      <div
                        key={tag}
                        className="px-3 py-2 cursor-pointer hover:bg-accent text-sm"
                        onClick={() => selectTagSuggestion(tag)}
                        data-testid={`tag-suggestion-${tag}`}
                      >
                        {tag}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => addTag()}>
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
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.desiredFrequencyDays}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\D/g, '');
                  if (rawValue === '') {
                    setFormData({ ...formData, desiredFrequencyDays: 0 });
                  } else {
                    const val = parseInt(rawValue);
                    setFormData({ ...formData, desiredFrequencyDays: val });
                  }
                }}
                onBlur={(e) => {
                  const val = parseInt(e.target.value) || 30;
                  setFormData({ ...formData, desiredFrequencyDays: Math.max(1, val) });
                }}
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
            Оцените вклад контакта по каждому критерию от 0 до 3. Максимум 9 баллов.
          </p>
          {CONTRIBUTION_CRITERIA.map((criterion) => (
            <div key={criterion.key} className="space-y-2 p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="font-medium">{criterion.label}</Label>
                <span className="text-sm font-mono bg-background px-2 py-0.5 rounded">
                  {formData.contributionDetails?.[criterion.key as keyof typeof formData.contributionDetails] || 0}/3
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{criterion.description}</p>
              <p className="text-xs text-muted-foreground/70 italic">{'scale' in criterion ? criterion.scale : ''}</p>
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
