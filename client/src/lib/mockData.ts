// todo: remove mock functionality - this file contains mock data for the prototype

export interface Contact {
  id: string;
  fullName: string;
  shortName?: string;
  phone?: string;
  email?: string;
  socialLinks: string[];
  tags: string[];
  roleTags: string[];
  contributionScore: number;
  potentialScore: number;
  contributionClass: string;
  potentialClass: string;
  valueCategory: string;
  importanceLevel: "A" | "B" | "C";
  attentionLevel: number;
  desiredFrequencyDays: number;
  lastContactDate: string;
  responseQuality: number;
  relationshipEnergy: number;
  attentionTrend: number;
  heatIndex: number;
  heatStatus: "green" | "yellow" | "red";
  contributionDetails: {
    financial: number;
    network: number;
    tactical: number;
    strategic: number;
    loyalty: number;
  };
  potentialDetails: {
    personal: number;
    resources: number;
    network: number;
    synergy: number;
    systemRole: number;
  };
}

export interface Interaction {
  id: string;
  contactId: string;
  date: string;
  type: string;
  channel: string;
  note: string;
  isMeaningful: boolean;
}

export const mockContacts: Contact[] = [
  {
    id: "1",
    fullName: "Александр Петров",
    shortName: "Саша",
    phone: "+7 999 123-45-67",
    email: "alex@example.com",
    socialLinks: ["t.me/alex_petrov"],
    tags: ["Tech", "AI"],
    roleTags: ["Партнёр", "Инвестор"],
    contributionScore: 14,
    potentialScore: 13,
    contributionClass: "A",
    potentialClass: "A",
    valueCategory: "AA",
    importanceLevel: "A",
    attentionLevel: 8,
    desiredFrequencyDays: 14,
    lastContactDate: "2024-11-25",
    responseQuality: 3,
    relationshipEnergy: 5,
    attentionTrend: 1,
    heatIndex: 0.85,
    heatStatus: "green",
    contributionDetails: { financial: 3, network: 3, tactical: 3, strategic: 3, loyalty: 2 },
    potentialDetails: { personal: 3, resources: 3, network: 2, synergy: 3, systemRole: 2 },
  },
  {
    id: "2",
    fullName: "Мария Иванова",
    shortName: "Маша",
    phone: "+7 999 234-56-78",
    email: "maria@example.com",
    socialLinks: ["t.me/maria_iv"],
    tags: ["Marketing", "PR"],
    roleTags: ["Эксперт", "Медиа"],
    contributionScore: 9,
    potentialScore: 11,
    contributionClass: "B",
    potentialClass: "B",
    valueCategory: "BB",
    importanceLevel: "A",
    attentionLevel: 6,
    desiredFrequencyDays: 21,
    lastContactDate: "2024-11-10",
    responseQuality: 2,
    relationshipEnergy: 4,
    attentionTrend: 0,
    heatIndex: 0.52,
    heatStatus: "yellow",
    contributionDetails: { financial: 1, network: 2, tactical: 2, strategic: 2, loyalty: 2 },
    potentialDetails: { personal: 2, resources: 2, network: 3, synergy: 2, systemRole: 2 },
  },
  {
    id: "3",
    fullName: "Дмитрий Козлов",
    shortName: "Дима",
    phone: "+7 999 345-67-89",
    email: "dmitry@example.com",
    socialLinks: [],
    tags: ["Finance"],
    roleTags: ["Инвестор"],
    contributionScore: 12,
    potentialScore: 8,
    contributionClass: "A",
    potentialClass: "B",
    valueCategory: "AB",
    importanceLevel: "A",
    attentionLevel: 5,
    desiredFrequencyDays: 30,
    lastContactDate: "2024-09-15",
    responseQuality: 1,
    relationshipEnergy: 3,
    attentionTrend: -1,
    heatIndex: 0.28,
    heatStatus: "red",
    contributionDetails: { financial: 3, network: 2, tactical: 2, strategic: 3, loyalty: 2 },
    potentialDetails: { personal: 2, resources: 2, network: 1, synergy: 2, systemRole: 1 },
  },
  {
    id: "4",
    fullName: "Елена Смирнова",
    shortName: "Лена",
    phone: "+7 999 456-78-90",
    email: "elena@example.com",
    socialLinks: ["t.me/elena_s"],
    tags: ["HR", "Coaching"],
    roleTags: ["Команда", "Эксперт"],
    contributionScore: 10,
    potentialScore: 12,
    contributionClass: "B",
    potentialClass: "A",
    valueCategory: "BA",
    importanceLevel: "B",
    attentionLevel: 7,
    desiredFrequencyDays: 14,
    lastContactDate: "2024-11-20",
    responseQuality: 3,
    relationshipEnergy: 4,
    attentionTrend: 1,
    heatIndex: 0.72,
    heatStatus: "green",
    contributionDetails: { financial: 1, network: 2, tactical: 3, strategic: 2, loyalty: 2 },
    potentialDetails: { personal: 3, resources: 2, network: 2, synergy: 3, systemRole: 2 },
  },
  {
    id: "5",
    fullName: "Игорь Волков",
    shortName: "Игорь",
    phone: "+7 999 567-89-01",
    email: "igor@example.com",
    socialLinks: [],
    tags: ["Legal"],
    roleTags: ["Эксперт"],
    contributionScore: 6,
    potentialScore: 7,
    contributionClass: "C",
    potentialClass: "C",
    valueCategory: "CC",
    importanceLevel: "C",
    attentionLevel: 3,
    desiredFrequencyDays: 60,
    lastContactDate: "2024-10-01",
    responseQuality: 2,
    relationshipEnergy: 2,
    attentionTrend: 0,
    heatIndex: 0.35,
    heatStatus: "red",
    contributionDetails: { financial: 0, network: 1, tactical: 2, strategic: 1, loyalty: 2 },
    potentialDetails: { personal: 1, resources: 1, network: 2, synergy: 1, systemRole: 2 },
  },
  {
    id: "6",
    fullName: "Анна Федорова",
    shortName: "Аня",
    phone: "+7 999 678-90-12",
    email: "anna@example.com",
    socialLinks: ["t.me/anna_f"],
    tags: ["Design", "UX"],
    roleTags: ["Друг", "Команда"],
    contributionScore: 8,
    potentialScore: 10,
    contributionClass: "B",
    potentialClass: "B",
    valueCategory: "BB",
    importanceLevel: "B",
    attentionLevel: 6,
    desiredFrequencyDays: 21,
    lastContactDate: "2024-11-28",
    responseQuality: 3,
    relationshipEnergy: 4,
    attentionTrend: 1,
    heatIndex: 0.78,
    heatStatus: "green",
    contributionDetails: { financial: 0, network: 2, tactical: 2, strategic: 2, loyalty: 2 },
    potentialDetails: { personal: 2, resources: 2, network: 2, synergy: 2, systemRole: 2 },
  },
];

export const mockInteractions: Interaction[] = [
  {
    id: "1",
    contactId: "1",
    date: "2024-11-25",
    type: "meeting",
    channel: "offline",
    note: "Обсудили новый проект, договорились о партнёрстве",
    isMeaningful: true,
  },
  {
    id: "2",
    contactId: "1",
    date: "2024-11-15",
    type: "call",
    channel: "phone",
    note: "Короткий созвон по текущим вопросам",
    isMeaningful: false,
  },
  {
    id: "3",
    contactId: "1",
    date: "2024-11-01",
    type: "message",
    channel: "telegram",
    note: "Поздравил с успешным запуском",
    isMeaningful: true,
  },
  {
    id: "4",
    contactId: "2",
    date: "2024-11-10",
    type: "meeting",
    channel: "offline",
    note: "Встреча за кофе, обсудили маркетинговую стратегию",
    isMeaningful: true,
  },
  {
    id: "5",
    contactId: "3",
    date: "2024-09-15",
    type: "call",
    channel: "phone",
    note: "Обсудили инвестиционные возможности",
    isMeaningful: true,
  },
];
