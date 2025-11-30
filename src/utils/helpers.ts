/**
 * Utility functions for WhatsApp automation
 */

/**
 * Split an array into chunks of specified size
 * @param array - Array to chunk
 * @param size - Maximum size of each chunk
 * @returns Array of chunks
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Normalize phone number to WhatsApp JID format
 * @param phoneNumber - Phone number (with or without country code)
 * @returns WhatsApp JID (e.g., "1234567890@s.whatsapp.net")
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, "");

  // Return in WhatsApp JID format
  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Retry a function with exponential backoff
 * @param fn - Async function to retry
 * @param retries - Number of retry attempts
 * @param delayMs - Initial delay in milliseconds
 * @returns Result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }

    // Wait with exponential backoff
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    // Retry with doubled delay
    return retryWithBackoff(fn, retries - 1, delayMs * 2);
  }
}

/**
 * Validate phone number format
 * @param phoneNumber - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  const cleaned = phoneNumber.replace(/\D/g, "");
  // Must be between 10 and 15 digits
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Parse phone numbers from text (one per line)
 * @param text - Text containing phone numbers
 * @returns Array of valid phone numbers
 */
export function parsePhoneNumbers(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && isValidPhoneNumber(line));
}
