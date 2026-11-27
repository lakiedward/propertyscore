import { useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

const NOTE_SAVE_DELAY_MS = 800;

export function useAutosavedNote(saved: string, save: (note: string) => void) {
  const [note, setNote] = useState(saved);
  const debounced = useDebouncedValue(note, NOTE_SAVE_DELAY_MS);
  const lastSaved = useRef(saved);
  const latest = useRef(note);
  const saveRef = useRef(save);

  useEffect(() => {
    latest.current = note;
    saveRef.current = save;
  });

  useEffect(() => {
    if (debounced !== lastSaved.current) {
      lastSaved.current = debounced;
      saveRef.current(debounced);
    }
  }, [debounced]);

  useEffect(
    () => () => {
      if (latest.current !== lastSaved.current) {
        lastSaved.current = latest.current;
        saveRef.current(latest.current);
      }
    },
    [],
  );

  return { note, setNote };
}
