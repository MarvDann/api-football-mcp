/**
 * Object utility functions for handling exactOptionalPropertyTypes
 */

/**
 * Creates an object with only defined properties (no undefined values)
 * This is needed for exactOptionalPropertyTypes compliance
 */
export function createOptionalObject<T extends Record<string, unknown>> (
  obj: T
): Partial<T> {
  const result: Partial<T> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value
    }
  }

  return result
}

/**
 * Creates API parameters object with only defined values
 */
export function createApiParams<T extends Record<string, unknown>> (
  params: T
): Partial<T> {
  return createOptionalObject(params)
}
