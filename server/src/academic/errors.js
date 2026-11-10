// Помилка постачальника академічних даних (ТЗ п. 4.1.5, таблиця 4.4): збій, перевищення
// часу очікування або дані, що не пройшли перевірку схемою. Сервіс перетворює її
// на 503 ACADEMIC_PROVIDER_UNAVAILABLE або результат перевірки накладок UNAVAILABLE.
export class AcademicProviderError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'AcademicProviderError';
  }
}
