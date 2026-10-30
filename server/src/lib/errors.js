// Помилка застосунку з кодом HTTP і кодом для єдиного формату відповіді (ТЗ, п. 10.3)
export class AppError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function sendError(res, status, code, message, details = []) {
  res.status(status).json({ error: { code, message, details } });
}
