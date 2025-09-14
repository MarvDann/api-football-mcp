// Safe CLI argument parsing utilities

import { ValidationError } from '../errors/errors'

/**
 * Safely gets the next argument from array
 */
export function getNextArg (args: string[], index: number, flag: string): string {
  const nextIndex = index + 1
  const nextArg = args[nextIndex]

  if (nextArg === undefined || nextArg.startsWith('--')) {
    throw new ValidationError(`Flag ${flag} requires a value`, flag)
  }

  return nextArg
}

/**
 * Safely parses integer from CLI argument
 */
export function parseIntArg (value: string, flag: string, min?: number, max?: number): number {
  const parsed = parseInt(value, 10)

  if (isNaN(parsed)) {
    throw new ValidationError(`Invalid number for ${flag}: ${value}`, flag)
  }

  if (min !== undefined && parsed < min) {
    throw new ValidationError(`${flag} must be at least ${min}, got: ${parsed}`, flag)
  }

  if (max !== undefined && parsed > max) {
    throw new ValidationError(`${flag} must be at most ${max}, got: ${parsed}`, flag)
  }

  return parsed
}

/**
 * Safely validates enum-like values
 */
export function validateChoice<T extends string> (
  value: string | undefined,
  choices: readonly T[],
  flag: string,
  defaultValue?: T
): T {
  if (!value) {
    if (defaultValue) {
      return defaultValue
    }
    throw new ValidationError(`${flag} is required`, flag)
  }

  if (!choices.includes(value as T)) {
    throw new ValidationError(
      `Invalid ${flag}: ${value}. Must be one of: ${choices.join(', ')}`,
      flag
    )
  }

  return value as T
}

/**
 * Parses key=value parameters safely
 */
export function parseKeyValuePair (arg: string): [string, string] {
  if (!arg.includes('=')) {
    throw new ValidationError(`Invalid parameter format: ${arg}. Expected key=value`, 'parameter')
  }

  const [key, ...valueParts] = arg.split('=')
  const value = valueParts.join('=') // Handle values with '=' in them

  if (!key || !value) {
    throw new ValidationError(`Invalid parameter: ${arg}. Both key and value are required`, 'parameter')
  }

  return [key.trim(), value.trim()]
}

/**
 * Safely increments array index and returns new index
 */
export function incrementIndex (args: string[], currentIndex: number, flag: string): number {
  const nextIndex = currentIndex + 1

  if (nextIndex >= args.length) {
    throw new ValidationError(`Flag ${flag} requires a value`, flag)
  }

  return nextIndex
}

/**
 * Generic CLI options parser with type safety
 */
export interface ParserConfig<T> {
  initialOptions: T
  handlers: Record<string, (options: T, args: string[], index: number) => number>
  handleUnknownArg?: (options: T, arg: string, index: number) => void
}

export function parseCliArgs<T> (args: string[], config: ParserConfig<T>): T {
  const options = { ...config.initialOptions }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg?.startsWith('--')) {
      const handler = config.handlers[arg]
      if (handler) {
        i = handler(options, args, i)
      } else if (config.handleUnknownArg) {
        config.handleUnknownArg(options, arg, i)
      } else {
        throw new ValidationError(`Unknown flag: ${arg}`, 'flag')
      }
    } else if (arg && config.handleUnknownArg) {
      config.handleUnknownArg(options, arg, i)
    }
  }

  return options
}
