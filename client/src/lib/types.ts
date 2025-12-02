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
