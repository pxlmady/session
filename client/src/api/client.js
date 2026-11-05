// Виклики REST API: заголовок Authorization, розбір єдиного формату помилок
// { error: { code, message, details } } (ТЗ, п. 10.3) та обробка 401.

const TOKEN_KEY = 'session.token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Помилка запиту до API; message – текст для користувача українською мовою
export class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = Array.isArray(details) ? details : [];
  }
}

// Обробник завершення сеансу (недійсний або прострочений токен) задає AuthProvider
let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export async function request(method, path, body) {
  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Сервер недоступний');
  }

  if (response.status === 204) return null;

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.ok) return data;

  const error = data?.error;
  if (response.status >= 500 || !error) {
    throw new ApiError(
      response.status,
      error?.code ?? 'INTERNAL_ERROR',
      'Сталася помилка сервера. Спробуйте пізніше',
    );
  }
  if (response.status === 401 && error.code === 'UNAUTHORIZED' && token) {
    onUnauthorized?.();
  }
  throw new ApiError(response.status, error.code, error.message, error.details);
}
