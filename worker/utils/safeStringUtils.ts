/**
 * Safe string utility functions to prevent null reference errors
 */

/**
 * Safely checks if a value includes a search string
 * @param value - The value to check (can be null, undefined, or any type)
 * @param search - The string to search for
 * @returns true if value is a string and includes the search string, false otherwise
 */
export function safeIncludes(value: unknown, search: string): boolean {
  return typeof value === 'string' && value.includes(search);
}

/**
 * Safely checks if a value starts with a search string
 * @param value - The value to check (can be null, undefined, or any type)
 * @param search - The string to search for
 * @returns true if value is a string and starts with the search string, false otherwise
 */
export function safeStartsWith(value: unknown, search: string): boolean {
  return typeof value === 'string' && value.startsWith(search);
}

/**
 * Safely checks if a value ends with a search string
 * @param value - The value to check (can be null, undefined, or any type)
 * @param search - The string to search for
 * @returns true if value is a string and ends with the search string, false otherwise
 */
export function safeEndsWith(value: unknown, search: string): boolean {
  return typeof value === 'string' && value.endsWith(search);
}

/**
 * Safely gets the length of a string value
 * @param value - The value to check (can be null, undefined, or any type)
 * @returns the length if value is a string, 0 otherwise
 */
export function safeLength(value: unknown): number {
  return typeof value === 'string' ? value.length : 0;
}

/**
 * Safely converts a value to lowercase
 * @param value - The value to convert (can be null, undefined, or any type)
 * @returns lowercase string if value is a string, empty string otherwise
 */
export function safeToLowerCase(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

/**
 * Safely converts a value to uppercase
 * @param value - The value to convert (can be null, undefined, or any type)
 * @returns uppercase string if value is a string, empty string otherwise
 */
export function safeToUpperCase(value: unknown): string {
  return typeof value === 'string' ? value.toUpperCase() : '';
}

/**
 * Parses an environment variable value as a boolean
 * Treats '1', 'true', 'yes' (case-insensitive) as true, everything else as false
 * @param value - The environment variable value to parse
 * @param defaultValue - Default value to return if value is undefined (defaults to false)
 * @returns boolean value
 */
export function parseEnvBool(value: string | undefined, defaultValue: boolean = false): boolean {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  // Convert to string if it's not already
  const stringValue = typeof value === 'string' ? value : String(value);
  const normalized = stringValue.toLowerCase().trim();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}
