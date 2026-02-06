import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { SecretsManager } from 'aws-sdk';

/**
 * Database connection pool (singleton pattern)
 * Reuses connections across Lambda invocations for better performance
 */
let pool: Pool | null = null;

interface DatabaseCredentials {
  username: string;
  password: string;
  host: string;
  port: number;
  dbname: string;
}

/**
 * Get database credentials from AWS Secrets Manager
 */
async function getDatabaseCredentials(): Promise<DatabaseCredentials> {
  const secretsManager = new SecretsManager({
    region: process.env.AWS_REGION || 'eu-west-1',
  });

  const secretName = process.env.DB_SECRET_NAME || 'consultia/database/credentials';

  try {
    const data = await secretsManager
      .getSecretValue({ SecretId: secretName })
      .promise();

    if (data.SecretString) {
      const secret = JSON.parse(data.SecretString);
      return {
        username: secret.username,
        password: secret.password,
        host: secret.host,
        port: secret.port || 5432,
        dbname: secret.dbname || 'consultia',
      };
    }

    throw new Error('Secret string not found');
  } catch (error) {
    console.error('Error retrieving database credentials:', error);
    throw error;
  }
}

/**
 * Initialize database connection pool
 * Call this once at Lambda cold start
 */
export async function initializePool(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  // For local development, use environment variables
  if (process.env.NODE_ENV === 'development' && process.env.DB_HOST) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'consultia',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: 2000,
    });

    console.log('[DB] Using local development database');
    return pool;
  }

  // For production, use Secrets Manager
  const credentials = await getDatabaseCredentials();

  pool = new Pool({
    host: credentials.host,
    port: credentials.port,
    database: credentials.dbname,
    user: credentials.username,
    password: credentials.password,
    max: 10, // Maximum 10 connections per Lambda instance
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 2000,
    ssl: {
      rejectUnauthorized: true, // Enforce SSL for Aurora
    },
  });

  // Test connection
  try {
    const client = await pool.connect();
    console.log('[DB] Database connection pool initialized successfully');
    client.release();
  } catch (error) {
    console.error('[DB] Failed to initialize connection pool:', error);
    throw error;
  }

  return pool;
}

/**
 * Get connection pool (initialize if not exists)
 */
export async function getPool(): Promise<Pool> {
  if (!pool) {
    return await initializePool();
  }
  return pool;
}

/**
 * Execute a query with automatic connection management
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const currentPool = await getPool();
  const start = Date.now();

  try {
    const result = await currentPool.query<T>(text, params);
    const duration = Date.now() - start;

    console.log('[DB Query]', {
      text: text.substring(0, 100), // Log first 100 chars
      duration: `${duration}ms`,
      rows: result.rowCount,
    });

    return result;
  } catch (error) {
    console.error('[DB Error]', {
      text,
      params,
      error,
    });
    throw error;
  }
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const currentPool = await getPool();
  const client = await currentPool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DB Transaction Error]', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close database pool (cleanup)
 * Call this at Lambda shutdown if needed
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DB] Connection pool closed');
  }
}

/**
 * Health check - test database connectivity
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as healthy');
    return result.rows.length > 0 && result.rows[0].healthy === 1;
  } catch (error) {
    console.error('[DB Health Check Failed]', error);
    return false;
  }
}
