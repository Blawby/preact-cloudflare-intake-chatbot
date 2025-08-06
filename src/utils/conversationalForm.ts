export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.trim();
  // Additional checks for common invalid patterns
  if (trimmed.includes('..') || trimmed.startsWith('.') || trimmed.endsWith('.')) {
    return false;
  }
  return emailRegex.test(trimmed);
}

export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function validateMatterDetails(details: string): boolean {
  if (!details || typeof details !== 'string') {
    return false;
  }
  const trimmed = details.trim();
  return trimmed.length >= 10;
} 