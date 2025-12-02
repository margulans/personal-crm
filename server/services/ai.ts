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

// Team-wide contact summary for dashboard
export interface TeamContactSummary {
  fullName: string;
  company?: string | null;
  heatStatus: string;
  heatIndex: number;
  importanceLevel: string;
  valueCategory: string;
  lastContactDate?: string | null;
  desiredFrequencyDays: number;
  daysOverdue: number;
}

// Daily dashboard recommendations
export interface DailyDashboard {
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
}

// Team analytics summary
export interface TeamAnalytics {
  summary: string;
  trends: string[];
  strengthAreas: string[];
  weaknessAreas: string[];
  strategicRecommendations: string[];
}

// Generate daily dashboard with AI priorities
export async function generateDailyDashboard(contacts: TeamContactSummary[]): Promise<DailyDashboard> {
  if (contacts.length === 0) {
    return {
      greeting: "Добро пожаловать в PRIMA!",
      topPriorities: [],
      dailyTip: "Добавьте контакты, чтобы получить персональные рекомендации.",
      networkHealth: { status: "Нет данных", score: 0, trend: "stable" }
    };
  }

  const redContacts = contacts.filter(c => c.heatStatus === "red");
  const yellowContacts = contacts.filter(c => c.heatStatus === "yellow");
  const greenContacts = contacts.filter(c => c.heatStatus === "green");
  
  const avgHeatIndex = contacts.reduce((sum, c) => sum + c.heatIndex, 0) / contacts.length;

  const prompt = buildDashboardPrompt(contacts, { red: redContacts.length, yellow: yellowContacts.length, green: greenContacts.length, avgHeatIndex });

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: `Ты - персональный AI-ассистент для управления отношениями. Помоги пользователю эффективно поддерживать связь с важными людьми. Отвечай на русском языке. Будь кратким и практичным. Время суток: ${getTimeOfDay()}.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return {
      greeting: parsed.greeting || "Добрый день!",
      topPriorities: parsed.topPriorities || [],
      dailyTip: parsed.dailyTip || "Поддерживайте регулярный контакт с важными людьми.",
      networkHealth: parsed.networkHealth || { status: "Стабильно", score: avgHeatIndex * 100, trend: "stable" }
    };
  } catch (error) {
    console.error("Error generating daily dashboard:", error);
    return {
      greeting: "Добрый день!",
      topPriorities: redContacts.slice(0, 3).map(c => ({
        contactName: c.fullName,
        action: "Связаться",
        reason: `Просрочено на ${c.daysOverdue} дней`,
        urgency: "critical" as const
      })),
      dailyTip: "Начните с контактов в красной зоне.",
      networkHealth: { status: avgHeatIndex >= 0.7 ? "Хорошо" : avgHeatIndex >= 0.4 ? "Требует внимания" : "Критично", score: Math.round(avgHeatIndex * 100), trend: "stable" }
    };
  }
}

// Generate team-wide analytics summary
export async function generateTeamAnalytics(contacts: TeamContactSummary[]): Promise<TeamAnalytics> {
  if (contacts.length === 0) {
    return {
      summary: "Нет данных для анализа",
      trends: [],
      strengthAreas: [],
      weaknessAreas: [],
      strategicRecommendations: ["Добавьте контакты для получения аналитики"]
    };
  }

  const prompt = buildAnalyticsPrompt(contacts);

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: `Ты - аналитик CRM и эксперт по нетворкингу. Проанализируй портфель контактов и дай стратегические рекомендации. Отвечай на русском языке.`
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
      trends: parsed.trends || [],
      strengthAreas: parsed.strengthAreas || [],
      weaknessAreas: parsed.weaknessAreas || [],
      strategicRecommendations: parsed.strategicRecommendations || []
    };
  } catch (error) {
    console.error("Error generating team analytics:", error);
    throw new Error("Не удалось создать аналитику");
  }
}

// Generate quick AI hint for a single contact (for cards)
export async function generateContactHint(contact: TeamContactSummary): Promise<string> {
  if (contact.heatStatus === "green") {
    return "Отношения в норме";
  }

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: `Ты - CRM ассистент. Дай ОДНУ краткую подсказку (до 50 символов) для контакта. Отвечай на русском.`
        },
        {
          role: "user",
          content: `Контакт: ${contact.fullName}, статус: ${contact.heatStatus}, просрочено дней: ${contact.daysOverdue}, важность: ${contact.importanceLevel}. Дай краткую подсказку.`
        }
      ],
      max_completion_tokens: 100,
    });

    return response.choices[0]?.message?.content?.trim() || "Требует внимания";
  } catch (error) {
    console.error("Error generating contact hint:", error);
    return contact.heatStatus === "red" ? "Срочно связаться" : "Поддержать контакт";
  }
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "утро";
  if (hour >= 12 && hour < 17) return "день";
  if (hour >= 17 && hour < 22) return "вечер";
  return "ночь";
}

function buildDashboardPrompt(contacts: TeamContactSummary[], stats: { red: number; yellow: number; green: number; avgHeatIndex: number }): string {
  const parts: string[] = [];
  
  parts.push(`Создай ежедневный дашборд в формате JSON.`);
  parts.push(`\nСтатистика контактов:`);
  parts.push(`- Всего: ${contacts.length}`);
  parts.push(`- В красной зоне (срочно): ${stats.red}`);
  parts.push(`- В жёлтой зоне (внимание): ${stats.yellow}`);
  parts.push(`- В зелёной зоне (норма): ${stats.green}`);
  parts.push(`- Средний индекс здоровья: ${(stats.avgHeatIndex * 100).toFixed(0)}%`);
  
  const urgentContacts = contacts
    .filter(c => c.heatStatus === "red" || (c.heatStatus === "yellow" && c.importanceLevel === "A"))
    .sort((a, b) => {
      if (a.importanceLevel !== b.importanceLevel) return a.importanceLevel.localeCompare(b.importanceLevel);
      return b.daysOverdue - a.daysOverdue;
    })
    .slice(0, 5);
  
  if (urgentContacts.length > 0) {
    parts.push(`\nПриоритетные контакты:`);
    urgentContacts.forEach(c => {
      parts.push(`- ${c.fullName} (${c.company || "—"}): ${c.heatStatus}, важность ${c.importanceLevel}, просрочено ${c.daysOverdue} дн.`);
    });
  }
  
  parts.push(`\nВерни JSON с полями:`);
  parts.push(`- greeting: приветствие с учётом времени суток и состояния сети`);
  parts.push(`- topPriorities: массив из 1-3 приоритетных действий на сегодня. ВАЖНО: используй РЕАЛЬНЫЕ имена контактов из списка выше! Каждый элемент: {contactName: точное имя из списка, action: конкретное действие, reason: почему важно, urgency: critical/high/medium}`);
  parts.push(`- dailyTip: полезный совет на сегодня`);
  parts.push(`- networkHealth: объект {status: строка, score: число 0-100, trend: up/down/stable}`);
  
  return parts.join("\n");
}

function buildAnalyticsPrompt(contacts: TeamContactSummary[]): string {
  const parts: string[] = [];
  
  const stats = {
    total: contacts.length,
    byStatus: {
      red: contacts.filter(c => c.heatStatus === "red").length,
      yellow: contacts.filter(c => c.heatStatus === "yellow").length,
      green: contacts.filter(c => c.heatStatus === "green").length,
    },
    byImportance: {
      A: contacts.filter(c => c.importanceLevel === "A").length,
      B: contacts.filter(c => c.importanceLevel === "B").length,
      C: contacts.filter(c => c.importanceLevel === "C").length,
    },
    avgHeatIndex: contacts.reduce((sum, c) => sum + c.heatIndex, 0) / contacts.length,
    avgOverdue: contacts.reduce((sum, c) => sum + Math.max(0, c.daysOverdue), 0) / contacts.length,
  };
  
  parts.push(`Проанализируй портфель контактов и дай стратегические рекомендации в формате JSON.`);
  parts.push(`\nСтатистика:`);
  parts.push(`- Всего контактов: ${stats.total}`);
  parts.push(`- По статусу: красных ${stats.byStatus.red}, жёлтых ${stats.byStatus.yellow}, зелёных ${stats.byStatus.green}`);
  parts.push(`- По важности: A-класс ${stats.byImportance.A}, B-класс ${stats.byImportance.B}, C-класс ${stats.byImportance.C}`);
  parts.push(`- Средний индекс здоровья: ${(stats.avgHeatIndex * 100).toFixed(0)}%`);
  parts.push(`- Среднее просрочено дней: ${stats.avgOverdue.toFixed(1)}`);
  
  const criticalContacts = contacts.filter(c => c.heatStatus === "red" && c.importanceLevel === "A");
  if (criticalContacts.length > 0) {
    parts.push(`\nКритические контакты (A-класс в красной зоне):`);
    criticalContacts.slice(0, 5).forEach(c => {
      parts.push(`- ${c.fullName}: просрочено ${c.daysOverdue} дней`);
    });
  }
  
  parts.push(`\nВерни JSON с полями:`);
  parts.push(`- summary: краткое резюме состояния сети (2-3 предложения)`);
  parts.push(`- keyTrends: массив из 2-3 объектов {observation: наблюдение, implication: вывод, direction: positive/negative/neutral}`);
  parts.push(`- strengths: массив из 2-3 сильных сторон (строки)`);
  parts.push(`- weaknesses: массив из 2-3 областей для улучшения (строки)`);
  parts.push(`- strategicRecommendations: массив из 2-4 объектов {recommendation: рекомендация, priority: high/medium/low, timeframe: срок, expectedOutcome: ожидаемый результат}`);
  parts.push(`- focusAreas: массив из 2-3 приоритетных направлений на эту неделю (строки)`);
  
  return parts.join("\n");
}
