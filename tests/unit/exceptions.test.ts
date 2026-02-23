import { describe, it, expect } from 'vitest';
import {
  KakenApiError,
  KakenApiRequestError,
  KakenApiResponseError,
  KakenApiAuthError,
  KakenApiRateLimitError,
  KakenApiNotFoundError,
} from '../../src/exceptions.js';

describe('KakenApiError', () => {
  it('should be an instance of Error', () => {
    const error = new KakenApiError('test');
    expect(error).toBeInstanceOf(Error);
  });

  it('should have name "KakenApiError"', () => {
    const error = new KakenApiError('test');
    expect(error.name).toBe('KakenApiError');
  });

  it('should preserve message', () => {
    const error = new KakenApiError('test message');
    expect(error.message).toBe('test message');
  });

  it('should accept optional statusCode', () => {
    const error = new KakenApiError('test', 500);
    expect(error.statusCode).toBe(500);
  });

  it('should have undefined statusCode when not provided', () => {
    const error = new KakenApiError('test');
    expect(error.statusCode).toBeUndefined();
  });
});

describe('KakenApiRequestError', () => {
  it('should extend KakenApiError', () => {
    const error = new KakenApiRequestError('request failed');
    expect(error).toBeInstanceOf(KakenApiError);
  });

  it('should extend Error', () => {
    const error = new KakenApiRequestError('request failed');
    expect(error).toBeInstanceOf(Error);
  });

  it('should have name "KakenApiRequestError"', () => {
    const error = new KakenApiRequestError('request failed');
    expect(error.name).toBe('KakenApiRequestError');
  });

  it('should preserve message', () => {
    const error = new KakenApiRequestError('request failed');
    expect(error.message).toBe('request failed');
  });

  it('should accept optional statusCode', () => {
    const error = new KakenApiRequestError('bad request', 400);
    expect(error.statusCode).toBe(400);
  });
});

describe('KakenApiResponseError', () => {
  it('should extend KakenApiError', () => {
    const error = new KakenApiResponseError('response error');
    expect(error).toBeInstanceOf(KakenApiError);
  });

  it('should extend Error', () => {
    const error = new KakenApiResponseError('response error');
    expect(error).toBeInstanceOf(Error);
  });

  it('should have name "KakenApiResponseError"', () => {
    const error = new KakenApiResponseError('response error');
    expect(error.name).toBe('KakenApiResponseError');
  });

  it('should preserve message', () => {
    const error = new KakenApiResponseError('response error');
    expect(error.message).toBe('response error');
  });

  it('should accept optional statusCode', () => {
    const error = new KakenApiResponseError('server error', 502);
    expect(error.statusCode).toBe(502);
  });
});

describe('KakenApiAuthError', () => {
  it('should extend KakenApiError', () => {
    const error = new KakenApiAuthError('auth failed');
    expect(error).toBeInstanceOf(KakenApiError);
  });

  it('should extend Error', () => {
    const error = new KakenApiAuthError('auth failed');
    expect(error).toBeInstanceOf(Error);
  });

  it('should have name "KakenApiAuthError"', () => {
    const error = new KakenApiAuthError('auth failed');
    expect(error.name).toBe('KakenApiAuthError');
  });

  it('should preserve message', () => {
    const error = new KakenApiAuthError('auth failed');
    expect(error.message).toBe('auth failed');
  });

  it('should default statusCode to 401', () => {
    const error = new KakenApiAuthError('unauthorized');
    expect(error.statusCode).toBe(401);
  });

  it('should accept custom statusCode', () => {
    const error = new KakenApiAuthError('forbidden', 403);
    expect(error.statusCode).toBe(403);
  });
});

describe('KakenApiRateLimitError', () => {
  it('should extend KakenApiError', () => {
    const error = new KakenApiRateLimitError('rate limit exceeded');
    expect(error).toBeInstanceOf(KakenApiError);
  });

  it('should extend Error', () => {
    const error = new KakenApiRateLimitError('rate limit exceeded');
    expect(error).toBeInstanceOf(Error);
  });

  it('should have name "KakenApiRateLimitError"', () => {
    const error = new KakenApiRateLimitError('rate limit exceeded');
    expect(error.name).toBe('KakenApiRateLimitError');
  });

  it('should preserve message', () => {
    const error = new KakenApiRateLimitError('too many requests');
    expect(error.message).toBe('too many requests');
  });

  it('should default statusCode to 429', () => {
    const error = new KakenApiRateLimitError('too many requests');
    expect(error.statusCode).toBe(429);
  });

  it('should accept custom statusCode', () => {
    const error = new KakenApiRateLimitError('rate limit', 503);
    expect(error.statusCode).toBe(503);
  });
});

describe('KakenApiNotFoundError', () => {
  it('should extend KakenApiError', () => {
    const error = new KakenApiNotFoundError('not found');
    expect(error).toBeInstanceOf(KakenApiError);
  });

  it('should extend Error', () => {
    const error = new KakenApiNotFoundError('not found');
    expect(error).toBeInstanceOf(Error);
  });

  it('should have name "KakenApiNotFoundError"', () => {
    const error = new KakenApiNotFoundError('not found');
    expect(error.name).toBe('KakenApiNotFoundError');
  });

  it('should preserve message', () => {
    const error = new KakenApiNotFoundError('resource not found');
    expect(error.message).toBe('resource not found');
  });

  it('should default statusCode to 404', () => {
    const error = new KakenApiNotFoundError('not found');
    expect(error.statusCode).toBe(404);
  });

  it('should accept custom statusCode', () => {
    const error = new KakenApiNotFoundError('not found', 410);
    expect(error.statusCode).toBe(410);
  });
});
