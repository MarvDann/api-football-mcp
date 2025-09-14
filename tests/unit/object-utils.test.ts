import { describe, it, expect } from 'vitest'
import { createOptionalObject, createApiParams } from '../../src/lib/utils/object-utils'

describe('createOptionalObject', () => {
  it('should remove undefined properties', () => {
    const input = {
      name: 'test',
      value: undefined,
      count: 42,
      flag: null
    }

    const result = createOptionalObject(input)

    expect(result).toEqual({
      name: 'test',
      count: 42,
      flag: null
    })
    expect(result).not.toHaveProperty('value')
  })

  it('should handle empty object', () => {
    const result = createOptionalObject({})
    expect(result).toEqual({})
  })

  it('should handle object with all undefined values', () => {
    const input = {
      a: undefined,
      b: undefined
    }

    const result = createOptionalObject(input)
    expect(result).toEqual({})
  })

  it('should preserve falsy values that are not undefined', () => {
    const input = {
      zero: 0,
      empty: '',
      false: false,
      null: null,
      undef: undefined
    }

    const result = createOptionalObject(input)

    expect(result).toEqual({
      zero: 0,
      empty: '',
      false: false,
      null: null
    })
  })
})

describe('createApiParams', () => {
  it('should work as alias for createOptionalObject', () => {
    const input = {
      season: 2024,
      team: undefined,
      limit: 10
    }

    const result1 = createApiParams(input)
    const result2 = createOptionalObject(input)

    expect(result1).toEqual(result2)
    expect(result1).toEqual({
      season: 2024,
      limit: 10
    })
  })
})
