import { afterEach, describe, expect, it, vi } from 'vitest';
import { KEEP_ALIVE_INTERVAL_MS, startKeepAlive } from '../src/jobs/keepAlive';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('keep-alive job', () => {
  it('does nothing without a public URL (local development and tests)', () => {
    expect(startKeepAlive(undefined)).toBeUndefined();
  });

  it("pings the service's health check every 14 minutes until stopped", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const stop = startKeepAlive('https://example.onrender.com/');
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(KEEP_ALIVE_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://example.onrender.com/api/v1/health');

    await vi.advanceTimersByTimeAsync(KEEP_ALIVE_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    stop?.();
    await vi.advanceTimersByTimeAsync(KEEP_ALIVE_INTERVAL_MS * 3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps running when a ping fails', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const stop = startKeepAlive('https://example.onrender.com');
    await vi.advanceTimersByTimeAsync(KEEP_ALIVE_INTERVAL_MS * 2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    stop?.();
  });
});
