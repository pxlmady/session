// Шаблони теми бронювання з контексту дисципліни (UX v2, розд. 4.3; FR-33).
// Тема залишається редагованою і перевіряється за звичайним правилом (3–500 символів).

const TOPIC_MAX = 500;

const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);

export function topicTemplate({ subject, debt, record } = {}) {
  if (!subject) return '';
  let topic;
  if (debt) {
    // «Вебпрограмування: незахищена лабораторна робота (заборгованість)»
    topic = `${subject.name}: ${lowerFirst(debt.debtType)} (заборгованість)`;
  } else if (record) {
    // «Бази даних: екзамен, 52 балів»
    topic = `${subject.name}: ${lowerFirst(record.controlType)}, ${record.score} балів`;
  } else {
    topic = `${subject.name}: `;
  }
  return topic.slice(0, TOPIC_MAX);
}
