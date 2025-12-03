import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ATTENTION_LEVELS, ROLE_TAGS, CONTRIBUTION_CRITERIA, POTENTIAL_CRITERIA } from "@/lib/constants";
import { X, Plus, Loader2, Trash2 } from "lucide-react";
import type { Contact, InsertContact } from "@/lib/types";
import type { PhoneEntry, MessengerEntry, SocialAccountEntry, EmailEntry, FamilyMember, FamilyEvent, FamilyStatus, StaffMember, StaffPhone, StaffMessenger } from "@shared/schema";

interface ContactFormProps {
  initialData?: Contact;
  onSubmit: (data: InsertContact) => void;
  onCancel: () => void;
  isLoading?: boolean;
  allTags?: string[];
  allRoles?: string[];
  initialTab?: "basic" | "contacts" | "interests" | "family" | "team" | "priority" | "contribution" | "potential";
}

function computeFullName(firstName?: string, lastName?: string, patronymic?: string): string {
  const parts = [lastName, firstName, patronymic].filter(Boolean);
  return parts.join(" ") || "";
}

export function ContactForm({ initialData, onSubmit, onCancel, isLoading, allTags = [], allRoles = [], initialTab = "basic" }: ContactFormProps) {
  const [formData, setFormData] = useState<InsertContact>({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    patronymic: initialData?.patronymic || "",
    fullName: initialData?.fullName || "",
    shortName: initialData?.shortName || "",
    company: initialData?.company || "",
    companyRole: initialData?.companyRole || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    phones: (initialData?.phones as PhoneEntry[]) || [],
    emails: (initialData?.emails as EmailEntry[]) || [],
    messengers: (initialData?.messengers as MessengerEntry[]) || [],
    socialAccounts: (initialData?.socialAccounts as SocialAccountEntry[]) || [],
    socialLinks: initialData?.socialLinks || [],
    familyStatus: (initialData?.familyStatus as FamilyStatus) || { members: [], events: [] },
    staffMembers: (initialData?.staffMembers as StaffMember[]) || [],
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
    const computedFullName = computeFullName(formData.firstName || undefined, formData.lastName || undefined, formData.patronymic || undefined);
    onSubmit({
      ...formData,
      fullName: computedFullName || formData.shortName || "Без имени",
    });
  };

  const updateNameField = (field: 'firstName' | 'lastName' | 'patronymic', value: string) => {
    const newData = { ...formData, [field]: value };
    const computedFullName = computeFullName(
      field === 'firstName' ? value : newData.firstName || undefined,
      field === 'lastName' ? value : newData.lastName || undefined,
      field === 'patronymic' ? value : newData.patronymic || undefined
    );
    setFormData({ ...newData, fullName: computedFullName || newData.shortName || "" });
  };

  const addPhone = () => {
    const phones = formData.phones || [];
    setFormData({
      ...formData,
      phones: [...phones, { type: "mobile", number: "" }],
    });
  };

  const updatePhone = (index: number, field: keyof PhoneEntry, value: string) => {
    const phones = [...(formData.phones || [])];
    phones[index] = { ...phones[index], [field]: value };
    setFormData({ ...formData, phones });
  };

  const removePhone = (index: number) => {
    setFormData({
      ...formData,
      phones: formData.phones?.filter((_, i) => i !== index) || [],
    });
  };

  const addEmail = () => {
    const emails = formData.emails || [];
    setFormData({
      ...formData,
      emails: [...emails, { type: "personal", email: "" }],
    });
  };

  const updateEmail = (index: number, field: keyof EmailEntry, value: string) => {
    const emails = [...(formData.emails || [])];
    emails[index] = { ...emails[index], [field]: value };
    setFormData({ ...formData, emails });
  };

  const removeEmail = (index: number) => {
    setFormData({
      ...formData,
      emails: formData.emails?.filter((_, i) => i !== index) || [],
    });
  };

  const addMessenger = () => {
    const messengers = formData.messengers || [];
    setFormData({
      ...formData,
      messengers: [...messengers, { platform: "telegram", username: "" }],
    });
  };

  const updateMessenger = (index: number, field: keyof MessengerEntry, value: string) => {
    const messengers = [...(formData.messengers || [])];
    messengers[index] = { ...messengers[index], [field]: value };
    setFormData({ ...formData, messengers });
  };

  const removeMessenger = (index: number) => {
    setFormData({
      ...formData,
      messengers: formData.messengers?.filter((_, i) => i !== index) || [],
    });
  };

  const addSocialAccount = () => {
    const socialAccounts = formData.socialAccounts || [];
    setFormData({
      ...formData,
      socialAccounts: [...socialAccounts, { platform: "instagram", url: "" }],
    });
  };

  const updateSocialAccount = (index: number, field: keyof SocialAccountEntry, value: string) => {
    const socialAccounts = [...(formData.socialAccounts || [])];
    socialAccounts[index] = { ...socialAccounts[index], [field]: value };
    setFormData({ ...formData, socialAccounts });
  };

  const removeSocialAccount = (index: number) => {
    setFormData({
      ...formData,
      socialAccounts: formData.socialAccounts?.filter((_, i) => i !== index) || [],
    });
  };

  const addFamilyMember = () => {
    const familyStatus = formData.familyStatus || { members: [], events: [] };
    setFormData({
      ...formData,
      familyStatus: {
        ...familyStatus,
        members: [...familyStatus.members, { name: "", relation: "spouse" }],
      },
    });
  };

  const updateFamilyMember = (index: number, field: keyof FamilyMember, value: string) => {
    const familyStatus = formData.familyStatus || { members: [], events: [] };
    const members = [...familyStatus.members];
    members[index] = { ...members[index], [field]: value };
    setFormData({
      ...formData,
      familyStatus: { ...familyStatus, members },
    });
  };

  const removeFamilyMember = (index: number) => {
    const familyStatus = formData.familyStatus || { members: [], events: [] };
    setFormData({
      ...formData,
      familyStatus: {
        ...familyStatus,
        members: familyStatus.members.filter((_, i) => i !== index),
      },
    });
  };

  const addFamilyEvent = () => {
    const familyStatus = formData.familyStatus || { members: [], events: [] };
    setFormData({
      ...formData,
      familyStatus: {
        ...familyStatus,
        events: [...familyStatus.events, { title: "", date: "" }],
      },
    });
  };

  const updateFamilyEvent = (index: number, field: keyof FamilyEvent, value: string) => {
    const familyStatus = formData.familyStatus || { members: [], events: [] };
    const events = [...familyStatus.events];
    events[index] = { ...events[index], [field]: value };
    setFormData({
      ...formData,
      familyStatus: { ...familyStatus, events },
    });
  };

  const removeFamilyEvent = (index: number) => {
    const familyStatus = formData.familyStatus || { members: [], events: [] };
    setFormData({
      ...formData,
      familyStatus: {
        ...familyStatus,
        events: familyStatus.events.filter((_, i) => i !== index),
      },
    });
  };

  // Staff member management
  const addStaffMember = () => {
    const staffMembers = formData.staffMembers || [];
    setFormData({
      ...formData,
      staffMembers: [...staffMembers, { name: "", role: "assistant", phones: [], messengers: [] }],
    });
  };

  const updateStaffMember = (index: number, field: keyof StaffMember, value: unknown) => {
    const staffMembers = [...(formData.staffMembers || [])];
    staffMembers[index] = { ...staffMembers[index], [field]: value };
    setFormData({ ...formData, staffMembers });
  };

  const removeStaffMember = (index: number) => {
    setFormData({
      ...formData,
      staffMembers: formData.staffMembers?.filter((_, i) => i !== index) || [],
    });
  };

  const addStaffPhone = (staffIndex: number) => {
    const staffMembers = [...(formData.staffMembers || [])];
    const member = staffMembers[staffIndex];
    staffMembers[staffIndex] = {
      ...member,
      phones: [...member.phones, { type: "mobile", number: "" }],
    };
    setFormData({ ...formData, staffMembers });
  };

  const updateStaffPhone = (staffIndex: number, phoneIndex: number, field: keyof StaffPhone, value: string) => {
    const staffMembers = [...(formData.staffMembers || [])];
    const phones = [...staffMembers[staffIndex].phones];
    phones[phoneIndex] = { ...phones[phoneIndex], [field]: value };
    staffMembers[staffIndex] = { ...staffMembers[staffIndex], phones };
    setFormData({ ...formData, staffMembers });
  };

  const removeStaffPhone = (staffIndex: number, phoneIndex: number) => {
    const staffMembers = [...(formData.staffMembers || [])];
    staffMembers[staffIndex] = {
      ...staffMembers[staffIndex],
      phones: staffMembers[staffIndex].phones.filter((_, i) => i !== phoneIndex),
    };
    setFormData({ ...formData, staffMembers });
  };

  const addStaffMessenger = (staffIndex: number) => {
    const staffMembers = [...(formData.staffMembers || [])];
    const member = staffMembers[staffIndex];
    staffMembers[staffIndex] = {
      ...member,
      messengers: [...member.messengers, { platform: "telegram", username: "" }],
    };
    setFormData({ ...formData, staffMembers });
  };

  const updateStaffMessenger = (staffIndex: number, msgIndex: number, field: keyof StaffMessenger, value: string) => {
    const staffMembers = [...(formData.staffMembers || [])];
    const messengers = [...staffMembers[staffIndex].messengers];
    messengers[msgIndex] = { ...messengers[msgIndex], [field]: value };
    staffMembers[staffIndex] = { ...staffMembers[staffIndex], messengers };
    setFormData({ ...formData, staffMembers });
  };

  const removeStaffMessenger = (staffIndex: number, msgIndex: number) => {
    const staffMembers = [...(formData.staffMembers || [])];
    staffMembers[staffIndex] = {
      ...staffMembers[staffIndex],
      messengers: staffMembers[staffIndex].messengers.filter((_, i) => i !== msgIndex),
    };
    setFormData({ ...formData, staffMembers });
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

  const phoneTypes = [
    { value: "mobile", label: "Мобильный" },
    { value: "work", label: "Рабочий" },
    { value: "home", label: "Домашний" },
    { value: "other", label: "Другой" },
  ];

  const messengerPlatforms = [
    { value: "telegram", label: "Telegram" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "viber", label: "Viber" },
    { value: "signal", label: "Signal" },
    { value: "wechat", label: "WeChat" },
    { value: "other", label: "Другой" },
  ];

  const socialPlatforms = [
    { value: "instagram", label: "Instagram" },
    { value: "facebook", label: "Facebook" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "twitter", label: "Twitter/X" },
    { value: "vk", label: "ВКонтакте" },
    { value: "youtube", label: "YouTube" },
    { value: "tiktok", label: "TikTok" },
    { value: "other", label: "Другой" },
  ];

  const maritalStatuses = [
    { value: "single", label: "Не женат/не замужем" },
    { value: "married", label: "В браке" },
    { value: "divorced", label: "В разводе" },
    { value: "widowed", label: "Вдова/вдовец" },
    { value: "partnership", label: "Гражданский брак" },
  ];

  const familyRelations = [
    { value: "spouse", label: "Супруг(а)" },
    { value: "child", label: "Ребёнок" },
    { value: "parent", label: "Родитель" },
    { value: "sibling", label: "Брат/сестра" },
    { value: "other", label: "Другой" },
  ];

  const isNameValid = Boolean(formData.firstName || formData.lastName || formData.shortName);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 w-full">
          <TabsTrigger value="basic" className="text-xs sm:text-sm px-2 sm:px-3">ФИО</TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs sm:text-sm px-2 sm:px-3">Контакты</TabsTrigger>
          <TabsTrigger value="interests" className="text-xs sm:text-sm px-2 sm:px-3">Интересы</TabsTrigger>
          <TabsTrigger value="family" className="text-xs sm:text-sm px-2 sm:px-3">Семья</TabsTrigger>
          <TabsTrigger value="team" className="text-xs sm:text-sm px-2 sm:px-3">Команда</TabsTrigger>
          <TabsTrigger value="priority" className="text-xs sm:text-sm px-2 sm:px-3">Статус</TabsTrigger>
          <TabsTrigger value="contribution" className="text-xs sm:text-sm px-2 sm:px-3">Вклад</TabsTrigger>
          <TabsTrigger value="potential" className="text-xs sm:text-sm px-2 sm:px-3">Потенциал</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input
                id="lastName"
                value={formData.lastName || ""}
                onChange={(e) => updateNameField('lastName', e.target.value)}
                placeholder="Иванов"
                data-testid="input-lastName"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">Имя *</Label>
              <Input
                id="firstName"
                value={formData.firstName || ""}
                onChange={(e) => updateNameField('firstName', e.target.value)}
                placeholder="Иван"
                data-testid="input-firstName"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patronymic">Отчество</Label>
              <Input
                id="patronymic"
                value={formData.patronymic || ""}
                onChange={(e) => updateNameField('patronymic', e.target.value)}
                placeholder="Иванович"
                data-testid="input-patronymic"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Компания</Label>
              <Input
                id="company"
                value={formData.company || ""}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="ООО Рога и Копыта"
                data-testid="input-company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyRole">Должность</Label>
              <Input
                id="companyRole"
                value={formData.companyRole || ""}
                onChange={(e) => setFormData({ ...formData, companyRole: e.target.value })}
                placeholder="Генеральный директор"
                data-testid="input-companyRole"
              />
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
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-xs text-muted-foreground mr-1">Существующие:</span>
                {allTags.filter(tag => !formData.tags?.includes(tag)).slice(0, 12).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer text-xs hover-elevate"
                    onClick={() => addTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Email адреса</Label>
              <Button type="button" variant="outline" size="sm" onClick={addEmail} data-testid="button-add-email">
                <Plus className="h-4 w-4 mr-1" /> Добавить
              </Button>
            </div>
            {(formData.emails || []).map((emailEntry, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Select
                  value={emailEntry.type}
                  onValueChange={(v) => updateEmail(index, 'type', v)}
                >
                  <SelectTrigger className="w-[140px]" data-testid={`select-email-type-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Личный</SelectItem>
                    <SelectItem value="work">Рабочий</SelectItem>
                    <SelectItem value="other">Другой</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="email"
                  value={emailEntry.email}
                  onChange={(e) => updateEmail(index, 'email', e.target.value)}
                  placeholder="email@example.com"
                  className="flex-1"
                  data-testid={`input-email-address-${index}`}
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeEmail(index)}
                  data-testid={`button-remove-email-${index}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {(formData.emails || []).length === 0 && (
              <p className="text-sm text-muted-foreground">Нет добавленных email адресов</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Телефоны</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPhone} data-testid="button-add-phone">
                <Plus className="h-4 w-4 mr-1" /> Добавить
              </Button>
            </div>
            {(formData.phones || []).map((phone, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Select
                  value={phone.type}
                  onValueChange={(v) => updatePhone(index, 'type', v)}
                >
                  <SelectTrigger className="w-[140px]" data-testid={`select-phone-type-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {phoneTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={phone.number}
                  onChange={(e) => updatePhone(index, 'number', e.target.value)}
                  placeholder="+7 999 123-45-67"
                  className="flex-1"
                  data-testid={`input-phone-number-${index}`}
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removePhone(index)}
                  data-testid={`button-remove-phone-${index}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {(formData.phones || []).length === 0 && (
              <p className="text-sm text-muted-foreground">Нет добавленных телефонов</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Мессенджеры</Label>
              <Button type="button" variant="outline" size="sm" onClick={addMessenger} data-testid="button-add-messenger">
                <Plus className="h-4 w-4 mr-1" /> Добавить
              </Button>
            </div>
            {(formData.messengers || []).map((messenger, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Select
                  value={messenger.platform}
                  onValueChange={(v) => updateMessenger(index, 'platform', v)}
                >
                  <SelectTrigger className="w-[140px]" data-testid={`select-messenger-platform-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {messengerPlatforms.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={messenger.username}
                  onChange={(e) => updateMessenger(index, 'username', e.target.value)}
                  placeholder="@username или номер"
                  className="flex-1"
                  data-testid={`input-messenger-username-${index}`}
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeMessenger(index)}
                  data-testid={`button-remove-messenger-${index}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {(formData.messengers || []).length === 0 && (
              <p className="text-sm text-muted-foreground">Нет добавленных мессенджеров</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Социальные сети</Label>
              <Button type="button" variant="outline" size="sm" onClick={addSocialAccount} data-testid="button-add-social">
                <Plus className="h-4 w-4 mr-1" /> Добавить
              </Button>
            </div>
            {(formData.socialAccounts || []).map((account, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Select
                  value={account.platform}
                  onValueChange={(v) => updateSocialAccount(index, 'platform', v)}
                >
                  <SelectTrigger className="w-[140px]" data-testid={`select-social-platform-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {socialPlatforms.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={account.url}
                  onChange={(e) => updateSocialAccount(index, 'url', e.target.value)}
                  placeholder="https://instagram.com/username"
                  className="flex-1"
                  data-testid={`input-social-url-${index}`}
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeSocialAccount(index)}
                  data-testid={`button-remove-social-${index}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {(formData.socialAccounts || []).length === 0 && (
              <p className="text-sm text-muted-foreground">Нет добавленных аккаунтов</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="interests" className="space-y-4 mt-4 min-h-[300px]">
          <div className="space-y-2">
            <Label>Хобби и увлечения</Label>
            <Textarea
              value={formData.hobbies || ""}
              onChange={(e) => setFormData({ ...formData, hobbies: e.target.value })}
              placeholder="Спорт, музыка, путешествия..."
              className="resize-none"
              rows={3}
              data-testid="textarea-hobbies"
            />
          </div>

          <div className="space-y-2">
            <Label>Любимая еда и напитки</Label>
            <Textarea
              value={formData.preferences || ""}
              onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
              placeholder="Предпочтения в еде, любимые рестораны, напитки..."
              className="resize-none"
              rows={3}
              data-testid="textarea-preferences"
            />
          </div>

          <div className="space-y-2">
            <Label>Важные даты и события</Label>
            <Textarea
              value={formData.importantDates || ""}
              onChange={(e) => setFormData({ ...formData, importantDates: e.target.value })}
              placeholder="Даты рождения, годовщины, важные мероприятия..."
              className="resize-none"
              rows={3}
              data-testid="textarea-important-dates"
            />
          </div>

          <div className="space-y-2">
            <Label>Подарки и предпочтения</Label>
            <Textarea
              value={formData.giftPreferences || ""}
              onChange={(e) => setFormData({ ...formData, giftPreferences: e.target.value })}
              placeholder="Что любит получать в подарок, что не любит..."
              className="resize-none"
              rows={3}
              data-testid="textarea-gift-preferences"
            />
          </div>

          <div className="space-y-2">
            <Label>Другие заметки</Label>
            <Textarea
              value={formData.otherInterests || ""}
              onChange={(e) => setFormData({ ...formData, otherInterests: e.target.value })}
              placeholder="Любая другая полезная информация..."
              className="resize-none"
              rows={3}
              data-testid="textarea-other-interests"
            />
          </div>
        </TabsContent>

        <TabsContent value="family" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Семейное положение</Label>
            <Select
              value={formData.familyStatus?.maritalStatus || ""}
              onValueChange={(v) => setFormData({
                ...formData,
                familyStatus: {
                  ...formData.familyStatus!,
                  maritalStatus: v as FamilyStatus['maritalStatus'],
                },
              })}
            >
              <SelectTrigger data-testid="select-marital-status">
                <SelectValue placeholder="Не указано" />
              </SelectTrigger>
              <SelectContent>
                {maritalStatuses.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Члены семьи</Label>
              <Button type="button" variant="outline" size="sm" onClick={addFamilyMember} data-testid="button-add-family-member">
                <Plus className="h-4 w-4 mr-1" /> Добавить
              </Button>
            </div>
            {(formData.familyStatus?.members || []).map((member, index) => (
              <div key={index} className="p-3 border rounded-md space-y-2 bg-muted/30">
                <div className="flex gap-2 items-center">
                  <Select
                    value={member.relation}
                    onValueChange={(v) => updateFamilyMember(index, 'relation', v)}
                  >
                    <SelectTrigger className="w-[140px]" data-testid={`select-family-relation-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {familyRelations.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={member.name}
                    onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                    placeholder="Имя"
                    className="flex-1"
                    data-testid={`input-family-name-${index}`}
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeFamilyMember(index)}
                    data-testid={`button-remove-family-${index}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">День рождения</span>
                    <div className="flex gap-1 items-center">
                      <Input
                        type="date"
                        value={member.birthday || ""}
                        onChange={(e) => updateFamilyMember(index, 'birthday', e.target.value)}
                        className="w-[150px]"
                        data-testid={`input-family-birthday-${index}`}
                      />
                      {member.birthday && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => updateFamilyMember(index, 'birthday', '')}
                          data-testid={`button-clear-birthday-${index}`}
                          title="Сбросить дату"
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Textarea
                    value={member.notes || ""}
                    onChange={(e) => updateFamilyMember(index, 'notes', e.target.value)}
                    placeholder="Заметки"
                    className="min-h-[38px] resize-none overflow-hidden"
                    rows={1}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                    data-testid={`input-family-notes-${index}`}
                  />
                </div>
              </div>
            ))}
            {(formData.familyStatus?.members || []).length === 0 && (
              <p className="text-sm text-muted-foreground">Нет добавленных членов семьи</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Семейные события (даты)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addFamilyEvent} data-testid="button-add-family-event">
                <Plus className="h-4 w-4 mr-1" /> Добавить
              </Button>
            </div>
            {(formData.familyStatus?.events || []).map((event, index) => (
              <div key={index} className="p-3 border rounded-md space-y-2 bg-muted/30">
                <div className="flex gap-2 items-center">
                  <Input
                    value={event.title}
                    onChange={(e) => updateFamilyEvent(index, 'title', e.target.value)}
                    placeholder="Название (годовщина, др и т.д.)"
                    className="flex-1"
                    data-testid={`input-event-title-${index}`}
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeFamilyEvent(index)}
                    data-testid={`button-remove-event-${index}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <Input
                  type="date"
                  value={event.date}
                  onChange={(e) => updateFamilyEvent(index, 'date', e.target.value)}
                  data-testid={`input-event-date-${index}`}
                />
              </div>
            ))}
            {(formData.familyStatus?.events || []).length === 0 && (
              <p className="text-sm text-muted-foreground">Нет добавленных событий</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4 mt-4 min-h-[300px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Члены команды (ассистенты, водители и др.)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addStaffMember} data-testid="button-add-staff">
                <Plus className="h-4 w-4 mr-1" /> Добавить
              </Button>
            </div>
            {(formData.staffMembers || []).map((staff, staffIndex) => (
              <div key={staffIndex} className="p-3 border rounded-md space-y-3 bg-muted/30">
                <div className="flex gap-2 items-center">
                  <Select
                    value={staff.role}
                    onValueChange={(v) => updateStaffMember(staffIndex, 'role', v)}
                  >
                    <SelectTrigger className="w-[140px]" data-testid={`select-staff-role-${staffIndex}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assistant">Ассистент</SelectItem>
                      <SelectItem value="driver">Водитель</SelectItem>
                      <SelectItem value="secretary">Секретарь</SelectItem>
                      <SelectItem value="manager">Менеджер</SelectItem>
                      <SelectItem value="security">Охрана</SelectItem>
                      <SelectItem value="other">Другой</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={staff.name}
                    onChange={(e) => updateStaffMember(staffIndex, 'name', e.target.value)}
                    placeholder="ФИО"
                    className="flex-1"
                    data-testid={`input-staff-name-${staffIndex}`}
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeStaffMember(staffIndex)}
                    data-testid={`button-remove-staff-${staffIndex}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                {staff.role === "other" && (
                  <Input
                    value={staff.roleCustom || ""}
                    onChange={(e) => updateStaffMember(staffIndex, 'roleCustom', e.target.value)}
                    placeholder="Укажите роль"
                    data-testid={`input-staff-role-custom-${staffIndex}`}
                  />
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Телефоны</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => addStaffPhone(staffIndex)}
                      data-testid={`button-add-staff-phone-${staffIndex}`}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Телефон
                    </Button>
                  </div>
                  {staff.phones.map((phone, phoneIndex) => (
                    <div key={phoneIndex} className="flex gap-2 items-center">
                      <Select
                        value={phone.type}
                        onValueChange={(v) => updateStaffPhone(staffIndex, phoneIndex, 'type', v)}
                      >
                        <SelectTrigger className="w-[100px]" data-testid={`select-staff-phone-type-${staffIndex}-${phoneIndex}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mobile">Мобильный</SelectItem>
                          <SelectItem value="work">Рабочий</SelectItem>
                          <SelectItem value="other">Другой</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={phone.number}
                        onChange={(e) => updateStaffPhone(staffIndex, phoneIndex, 'number', e.target.value)}
                        placeholder="+7 XXX XXX-XX-XX"
                        className="flex-1"
                        data-testid={`input-staff-phone-${staffIndex}-${phoneIndex}`}
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeStaffPhone(staffIndex, phoneIndex)}
                        data-testid={`button-remove-staff-phone-${staffIndex}-${phoneIndex}`}
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Мессенджеры</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => addStaffMessenger(staffIndex)}
                      data-testid={`button-add-staff-messenger-${staffIndex}`}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Мессенджер
                    </Button>
                  </div>
                  {staff.messengers.map((msg, msgIndex) => (
                    <div key={msgIndex} className="flex gap-2 items-center">
                      <Select
                        value={msg.platform}
                        onValueChange={(v) => updateStaffMessenger(staffIndex, msgIndex, 'platform', v)}
                      >
                        <SelectTrigger className="w-[120px]" data-testid={`select-staff-msg-platform-${staffIndex}-${msgIndex}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="telegram">Telegram</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="viber">Viber</SelectItem>
                          <SelectItem value="other">Другой</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={msg.username}
                        onChange={(e) => updateStaffMessenger(staffIndex, msgIndex, 'username', e.target.value)}
                        placeholder="@username или номер"
                        className="flex-1"
                        data-testid={`input-staff-messenger-${staffIndex}-${msgIndex}`}
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeStaffMessenger(staffIndex, msgIndex)}
                        data-testid={`button-remove-staff-msg-${staffIndex}-${msgIndex}`}
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Textarea
                  value={staff.notes || ""}
                  onChange={(e) => updateStaffMember(staffIndex, 'notes', e.target.value)}
                  placeholder="Заметки"
                  className="min-h-[38px] resize-none overflow-hidden"
                  rows={1}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                  data-testid={`textarea-staff-notes-${staffIndex}`}
                />
              </div>
            ))}
            {(formData.staffMembers || []).length === 0 && (
              <p className="text-sm text-muted-foreground">Нет добавленных членов команды</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="priority" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Важность контакта</Label>
              <div className="flex items-center gap-2">
                <Badge variant={
                  formData.importanceLevel === "A" ? "default" :
                  formData.importanceLevel === "B" ? "secondary" : "outline"
                } className="text-sm" data-testid="badge-importance">
                  {formData.importanceLevel === "A" ? "A - Высокая" :
                   formData.importanceLevel === "B" ? "B - Средняя" : "C - Низкая"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  (авто-расчёт из вклада и потенциала)
                </span>
              </div>
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
            <Label>Статус отношений: {formData.attentionLevel}</Label>
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
            <Label>Тренд отношений</Label>
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
        <Button type="submit" disabled={isLoading || !isNameValid} data-testid="button-submit">
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {initialData ? "Сохранить" : "Создать"}
        </Button>
      </div>
    </form>
  );
}
