import { useEffect, useState } from 'react';

export default function useDebounce(value: any, delay: number) {
  const [debounceValue, setDebounceValue] = useState(value);

  useEffect(() => {
  const handler = setTimeout(() => {
    setDebounceValue(value);
  }, delay);

  // Clear the timeout on each useEffect call before setting a new one
  return () => {
    clearTimeout(handler);
  };
  }, [value, delay]);

  return debounceValue;
}