/**
 * Object utility functions for handling exactOptionalPropertyTypes
 */

/**
 * Creates an object with only defined properties (no undefined values)
 * This is needed for exactOptionalPropertyTypes compliance
 */
export function createOptionalObject<T extends Record<string, any>> (
  obj: T
): { [K in keyof T as T[K] extends undefined ? never : K]: T[K] } {
  const result = {} as any

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value
    }
  }

  return result
}

/**
 * Creates API parameters object with only defined values
 */
export function createApiParams<T extends Record<string, any>> (
  params: T
): Partial<T> {
  return createOptionalObject(params) as unknown as Partial<T>
}
