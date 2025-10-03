import { useMemo } from 'preact/hooks';

/**
 * Generates a stable unique ID for a component instance.
 * The ID is generated once per component instance and remains stable across re-renders.
 * 
 * @param prefix - Optional prefix for the generated ID
 * @returns A stable unique ID string
 */
export function useUniqueId(prefix?: string): string {
  return useMemo(() => {
    const id = Math.random().toString(36).substr(2, 9);
    return prefix ? `${prefix}-${id}` : id;
  }, []);
}
