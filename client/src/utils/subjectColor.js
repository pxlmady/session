// Колір дисципліни в розкладі: кожна дисципліна має власний приглушений відтінок з
// «північної» палітри, однаковий на всіх сторінках. Відтінок визначається ідентифікатором
// дисципліни Session (для дисциплін поза довідником – назвою), тому не змінюється між тижнями.
// Блок заняття – ледь тоноване тло з тонкою рамкою і кольоровою крапкою біля назви; текст
// має звичайний колір теми, тому контраст в обох схемах не менший за 4,5 : 1.

// Кольори у форматі «R G B»
const COLORS = [
  '129 161 193', // блакитно-сірий
  '143 188 187', // морська хвиля
  '208 135 112', // теракота
  '180 142 173', // бузковий
  '191 97 106', // приглушений червоний
  '136 192 208', // крижаний
  '235 203 139', // пісочний
  '163 190 140', // шавлієвий
  '94 129 172', // сталевий синій
  '196 167 132', // кавовий
];

function hashText(text) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.codePointAt(0)) % 9973;
  return hash;
}

export function subjectColor(subject) {
  const index = Number.isInteger(subject?.id) ? subject.id : hashText(subject?.name ?? '');
  return COLORS[index % COLORS.length];
}

// sx-стилі блоку заняття: тоноване тло, тонка рамка й крапка кольору дисципліни ліворуч
// від назви дисципліни (у темній схемі крапка ледь світиться). dotTop – відступ крапки згори:
// у клітинці сітки назва – перший рядок, у картці заняття над нею ще рядок із часом
export function subjectSx(subject, { dotTop = 14 } = {}) {
  const rgb = subjectColor(subject);
  return (theme) => ({
    position: 'relative',
    paddingLeft: '24px',
    borderRadius: '10px',
    backgroundColor: `rgba(${rgb} / 0.15)`,
    border: `1px solid rgba(${rgb} / 0.3)`,
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 10,
      top: dotTop,
      width: 7,
      height: 7,
      borderRadius: '50%',
      backgroundColor: `rgb(${rgb})`,
    },
    ...theme.applyStyles('dark', {
      backgroundColor: `rgba(${rgb} / 0.11)`,
      border: `1px solid rgba(${rgb} / 0.22)`,
      '&::before': { boxShadow: `0 0 9px 1px rgba(${rgb} / 0.8)` },
    }),
  });
}
