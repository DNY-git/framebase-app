import { Injectable } from '@nestjs/common';
import { AiCompletionRequest, AiCompletionResponse } from '@constructtrack/types';
import { IAIProvider } from './ai-provider.interface';

/**
 * GeminiProvider — Google Gemini via the REST API (no vendor SDK).
 *
 * Uses global fetch (Node 18+) against `generateContent`. Requires
 * GEMINI_API_KEY in the environment; AiModule falls back to NoneProvider
 * when the key is absent.
 *
 * Reliability rules learned from production failures:
 *  - Model availability drifts ("no longer available", "high demand" 503s,
 *    requests that hang without responding). We therefore try a chain of
 *    current models instead of pinning a single one.
 *  - Transient failures (timeouts, 429/5xx, dead models) move on to the
 *    next model; permanent failures (invalid key → 400/403) fail fast.
 *  - Aborted requests are reported as timeouts with actionable wording,
 *    never as a bare "This operation was aborted".
 */

/** Verified-working generation models, best-first. */
const DEFAULT_MODEL_CHAIN = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 600;

interface GeminiApiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

@Injectable()
export class GeminiProvider implements IAIProvider {
  static readonly ENDPOINT =
    'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(
    private readonly apiKey: string,
    /** Optional preferred model — tried before the default chain. */
    private readonly preferredModel?: string,
  ) {}

  private modelChain(): string[] {
    const chain = this.preferredModel
      ? [this.preferredModel, ...DEFAULT_MODEL_CHAIN]
      : [...DEFAULT_MODEL_CHAIN];
    return [...new Set(chain)].slice(0, MAX_ATTEMPTS);
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const models = this.modelChain();
    const timeoutMs = request.timeoutMs ?? 15000;
    const deadline = Date.now() + timeoutMs;

    let lastError: Error = new Error('AI request failed.');
    const attempted: string[] = [];

    for (let i = 0; i < models.length; i++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      if (attempted.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }

      attempted.push(models[i]);
      try {
        return await this.completeWithModel(models[i], request, remaining);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (!this.isTransient(lastError)) throw lastError;
      }
    }

    throw new Error(
      `${lastError.message} (tried ${attempted.join(', ')})`,
    );
  }

  private async completeWithModel(
    model: string,
    request: AiCompletionRequest,
    timeoutMs: number,
  ): Promise<AiCompletionResponse> {
    const system = request.systemPrompt
      ? [{ text: request.systemPrompt }]
      : [];
    const context = request.groundingContext
      ? [{ text: request.groundingContext }]
      : [];
    const contents = [
      ...(system.length || context.length
        ? [{ role: 'system', parts: [...system, ...context] }]
        : []),
      { role: 'user', parts: [{ text: request.userPrompt }] },
    ];

    const url = `${GeminiProvider.ENDPOINT}/${model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: request.maxTokens ?? 1000,
            temperature: 0.7,
          },
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw this.httpError(res.status, detail);
      }

      const data = (await res.json()) as GeminiApiResponse;

      const content =
        data.candidates?.[0]?.content?.parts
          ?.map((part) => part.text ?? '')
          .join('')
          .trim() ?? '';

      if (!content) {
        throw new Error(`Gemini API returned an empty response from ${model}.`);
      }

      return {
        content,
        provider: 'gemini',
        model,
        inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        costCents: 0,
      };
    } catch (err) {
      if (this.isAbortError(err)) {
        // Node's undici reports timeouts as "This operation was aborted".
        // Re-raise with actionable wording and keep it retryable.
        throw new Error(
          `AI request timed out after ${Math.round(timeoutMs / 1000)}s waiting for ${model}.`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private httpError(status: number, detail: string): Error & { status?: number } {
    const error = new Error(
      `Gemini API error ${status}: ${detail.slice(0, 300)}`,
    ) as Error & { status?: number };
    error.status = status;
    return error;
  }

  private isAbortError(err: unknown): boolean {
    return (
      err instanceof Error &&
      (err.name === 'AbortError' ||
        err.name === 'TimeoutError' ||
        /operation was aborted/i.test(err.message))
    );
  }

  /**
   * Transient problems are worth retrying with another model. Permanent
   * configuration problems (bad key, blocked project) must surface
   * immediately so misconfiguration is not hidden behind retries.
   */
  private isTransient(err: Error): boolean {
    const status = (err as Error & { status?: number }).status;
    if (status === 400 || status === 401 || status === 403) return false;
    return (
      this.isAbortError(err) ||
      /timed out/i.test(err.message) ||
      /\bGemini API error (404|408|429|5\d\d)\b/.test(err.message) ||
      /empty response/i.test(err.message) ||
      /fetch failed|network|ECONNRESET|EAI_AGAIN|ENOTFOUND/i.test(err.message)
    );
  }
}
