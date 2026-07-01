// ============================================================================
// LOWKEY — Security Layer
// Rate limiting, bot protection, input sanitization
// ============================================================================

// ============ RATE LIMITING ============

interface RateEntry {
  count: number;
  firstAt: number;
}

const rateLimits: Record<string, RateEntry> = {};

export function rateLimit(action: string, maxPerHour: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const key = action;
  
  if (!rateLimits[key]) {
    rateLimits[key] = { count: 0, firstAt: now };
  }

  const entry = rateLimits[key];
  
  if (now - entry.firstAt > 3600000) {
    entry.count = 0;
    entry.firstAt = now;
  }

  if (entry.count >= maxPerHour) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxPerHour - entry.count };
}

// ============ BOT DETECTION ============

export function initBotDetection() {
  // No-op — kept for compatibility
}

// Simple check: honeypot only (timing checks removed — they caused false positives)
export function isHoneypotFilled(value: string): boolean {
  return value.length > 0;
}

// ============ INPUT SANITIZATION ============

export function sanitize(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}
