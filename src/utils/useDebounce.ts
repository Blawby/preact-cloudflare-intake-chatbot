import { useRef, useMemo, useEffect } from 'preact/hooks';
import { debounce } from './debounce';

export const useDebounce = (callback: () => void, delay: number = 500) => {
  const ref = useRef<() => void>();

  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  const debouncedCallback = useMemo(() => {
    const func = () => {
      ref.current?.();
    };

    return debounce(func, delay);
  }, [delay]);

  return debouncedCallback;
}; 