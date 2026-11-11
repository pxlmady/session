// Колір дисципліни в розкладі: кожна дисципліна має власний відтінок, однаковий на всіх
// сторінках. Відтінок визначається ідентифікатором дисципліни Session (для дисциплін поза
// довідником – назвою), тому не змінюється між тижнями. Тло світле у світлій схемі й темне
// в темній; контраст тексту з тлом в обох схемах не менший за 4,5 : 1.

const HUES = [212, 145, 28, 275, 340, 180, 55, 310, 100, 240];

function hashText(text) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.codePointAt(0)) % 9973;
  return hash;
}

export function subjectHue(subject) {
  const index = Number.isInteger(subject?.id) ? subject.id : hashText(subject?.name ?? '');
  return HUES[index % HUES.length];
}

// sx-стилі блоку заняття: тло і кольорова смуга ліворуч
export function subjectSx(subject) {
  const hue = subjectHue(subject);
  return (theme) => ({
    backgroundColor: `hsl(${hue} 80% 93%)`,
    borderLeft: `4px solid hsl(${hue} 60% 45%)`,
    ...theme.applyStyles('dark', {
      backgroundColor: `hsl(${hue} 35% 20%)`,
      borderLeft: `4px solid hsl(${hue} 55% 60%)`,
    }),
  });
}
