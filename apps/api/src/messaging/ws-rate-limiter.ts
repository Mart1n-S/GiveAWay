/**
 * Rate limiter en mémoire pour les envois WS.
 * Sliding window de 60s, limite par userId.
 * Compatible mono-instance — pour scaler, basculer sur Redis.
 */
export class WsRateLimiter {
  private readonly windowMs = 60_000;
  private readonly buckets = new Map<number, number[]>();

  constructor(private readonly limitPerMinute: number) {}

  allow(userId: number): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const bucket = this.buckets.get(userId) ?? [];
    const fresh = bucket.filter((ts) => ts > cutoff);
    if (fresh.length >= this.limitPerMinute) {
      this.buckets.set(userId, fresh);
      return false;
    }
    fresh.push(now);
    this.buckets.set(userId, fresh);
    return true;
  }

  clear(userId: number): void {
    this.buckets.delete(userId);
  }

  /** Pour tests */
  reset(): void {
    this.buckets.clear();
  }
}
