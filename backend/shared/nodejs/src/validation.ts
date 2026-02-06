/**
 * Input validation and sanitization utilities.
 *
 * Validates and sanitizes inputs at the API boundary to prevent:
 * - SQL injection (parameterized queries handle this, but belt + suspenders)
 * - XSS via stored content (agent names, prompts)
 * - Path traversal via customer IDs
 * - Invalid data types that cause downstream crashes
 */

/** UUID v4 format: 8-4-4-4-12 hex characters */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** E.164 phone number: + followed by 1-15 digits */
const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

/** Unsafe content: script tags (including encoded variants), event handlers, dangerous URIs, null bytes */
const UNSAFE_PATTERN = /<script|<\/script|javascript:|data:text\/html|vbscript:|on\w+\s*=|&#60;|&#x3c;|%3c(?:script|\/script)|\\u003c|\x00/i;

export function validateUUID(value: string, fieldName: string): string {
  if (!value || !UUID_REGEX.test(value)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`);
  }
  return value;
}

export function validatePhone(value: string): string {
  const cleaned = value.replace(/[\s()-]/g, '');
  if (!PHONE_REGEX.test(cleaned)) {
    throw new ValidationError('Phone number must be in E.164 format (e.g., +34612345678)');
  }
  return cleaned;
}

export function validateString(
  value: string | undefined,
  fieldName: string,
  opts: { minLength?: number; maxLength?: number; required?: boolean } = {}
): string {
  const { minLength = 0, maxLength = 10000, required = false } = opts;

  if (!value || value.trim().length === 0) {
    if (required) throw new ValidationError(`${fieldName} is required`);
    return '';
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters`);
  }

  if (trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} must be at most ${maxLength} characters`);
  }

  return trimmed;
}

export function sanitizeString(value: string): string {
  if (UNSAFE_PATTERN.test(value)) {
    throw new ValidationError('Input contains potentially unsafe content');
  }
  return value;
}

export function validateInt(
  value: string | undefined,
  fieldName: string,
  opts: { min?: number; max?: number; defaultValue?: number } = {}
): number {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, defaultValue } = opts;

  if (!value) {
    if (defaultValue !== undefined) return defaultValue;
    throw new ValidationError(`${fieldName} is required`);
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    throw new ValidationError(`${fieldName} must be a valid integer`);
  }

  if (parsed < min || parsed > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max}`);
  }

  return parsed;
}

export function validateDateString(value: string | undefined, fieldName: string): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid ISO date string`);
  }

  return date.toISOString();
}

export function validateEnum<T extends string>(
  value: string | undefined,
  fieldName: string,
  allowed: T[],
  opts: { required?: boolean; defaultValue?: T } = {}
): T {
  if (!value) {
    if (opts.defaultValue !== undefined) return opts.defaultValue;
    if (opts.required) throw new ValidationError(`${fieldName} is required`);
    throw new ValidationError(`${fieldName} must be one of: ${allowed.join(', ')}`);
  }

  if (!allowed.includes(value as T)) {
    throw new ValidationError(`${fieldName} must be one of: ${allowed.join(', ')}`);
  }

  return value as T;
}

export class ValidationError extends Error {
  code = 'VALIDATION_ERROR';
  statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
