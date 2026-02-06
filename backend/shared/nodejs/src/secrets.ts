import { SecretsManager } from 'aws-sdk';

const secretsManager = new SecretsManager({
  region: process.env.AWS_REGION || 'eu-west-1',
});

// Cache secrets in memory for Lambda reuse
const secretsCache: Map<string, any> = new Map();

/**
 * Get secret from AWS Secrets Manager with caching
 */
export async function getSecret(secretName: string): Promise<any> {
  // Check cache first
  if (secretsCache.has(secretName)) {
    console.log(`[Secrets] Retrieved ${secretName} from cache`);
    return secretsCache.get(secretName);
  }

  try {
    console.log(`[Secrets] Fetching ${secretName} from Secrets Manager`);

    const data = await secretsManager
      .getSecretValue({ SecretId: secretName })
      .promise();

    if (data.SecretString) {
      const secret = JSON.parse(data.SecretString);

      // Cache for future invocations
      secretsCache.set(secretName, secret);

      return secret;
    }

    throw new Error('Secret string not found');
  } catch (error) {
    console.error(`[Secrets] Error fetching ${secretName}:`, error);
    throw error;
  }
}

/**
 * Get specific API keys from the main secrets object
 */
export async function getApiKeys(): Promise<{
  STRIPE_SECRET_KEY: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  ELEVENLABS_API_KEY: string;
  ANTHROPIC_API_KEY?: string;
}> {
  return await getSecret(
    process.env.API_KEYS_SECRET_NAME || 'consultia/production/api-keys'
  );
}

/**
 * Clear secrets cache (useful for testing or forced refresh)
 */
export function clearSecretsCache(): void {
  secretsCache.clear();
  console.log('[Secrets] Cache cleared');
}
