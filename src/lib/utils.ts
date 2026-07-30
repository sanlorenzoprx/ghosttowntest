/**
 * Generate random alphanumeric ID
 */
export function generateRandomId(length: number = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  if (!Number.isSafeInteger(length) || length < 1) {
    throw new Error('Random ID length must be a positive integer');
  }

  let result = '';
  const unbiasedLimit = 256 - (256 % chars.length);
  while (result.length < length) {
    const bytes = new Uint8Array(Math.max(16, (length - result.length) * 2));
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= unbiasedLimit) continue;
      result += chars[byte % chars.length];
      if (result.length === length) break;
    }
  }
  return result;
}

/**
 * Simple hash for idea deduplication
 */
export function hashObject(obj: any): string {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Format date to human readable
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Truncate string to max length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Check if email is valid
 */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Check if string is strong password
 */
export function isStrongPassword(password: string): boolean {
  return password.length >= 6;
}
