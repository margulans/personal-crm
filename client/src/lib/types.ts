export interface Contact {
  id: string;
  fullName: string;
  shortName: string | null;
  phone: string | null;
  email: string | null;
  socialLinks: string[];
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
  date: string;
  type: string;
  channel: string;
  note: string | null;
  isMeaningful: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InsertContact {
  fullName: string;
  shortName?: string | null;
  phone?: string | null;
  email?: string | null;
  socialLinks?: string[];
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
  date: string;
  type: string;
  channel: string;
  note?: string;
  isMeaningful: boolean;
}
