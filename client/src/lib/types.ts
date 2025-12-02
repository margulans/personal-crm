import type { 
  PhoneEntry, 
  MessengerEntry, 
  SocialAccountEntry, 
  FamilyStatus,
  StaffMember 
} from "@shared/schema";

export interface Contact {
  id: string;
  teamId?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  
  firstName?: string | null;
  lastName?: string | null;
  patronymic?: string | null;
  fullName: string;
  shortName: string | null;
  
  company?: string | null;
  companyRole?: string | null;
  
  phone: string | null;
  email: string | null;
  phones: PhoneEntry[];
  messengers: MessengerEntry[];
  socialAccounts: SocialAccountEntry[];
  socialLinks: string[];
  
  familyStatus: FamilyStatus;
  staffMembers: StaffMember[];
  
  hobbies?: string | null;
  preferences?: string | null;
  importantDates?: string | null;
  giftPreferences?: string | null;
  otherInterests?: string | null;
  
  tags: string[];
  roleTags: string[];
  
  contributionScore: number;
  potentialScore: number;
  contributionClass: string;
  potentialClass: string;
  valueCategory: string;
  contributionDetails: {
    financial: number;
    network: number;
    trust: number;
  };
  potentialDetails: {
    personal: number;
    resources: number;
    network: number;
    synergy: number;
    systemRole: number;
  };
  importanceLevel: "A" | "B" | "C";
  recommendedAttentionLevel: number;
  attentionLevel: number;
  desiredFrequencyDays: number;
  lastContactDate: string | null;
  responseQuality: number;
  relationshipEnergy: number;
  attentionTrend: number;
  heatIndex: number;
  heatStatus: "green" | "yellow" | "red";
  createdAt: string;
  updatedAt: string;
}

export interface Interaction {
  id: string;
  contactId: string;
  createdBy?: string | null;
  date: string;
  type: string;
  channel: string;
  note: string | null;
  isMeaningful: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InsertContact {
  teamId?: string;
  createdBy?: string;
  updatedBy?: string;
  
  firstName?: string | null;
  lastName?: string | null;
  patronymic?: string | null;
  fullName: string;
  shortName?: string | null;
  
  company?: string | null;
  companyRole?: string | null;
  
  phone?: string | null;
  email?: string | null;
  phones?: PhoneEntry[];
  messengers?: MessengerEntry[];
  socialAccounts?: SocialAccountEntry[];
  socialLinks?: string[];
  
  familyStatus?: FamilyStatus;
  staffMembers?: StaffMember[];
  
  hobbies?: string | null;
  preferences?: string | null;
  importantDates?: string | null;
  giftPreferences?: string | null;
  otherInterests?: string | null;
  
  tags?: string[];
  roleTags?: string[];
  
  contributionDetails?: {
    financial: number;
    network: number;
    trust: number;
  };
  potentialDetails?: {
    personal: number;
    resources: number;
    network: number;
    synergy: number;
    systemRole: number;
  };
  importanceLevel?: "A" | "B" | "C";
  attentionLevel?: number;
  desiredFrequencyDays?: number;
  lastContactDate?: string | null;
  responseQuality?: number;
  relationshipEnergy?: number;
  attentionTrend?: number;
}

export interface InsertInteraction {
  contactId?: string;
  createdBy?: string;
  date: string;
  type: string;
  channel: string;
  note?: string;
  isMeaningful: boolean;
}

export type { PhoneEntry, MessengerEntry, SocialAccountEntry, FamilyStatus, FamilyMember, FamilyEvent, StaffMember, StaffPhone, StaffMessenger } from "@shared/schema";

// AI Types
export interface AIInsight {
  summary: string;
  keyPoints: string[];
  relationshipStrength: string;
  riskFactors: string[];
  opportunities: string[];
  cached?: boolean;
  cachedAt?: string;
  model?: string;
}

export interface AIRecommendation {
  nextActions: Array<{
    action: string;
    priority: "high" | "medium" | "low";
    reason: string;
    suggestedDate?: string;
  }>;
  conversationStarters: string[];
  giftIdeas?: string[];
  warningSignals?: string[];
  cached?: boolean;
  model?: string;
}

export interface AIDashboard {
  greeting: string;
  topPriorities: Array<{
    contactName: string;
    action: string;
    reason: string;
    urgency: "critical" | "high" | "medium";
  }>;
  dailyTip: string;
  networkHealth: {
    status: string;
    score: number;
    trend: string;
  };
  cached?: boolean;
  model?: string;
}

export interface AIAnalytics {
  summary: string;
  keyTrends: Array<{
    observation: string;
    implication: string;
    direction: "positive" | "negative" | "neutral";
  }>;
  strengths: string[];
  weaknesses: string[];
  strategicRecommendations: Array<{
    recommendation: string;
    priority: "high" | "medium" | "low";
    timeframe: string;
    expectedOutcome: string;
  }>;
  focusAreas: string[];
  cached?: boolean;
  model?: string;
}

export type { Attachment } from "@shared/schema";
