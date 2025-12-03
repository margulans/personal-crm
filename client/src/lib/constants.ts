export const ATTENTION_LEVELS = [
  { id: 1, name: "Присутствие в поле", description: "Лайк, реакция, комментарий, пересылка" },
  { id: 2, name: "Косвенное касание", description: "Массовая рассылка, отметка в сторис, общий канал" },
  { id: 3, name: "Единичный контакт", description: "Личное сообщение без повода, короткий звонок" },
  { id: 4, name: "Поводной отклик", description: "Поздравления с ДР, праздником, событием" },
  { id: 5, name: "Малый персональный жест", description: "Персонализированное сообщение, подборка, рекомендация" },
  { id: 6, name: "Вклад в пользу", description: "Интро, совет, помощь по делу, небольшой подарок" },
  { id: 7, name: "Приглашение в своё поле", description: "Корпоративные события, закрытые встречи" },
  { id: 8, name: "Совместное время", description: "Обед, прогулка, поездка, перелёт" },
  { id: 9, name: "Доступ к личному пространству", description: "Дом, семейные события, глубокие разговоры" },
  { id: 10, name: "Вложение в путь", description: "Менторство, партнёрство, продвижение" },
] as const;

export const INTERACTION_TYPES = [
  { value: "call", label: "Звонок" },
  { value: "meeting", label: "Встреча" },
  { value: "message", label: "Сообщение" },
  { value: "event", label: "Мероприятие" },
  { value: "gift", label: "Подарок" },
  { value: "intro", label: "Интро" },
  { value: "other", label: "Другое" },
] as const;

export const INTERACTION_CHANNELS = [
  { value: "phone", label: "Телефон" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "offline", label: "Лично" },
  { value: "other", label: "Другое" },
] as const;

export const ROLE_TAGS = [
  "Семья",
  "Друг",
  "Партнёр",
  "Инвестор",
  "Ученик",
  "Команда",
  "Медиа",
  "Эксперт",
] as const;

export const CONTRIBUTION_CRITERIA = [
  { 
    key: "financial", 
    label: "Финансовый вклад", 
    description: "Покупки, инвестиции, привёл оборот",
    scale: "0=нет; 1=до $10K; 2=$10-100K; 3=$100K+"
  },
  { 
    key: "network", 
    label: "Помощь связями", 
    description: "Интро, доступ к ключевым людям, открыл двери",
    scale: "0=нет; 1=одиночное интро; 2=сильное интро; 3=системная помощь"
  },
  { 
    key: "trust", 
    label: "Доверие и репутация", 
    description: "Лояльность, рекомендации, защита репутации",
    scale: "0=нет; 1=единичные жесты; 2=ощутимый вклад; 3=системное усиление"
  },
  { 
    key: "emotional", 
    label: "Эмоциональный вклад", 
    description: "Приятное общение, эмоциональная поддержка, психологический комфорт",
    scale: "0=нет; 1=иногда приятно; 2=регулярная поддержка; 3=ключевой человек для эмоций"
  },
] as const;

export const POTENTIAL_CRITERIA = [
  { key: "personal", label: "Перспективность личности", description: "Как личность и профессионал" },
  { key: "resources", label: "Ресурсность", description: "Деньги, влияние, доступ" },
  { key: "network", label: "Нетворк", description: "Ширина и качество связей" },
  { key: "synergy", label: "Синергия", description: "С вашим вектором развития" },
  { key: "systemRole", label: "Системная роль", description: "Потенциал стать партнёром, лидером, советником" },
] as const;

export function getClassFromScore(score: number, maxScore: number = 9): string {
  if (maxScore === 15) {
    if (score >= 12) return "A";
    if (score >= 8) return "B";
    if (score >= 4) return "C";
    return "D";
  }
  if (score >= 7) return "A";
  if (score >= 5) return "B";
  if (score >= 2) return "C";
  return "D";
}

export function calculateHeatIndex(
  daysSinceLastContact: number,
  desiredFrequencyDays: number,
  responseQuality: number,
  relationshipEnergy: number,
  attentionTrend: number
): { heatIndex: number; heatStatus: "green" | "yellow" | "red" } {
  const ratio = daysSinceLastContact / (2.0 * desiredFrequencyDays);
  let R = 1.0 - ratio;
  if (R < 0) R = 0;
  if (R > 1) R = 1;

  const Q = responseQuality / 3.0;
  const E = (relationshipEnergy - 1) / 4.0;
  
  let T = 0.5;
  if (attentionTrend === -1) T = 0.0;
  else if (attentionTrend === 1) T = 1.0;

  const heatIndex = 0.4 * R + 0.3 * E + 0.2 * Q + 0.1 * T;

  let heatStatus: "green" | "yellow" | "red";
  if (heatIndex >= 0.70) {
    heatStatus = "green";
  } else if (heatIndex >= 0.40) {
    heatStatus = "yellow";
  } else {
    heatStatus = "red";
  }

  if (daysSinceLastContact > 3 * desiredFrequencyDays) {
    heatStatus = "red";
  }

  if (
    daysSinceLastContact <= 0.5 * desiredFrequencyDays &&
    relationshipEnergy >= 4 &&
    responseQuality >= 2
  ) {
    heatStatus = "green";
  }

  return { heatIndex: Math.round(heatIndex * 100) / 100, heatStatus };
}

export function formatDaysAgo(days: number): string {
  if (days === 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 7) return `${days} дн. назад`;
  if (days < 30) return `${Math.floor(days / 7)} нед. назад`;
  if (days < 365) return `${Math.floor(days / 30)} мес. назад`;
  return `${Math.floor(days / 365)} г. назад`;
}
