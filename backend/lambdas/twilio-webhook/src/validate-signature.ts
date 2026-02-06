import { getApiKeys } from 'consultia-shared-nodejs';
import { validateRequest } from 'twilio';

/**
 * Validate Twilio webhook signature to ensure the request
 * is genuinely from Twilio and hasn't been tampered with.
 *
 * Twilio signs every webhook with HMAC-SHA1 using your Auth Token.
 */
export async function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  const { TWILIO_AUTH_TOKEN } = await getApiKeys();

  return validateRequest(TWILIO_AUTH_TOKEN, signature, url, params);
}

/**
 * Parse URL-encoded body from Twilio webhooks into key-value pairs.
 * Twilio sends data as application/x-www-form-urlencoded.
 */
export function parseTwilioBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};

  if (!body) return params;

  const pairs = body.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=').map(decodeURIComponent);
    if (key) {
      params[key] = value || '';
    }
  }

  return params;
}
