import 'server-only';

export type ProviderErrorCategory =
  | 'rate_limit'
  | 'timeout'
  | 'invalid_request'
  | 'empty_response'
  | 'model_unavailable'
  | 'network_error'
  | 'unknown';

type Generation = {
  textStream: AsyncIterable<string>;
  finishReason?: PromiseLike<unknown>;
};

type ReliableStreamInput = {
  modelIds: string[];
  signal?: AbortSignal;
  generate: (modelId: string, options: { attempt: number; simplified: boolean }) => Generation;
};

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? 'unknown error');
}

export function classifyProviderError(error: unknown): ProviderErrorCategory {
  const message = errorText(error).toLowerCase();
  if (/\b429\b|rate.?limit|too many requests/.test(message)) return 'rate_limit';
  if (/timeout|timed out|etimedout/.test(message)) return 'timeout';
  if (/\b400\b|\b401\b|\b403\b|invalid (api key|request|model|message)|unauthorized|forbidden/.test(message)) return 'invalid_request';
  if (/\b404\b|\b5\d\d\b|model.*(unavailable|not found)|service unavailable/.test(message)) return 'model_unavailable';
  if (/network|fetch failed|econn|enotfound|socket/.test(message)) return 'network_error';
  return 'unknown';
}

function retryAfterSeconds(error: unknown) {
  const match = errorText(error).match(/retry[- ]after\D*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function canRetry(category: ProviderErrorCategory, error: unknown) {
  if (category === 'rate_limit') {
    const seconds = retryAfterSeconds(error);
    return seconds !== null && seconds <= 5;
  }
  return category === 'empty_response' || category === 'timeout' || category === 'model_unavailable' || category === 'network_error';
}

function delayFor(attempt: number) {
  return 180 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 120);
}

/**
 * Preserves incremental text streaming while retrying only if an entire
 * generation attempt produced no text. The request signal is deliberately not
 * passed to the provider: Next can abort that signal after body consumption.
 */
export function createReliableGroqTextStream(input: ReliableStreamInput) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const plans = input.modelIds.slice(0, 2).flatMap((modelId, index) => index === 0 ? [modelId, modelId] : [modelId]);
      let fallbackUsed = false;

      for (let index = 0; index < plans.length; index += 1) {
        if (input.signal?.aborted) break;
        const modelId = plans[index];
        let textStreamed = false;
        let category: ProviderErrorCategory = 'empty_response';
        let finishReason: unknown = 'unknown';
        let lastError: unknown = new Error('empty response');

        try {
          const result = input.generate(modelId, { attempt: index + 1, simplified: index > 0 });
          for await (const text of result.textStream) {
            if (input.signal?.aborted) break;
            if (!text) continue;
            textStreamed = true;
            controller.enqueue(encoder.encode(text));
          }
          try {
          finishReason = await result.finishReason;
          } catch {
            finishReason = 'unknown';
          }
          category = textStreamed ? 'unknown' : 'empty_response';
        } catch (error) {
          lastError = error;
          category = classifyProviderError(error);
        }

        if (process.env.NODE_ENV !== 'production') {
          console.info('[Groq stream]', { model: modelId, attempt: index + 1, finishReason, providerErrorCategory: category, textStreamed, fallbackUsed });
        }
        if (textStreamed || input.signal?.aborted) break;

        if (index === 0 && canRetry(category, lastError)) {
          await new Promise((resolve) => setTimeout(resolve, delayFor(index + 1)));
          continue;
        }
        if (index === 1 && input.modelIds.length > 1 && canRetry(category, lastError)) {
          fallbackUsed = true;
          await new Promise((resolve) => setTimeout(resolve, delayFor(index + 1)));
          continue;
        }
        break;
      }
      controller.close();
    },
  });
}
