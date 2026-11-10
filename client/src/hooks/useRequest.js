import { useCallback, useEffect, useRef, useState } from 'react';

// Кеш останніх відповідей у пам'яті вкладки: під час повернення на сторінку попередні
// дані показуються одразу, а свіжі завантажуються у фоні й замінюють їх (без «скелетонів»
// на кожному переході). Кеш очищується під час входу й виходу (clearRequestCache).
const cache = new Map();

export function clearRequestCache() {
  cache.clear();
}

// Завантаження даних сторінки зі станами «завантаження», «дані», «помилка».
// loader повторно викликається при зміні key і через reload(). Під час повторного
// завантаження на екрані лишаються попередні дані (сторінки показують стан завантаження
// лише тоді, коли даних ще немає: loading && !data).
// cacheName – назва сторінки для кешу; без неї кеш не використовується.
export function useRequest(loader, key = '', cacheName = '') {
  const cacheKey = cacheName ? `${cacheName}:${key}` : null;
  const [state, setState] = useState(() => ({
    data: (cacheKey && cache.get(cacheKey)) ?? null,
    loading: true,
    error: null,
  }));
  const [version, setVersion] = useState(0);
  const loaderRef = useRef(loader);
  const lastKey = useRef(key);

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let active = true;
    const keepData = lastKey.current === key;
    lastKey.current = key;
    const cached = (cacheKey && cache.get(cacheKey)) ?? null;
    setState((prev) => ({
      data: cached ?? (keepData ? prev.data : null),
      loading: true,
      error: null,
    }));
    loaderRef
      .current()
      .then((data) => {
        if (cacheKey) cache.set(cacheKey, data);
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error) => active && setState({ data: null, loading: false, error }));
    return () => {
      active = false;
    };
  }, [key, cacheKey, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { ...state, reload };
}
