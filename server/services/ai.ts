import OpenAI from "openai";

// the newest OpenAI model is "gpt-5.1" which is the most powerful model available. do not change this unless explicitly requested by the user
const AI_MODEL = "gpt-5.1";

// Initialize OpenAI client with Replit AI Integrations
// This uses Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export interface ContactContext {
  fullName: string;
  company?: string | null;
  companyRole?: string | null;
  tags?: string[];
  roleTags?: string[];
  valueCategory?: string;
  importanceLevel?: string;
  attentionLevel?: number;
  heatStatus?: string;
  heatIndex?: number;
  lastContactDate?: string | null;
  desiredFrequencyDays?: number;
  hobbies?: string | null;
  preferences?: string | null;
  giftPreferences?: string | null;
  familyNotes?: string | null;
  interactionHistory?: Array<{
    date: string;
    type: string;
    channel: string;
    note?: string | null;
    isMeaningful: boolean;
  }>;
}

export interface AIInsight {
  summary: string;
  keyPoints: string[];
  relationshipStrength: string;
  riskFactors: string[];
  opportunities: string[];
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
}

// Generate insights about a contact based on their data and interaction history
export async function generateContactInsights(contact: ContactContext): Promise<AIInsight> {
  const prompt = buildInsightPrompt(contact);
  
  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: `Ты - эксперт по управлению отношениями и CRM-аналитик. Твоя задача - анализировать информацию о контактах и предоставлять ценные инсайты для поддержания и развития деловых и личных отношений. Отвечай на русском языке. Будь конкретным и практичным.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    return {
      summary: parsed.summary || "Анализ недоступен",
      keyPoints: parsed.keyPoints || [],
      relationshipStrength: parsed.relationshipStrength || "Не определено",
      riskFactors: parsed.riskFactors || [],
      opportunities: parsed.opportunities || []
    };
  } catch (error) {
    console.error("Error generating AI insights:", error);
    throw new Error("Не удалось сгенерировать инсайты");
  }
}

// Generate recommendations for next actions with a contact
export async function generateContactRecommendations(contact: ContactContext): Promise<AIRecommendation> {
  const prompt = buildRecommendationPrompt(contact);
  
  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: `Ты - персональный ассистент по управлению отношениями. Твоя задача - давать конкретные, действенные рекомендации по поддержанию и развитию отношений с контактами. Учитывай контекст, историю общения и личные предпочтения. Отвечай на русском языке.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    return {
      nextActions: parsed.nextActions || [],
      conversationStarters: parsed.conversationStarters || [],
      giftIdeas: parsed.giftIdeas,
      warningSignals: parsed.warningSignals
    };
  } catch (error) {
    console.error("Error generating AI recommendations:", error);
    throw new Error("Не удалось сгенерировать рекомендации");
  }
}

// Summarize interaction history for a contact
export async function summarizeInteractions(contact: ContactContext): Promise<string> {
  if (!contact.interactionHistory || contact.interactionHistory.length === 0) {
    return "История взаимодействий пуста";
  }

  const interactionsText = contact.interactionHistory
    .slice(0, 20) // Limit to last 20 interactions
    .map(i => `${i.date} - ${i.type} (${i.channel})${i.isMeaningful ? " [важное]" : ""}: ${i.note || "без заметки"}`)
    .join("\n");

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: `Ты - аналитик CRM. Создай краткое, информативное резюме истории взаимодействий с контактом. Выдели ключевые темы, паттерны общения и важные события. Отвечай на русском языке.`
        },
        {
          role: "user",
          content: `Создай резюме истории взаимодействий с ${contact.fullName}:\n\n${interactionsText}`
        }
      ],
      max_completion_tokens: 1024,
    });

    return response.choices[0]?.message?.content || "Не удалось создать резюме";
  } catch (error) {
    console.error("Error summarizing interactions:", error);
    throw new Error("Не удалось создать резюме взаимодействий");
  }
}

