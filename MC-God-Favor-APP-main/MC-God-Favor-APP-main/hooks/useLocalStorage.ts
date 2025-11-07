import React, { useState, useEffect } from 'react';

/**
 * A hook to manage state in localStorage, now with asynchronous loading.
 * This prevents blocking the main thread on initial render if the stored data is large.
 * @param key The key to use in localStorage.
 * @param initialValue The initial value to use if nothing is in localStorage or during async loading.
 * @returns A tuple containing: [the stored value, a function to update the value, a boolean indicating if the data is still loading from localStorage].
 */
export function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  // Effect to read from localStorage asynchronously on mount.
  useEffect(() => {
    // Use a small timeout to ensure this runs after the initial render,
    // allowing the UI (like a splash screen) to appear without delay.
    setTimeout(() => {
        try {
            const item = window.localStorage.getItem(key);
            if (item) {
                setStoredValue(JSON.parse(item));
            }
        } catch (error) {
            console.error(`Error reading localStorage key “${key}”:`, error);
            // The value will remain the initialValue.
        } finally {
            setIsLoading(false);
        }
    }, 0);
  }, [key]);

  // Effect to write to localStorage whenever the value changes, but only after initial loading is complete.
  useEffect(() => {
    if (!isLoading) {
        try {
            const valueToStore = JSON.stringify(storedValue);
            window.localStorage.setItem(key, valueToStore);
        } catch (error) {
            console.error(`Error writing to localStorage key “${key}”:`, error);
        }
    }
  }, [key, storedValue, isLoading]);

  return [storedValue, setStoredValue, isLoading];
}
