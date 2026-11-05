import { useCallback, useEffect, useRef, useState } from 'react';

// Завантаження даних сторінки зі станами «завантаження», «дані», «помилка».
// loader повторно викликається при зміні key (попередні дані скидаються)
// і через reload() (попередні дані залишаються на екрані до отримання нових).
export function useRequest(loader, key = '') {
  const [state, setState] = useState({ data: null, loading: true, error: null });
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
    setState((prev) => ({ data: keepData ? prev.data : null, loading: true, error: null }));
    loaderRef
      .current()
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch((error) => active && setState({ data: null, loading: false, error }));
    return () => {
      active = false;
    };
  }, [key, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { ...state, reload };
}
