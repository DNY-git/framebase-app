import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiProvider } from './gemini.provider';

const REQUEST = {
  systemPrompt: 'sys',
  userPrompt: 'hi',
  groundingContext: 'data',
  maxTokens: 100,
  timeoutMs: 1000,
};

function geminiOkResponse(text = 'OK') {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] } }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 },
    }),
    text: async () => '',
  };
}

describe('GeminiProvider', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to the next model on a transient 503 and succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => JSON.stringify({ error: { message: 'high demand' } }),
        json: async () => ({}),
      })
      .mockResolvedValueOnce(geminiOkResponse('Recovered'));

    const provider = new GeminiProvider('test-key');
    const result = await provider.complete({ ...REQUEST, timeoutMs: 8000 });

    expect(result.content).toBe('Recovered');
    expect(result.model).toBe('gemini-3.1-flash-lite');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('gemini-3.5-flash');
  });

  it('fails fast on a permanent configuration error (invalid key → 400)', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: { message: 'API key not valid' } }),
      json: async () => ({}),
    });

    const provider = new GeminiProvider('bad-key');
    await expect(provider.complete(REQUEST)).rejects.toThrow(/API key not valid/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports aborted requests as actionable timeouts instead of "operation was aborted"', async () => {
    fetchMock.mockImplementation(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('This operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );

    const provider = new GeminiProvider('test-key');
    await expect(provider.complete({ ...REQUEST, timeoutMs: 60 })).rejects.toThrow(
      /timed out/i,
    );
    // The hang consumed the whole budget — no point retrying within the same request.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('honours a preferred model before the default chain', async () => {
    fetchMock.mockResolvedValue(geminiOkResponse('Preferred'));

    const provider = new GeminiProvider('test-key', 'gemini-custom-model');
    const result = await provider.complete({ ...REQUEST, timeoutMs: 8000 });

    expect(result.model).toBe('gemini-custom-model');
    expect(fetchMock.mock.calls[0][0]).toContain('gemini-custom-model');
  });
});
