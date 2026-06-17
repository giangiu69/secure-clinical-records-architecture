import { useCallback, useRef, useEffect } from 'react';

/**
 * Hook per salvare dati in localStorage con debounce.
 * Previene scritture eccessive durante la digitazione rapida.
 */
export function useDebouncedStorage<T>(
  key: string,
  delay: number = 500
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValueRef = useRef<T | null>(null);

  // Funzione per salvare immediatamente (flush)
  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pendingValueRef.current !== null) {
      try {
        localStorage.setItem(key, JSON.stringify(pendingValueRef.current));
      } catch (error) {
        console.error(`Error saving ${key} to localStorage:`, error);
      }
      pendingValueRef.current = null;
    }
  }, [key]);

  // Funzione per salvare con debounce
  const save = useCallback((value: T) => {
    pendingValueRef.current = value;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      flush();
    }, delay);
  }, [delay, flush]);

  // Cleanup al unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Salva eventuali dati pendenti al unmount
      if (pendingValueRef.current !== null) {
        try {
          localStorage.setItem(key, JSON.stringify(pendingValueRef.current));
        } catch (error) {
          console.error(`Error saving ${key} to localStorage on unmount:`, error);
        }
      }
    };
  }, [key]);

  return { save, flush };
}
