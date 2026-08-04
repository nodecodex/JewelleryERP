/**
 * Creates a debounced version of a function that delays invoking the function
 * until after `delay` milliseconds have elapsed since the last time it was invoked.
 *
 * Used primarily to prevent rapid-fire database-updated events from triggering
 * cascading store reloads that freeze the UI.
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: any[]) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced as T & { cancel: () => void };
}
