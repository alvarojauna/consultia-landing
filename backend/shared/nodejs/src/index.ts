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

// Response helpers
export { createSuccessResponse, createErrorResponse } from './response';

// Secrets Manager
export { getSecret } from './secrets';
