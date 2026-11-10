import { MockAcademicProvider } from './mock/MockAcademicProvider.js';
import { assertProvider } from './provider.js';

// Реєстр постачальників академічних даних. Постачальник обирається змінною ACADEMIC_PROVIDER;
// у прототипі доступний лише mock. Реальний постачальник можна додати лише після підтвердження
// офіційного інтерфейсу та погодження з університетом: нова реалізація контракту + запис тут.
const PROVIDERS = {
  mock: () => new MockAcademicProvider(),
};

export const SUPPORTED_PROVIDERS = Object.keys(PROVIDERS);

export function createAcademicProvider(name) {
  const factory = PROVIDERS[name];
  if (!factory) {
    throw new Error(
      `Невідомий постачальник академічних даних ACADEMIC_PROVIDER=${name}. Допустимі: ${SUPPORTED_PROVIDERS.join(', ')}.`,
    );
  }
  return assertProvider(factory());
}

export { AcademicProviderError } from './errors.js';
export { MockAcademicProvider };
