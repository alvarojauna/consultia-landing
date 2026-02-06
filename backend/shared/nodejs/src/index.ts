/**
 * ConsultIA Shared Utilities - Node.js Lambda Functions
 *
 * Export all shared modules for use in Lambda functions
 */

// Database connection and utilities
export {
  initializePool,
  getPool,
  query,
  transaction,
  closePool,
  healthCheck,
} from './database';

// TypeScript types
export * from './types';

// Response helpers (canonical versions — consistent CORS headers)
export {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
  parseBody,
  getCustomerIdFromAuth,
  getCustomerIdFromPath,
  logRequest,
} from './response';

// Secrets Manager
export { getSecret } from './secrets';

// Utilities (only exports unique to utilities.ts)
export {
  getApiKeys,
  validateRequiredFields,
  getUserIdFromEvent,
} from './utilities';

// Retry with exponential backoff
export { withRetry, RETRY_CONFIGS } from './retry';

// Input validation and sanitization
export {
  validateUUID,
  validatePhone,
  validateString,
  sanitizeString,
  validateInt,
  validateDateString,
  validateEnum,
  ValidationError,
} from './validation';
