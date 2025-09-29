import { JSDOM } from 'jsdom';
import { renderHook, act } from '@testing-library/react';
import { describe, it, beforeAll, beforeEach, expect, vi } from 'vitest';

import type {
  useApiData as UseApiDataFn,
  clearAllCache as ClearAllCacheFn,
  getCacheStats as GetCacheStatsFn,
} from '../useApiData';
import type { ApiResponse } from '@/types';

const jsdom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://localhost',
});
const { window } = jsdom;

const copyProps = (source: Window & typeof globalThis, target: typeof globalThis) => {
  for (const key of Reflect.ownKeys(source)) {
    if (key in target) continue;
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (descriptor) {
      Object.defineProperty(target, key, descriptor);
    }
  }
};

Object.defineProperty(globalThis, 'window', {
  value: window,
  configurable: true,
  enumerable: true,
  writable: true,
});

Object.defineProperty(globalThis, 'document', {
  value: window.document,
  configurable: true,
  enumerable: true,
  writable: true,
});

Object.defineProperty(globalThis, 'navigator', {
  value: window.navigator,
  configurable: true,
  enumerable: true,
  writable: true,
});

copyProps(window, globalThis);

let useApiData: UseApiDataFn;
let clearAllCache: ClearAllCacheFn;
let getCacheStats: GetCacheStatsFn;

const createApiResponse = <T,>(data: T): ApiResponse<T> => ({
  data,
  success: true,
});

describe('useApiData caching edge cases', () => {
  beforeAll(async () => {
    const module = await import('../useApiData');
    useApiData = module.useApiData;
    clearAllCache = module.clearAllCache;
    getCacheStats = module.getCacheStats;
  });

  beforeEach(() => {
    clearAllCache();
  });

  it('reuses cached data on repeated execute calls', async () => {
    const apiCall = vi.fn(async () => createApiResponse('initial-result'));
    const { result } = renderHook(() =>
      useApiData<string>(apiCall, {
        cacheKey: 'agents-cache-test',
        immediate: false,
      })
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(apiCall).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe('initial-result');

    apiCall.mockImplementation(async () => createApiResponse('updated-result'));

    await act(async () => {
      await result.current.execute();
    });

    expect(apiCall).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe('initial-result');

    const cacheStats = getCacheStats();
    expect(cacheStats.size).toBe(1);
    expect(cacheStats.keys).toContain('agents-cache-test');
  });

  it('refresh bypasses cache and updates the stored value', async () => {
    const apiCall = vi
      .fn(async () => createApiResponse('first-load'))
      .mockImplementationOnce(async () => createApiResponse('first-load'))
      .mockImplementationOnce(async () => createApiResponse('refreshed-load'));

    const { result } = renderHook(() =>
      useApiData<string>(apiCall, {
        cacheKey: 'agents-refresh-test',
        immediate: false,
      })
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(apiCall).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe('first-load');

    await act(async () => {
      await result.current.refresh();
    });

    expect(apiCall).toHaveBeenCalledTimes(2);
    expect(result.current.data).toBe('refreshed-load');

    const cacheStats = getCacheStats();
    expect(cacheStats.size).toBe(1);
    expect(cacheStats.keys).toContain('agents-refresh-test');
  });
});
