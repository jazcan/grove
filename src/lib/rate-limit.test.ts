import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rateLimit, clientKey } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to max requests in window", () => {
    const key = `t-${Math.random()}`;
    expect(rateLimit(key, 3, 60_000)).toEqual({ ok: true });
    expect(rateLimit(key, 3, 60_000)).toEqual({ ok: true });
    expect(rateLimit(key, 3, 60_000)).toEqual({ ok: true });
    const fourth = rateLimit(key, 3, 60_000);
    expect(fourth.ok).toBe(false);
    if (!fourth.ok) {
      expect(fourth.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("resets after window elapses", () => {
    const key = `w-${Math.random()}`;
    expect(rateLimit(key, 1, 1000)).toEqual({ ok: true });
    expect(rateLimit(key, 1, 1000).ok).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(rateLimit(key, 1, 1000)).toEqual({ ok: true });
  });
});

describe("clientKey", () => {
  it("joins ip and suffix", () => {
    expect(clientKey("1.2.3.4", "login")).toBe("1.2.3.4:login");
    expect(clientKey(undefined, "login")).toBe("unknown:login");
  });
});
