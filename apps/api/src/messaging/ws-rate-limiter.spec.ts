import { WsRateLimiter } from './ws-rate-limiter';

describe('WsRateLimiter', () => {
  let limiter: WsRateLimiter;

  beforeEach(() => {
    limiter = new WsRateLimiter(3);
  });

  it("autorise jusqu'à la limite", () => {
    expect(limiter.allow(1)).toBe(true);
    expect(limiter.allow(1)).toBe(true);
    expect(limiter.allow(1)).toBe(true);
  });

  it('refuse au-delà de la limite', () => {
    limiter.allow(1);
    limiter.allow(1);
    limiter.allow(1);
    expect(limiter.allow(1)).toBe(false);
  });

  it('compte séparément par userId', () => {
    limiter.allow(1);
    limiter.allow(1);
    limiter.allow(1);
    expect(limiter.allow(1)).toBe(false);
    expect(limiter.allow(2)).toBe(true);
  });

  it("clear vide le bucket d'un user", () => {
    limiter.allow(1);
    limiter.allow(1);
    limiter.allow(1);
    expect(limiter.allow(1)).toBe(false);
    limiter.clear(1);
    expect(limiter.allow(1)).toBe(true);
  });

  it('reset vide tous les buckets', () => {
    limiter.allow(1);
    limiter.allow(2);
    limiter.reset();
    expect(limiter.allow(1)).toBe(true);
    expect(limiter.allow(2)).toBe(true);
  });

  it('respecte la fenêtre glissante de 60s', () => {
    const realNow = Date.now;
    const t0 = 1_000_000;
    let now = t0;
    Date.now = () => now;
    try {
      const l = new WsRateLimiter(2);
      l.allow(1); // t0
      l.allow(1); // t0
      expect(l.allow(1)).toBe(false); // toujours dans la fenêtre

      now = t0 + 61_000; // 61s plus tard → tout est ré-autorisé
      expect(l.allow(1)).toBe(true);
    } finally {
      Date.now = realNow;
    }
  });
});