function buildInsightPrompt(contact: ContactContext): string {
  const parts: string[] = [];
  
  parts.push(`Проанализируй контакт и предоставь инсайты в формате JSON.`);
  parts.push(`\nИмя: ${contact.fullName}`);
  
  if (contact.company) {
    parts.push(`Компания: ${contact.company}${contact.companyRole ? ` (${contact.companyRole})` : ""}`);
  }
  
  if (contact.tags && contact.tags.length > 0) {
    parts.push(`Теги: ${contact.tags.join(", ")}`);
  }
  
  if (contact.roleTags && contact.roleTags.length > 0) {
    parts.push(`Роли: ${contact.roleTags.join(", ")}`);
  }
  
  parts.push(`\nМетрики отношений:`);
  parts.push(`- Категория ценности: ${contact.valueCategory || "Не определена"}`);
  parts.push(`- Уровень важности: ${contact.importanceLevel || "Не определен"}`);
  parts.push(`- Уровень внимания: ${contact.attentionLevel || 1} из 10`);
  parts.push(`- Статус "тепла": ${contact.heatStatus || "Не определен"} (индекс: ${contact.heatIndex?.toFixed(2) || "N/A"})`);
  parts.push(`- Последний контакт: ${contact.lastContactDate || "Никогда"}`);
  parts.push(`- Желаемая частота: каждые ${contact.desiredFrequencyDays || 30} дней`);
  
  if (contact.hobbies) {
    parts.push(`\nХобби/увлечения: ${contact.hobbies}`);
  }
  
  if (contact.preferences) {
    parts.push(`Предпочтения: ${contact.preferences}`);
  }
  
  if (contact.familyNotes) {
    parts.push(`Семья: ${contact.familyNotes}`);
  }
  
  if (contact.interactionHistory && contact.interactionHistory.length > 0) {
    parts.push(`\nПоследние взаимодействия (${contact.interactionHistory.length}):`);
    contact.interactionHistory.slice(0, 5).forEach(i => {
      parts.push(`- ${i.date}: ${i.type} через ${i.channel}${i.isMeaningful ? " [важное]" : ""}${i.note ? ` - "${i.note}"` : ""}`);
    });
  }
  
  parts.push(`\nВерни JSON с полями:`);
  parts.push(`- summary: краткое описание состояния отношений (2-3 предложения)`);
  parts.push(`- keyPoints: массив из 3-5 ключевых фактов об этом контакте`);
  parts.push(`- relationshipStrength: оценка крепости отношений (Крепкие/Умеренные/Слабые/Под угрозой)`);
  parts.push(`- riskFactors: массив рисков для отношений`);
  parts.push(`- opportunities: массив возможностей для укрепления отношений`);
  
  return parts.join("\n");
}

function buildRecommendationPrompt(contact: ContactContext): string {
  const parts: string[] = [];
  
  parts.push(`Дай рекомендации по взаимодействию с контактом в формате JSON.`);
  parts.push(`\nИмя: ${contact.fullName}`);
  
  if (contact.company) {
    parts.push(`Компания: ${contact.company}${contact.companyRole ? ` (${contact.companyRole})` : ""}`);
  }
  
  parts.push(`\nТекущий статус:`);
  parts.push(`- Статус "тепла": ${contact.heatStatus || "Не определен"}`);
  parts.push(`- Последний контакт: ${contact.lastContactDate || "Никогда"}`);
  parts.push(`- Желаемая частота: каждые ${contact.desiredFrequencyDays || 30} дней`);
  
  if (contact.hobbies) {
    parts.push(`\nХобби/увлечения: ${contact.hobbies}`);
  }
  
  if (contact.preferences) {
    parts.push(`Предпочтения: ${contact.preferences}`);
  }
  
  if (contact.giftPreferences) {
    parts.push(`Предпочтения в подарках: ${contact.giftPreferences}`);
  }
  
  if (contact.interactionHistory && contact.interactionHistory.length > 0) {
    parts.push(`\nПоследние взаимодействия:`);
    contact.interactionHistory.slice(0, 3).forEach(i => {
      parts.push(`- ${i.date}: ${i.type} через ${i.channel}${i.note ? ` - "${i.note}"` : ""}`);
    });
  }
  
  parts.push(`\nВерни JSON с полями:`);
  parts.push(`- nextActions: массив из 2-4 рекомендуемых действий, каждое с полями action (описание), priority (high/medium/low), reason (почему это важно), suggestedDate (опционально, когда выполнить)`);
  parts.push(`- conversationStarters: массив из 3-5 тем для начала разговора`);
  parts.push(`- giftIdeas: массив из 2-3 идей подарков (если есть информация о предпочтениях)`);
  parts.push(`- warningSignals: массив предупреждающих сигналов (если есть риски)`);
  
  return parts.join("\n");
}

// Export the AI model being used for transparency
export function getAIModelInfo(): { model: string; provider: string } {
  return {
    model: AI_MODEL,
    provider: "OpenAI via Replit AI Integrations"
  };
}
