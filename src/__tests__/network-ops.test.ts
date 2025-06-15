import { idempotentFetch } from '../network-ops';
import { NetworkError } from '../errors';

describe('idempotentFetch', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  const MOCK_URL = 'https://api.example.com/data';
  const MOCK_IDEMPOTENCY_KEY = 'uuid-goes-here-12345';

  it('should make a successful request on the first try', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ data: 'success' }), { status: 200 });

    const response = await idempotentFetch(MOCK_URL, {
      method: 'POST',
      idempotencyKey: MOCK_IDEMPOTENCY_KEY,
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ data: 'success' });
    expect(fetchMock.mock.calls.length).toBe(1);
    const requestOptions = fetchMock.mock.calls[0]![1];
    const requestHeaders = new Headers(requestOptions?.headers);
    expect(requestHeaders.get('Idempotency-Key')).toBe(MOCK_IDEMPOTENCY_KEY);
  });

  it('should retry on a 503 Service Unavailable and then succeed', async () => {
    fetchMock
      .mockResponseOnce('', { status: 503 })
      .mockResponseOnce(JSON.stringify({ data: 'success' }), { status: 200 });

    const response = await idempotentFetch(MOCK_URL, {
      method: 'POST',
      idempotencyKey: MOCK_IDEMPOTENCY_KEY,
      retry: { retries: 2, minTimeout: 10 },
    });

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls.length).toBe(2);
  });

  it('should throw a NetworkError after all retries fail', async () => {
    fetchMock.mockResponse('', { status: 500 });

    await expect(
      idempotentFetch(MOCK_URL, {
        method: 'POST',
        idempotencyKey: MOCK_IDEMPOTENCY_KEY,
        retry: { retries: 2, minTimeout: 10 },
      }),
    ).rejects.toThrow(NetworkError);

    expect(fetchMock.mock.calls.length).toBe(3);
  });

  it('should not retry on a 400 Bad Request client error', async () => {
    fetchMock.mockResponseOnce('', { status: 400 });

    const response = await idempotentFetch(MOCK_URL, {
      method: 'POST',
      idempotencyKey: MOCK_IDEMPOTENCY_KEY,
      retry: { retries: 2, minTimeout: 10 },
    });

    expect(response.status).toBe(400);
    expect(fetchMock.mock.calls.length).toBe(1);
  });

  it('should pass through all other fetch options', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ data: 'success' }), { status: 201 });

    const body = JSON.stringify({ key: 'value' });
    const headers = { 'Content-Type': 'application/json', 'X-Custom-Header': 'custom' };

    await idempotentFetch(MOCK_URL, {
      method: 'POST',
      idempotencyKey: MOCK_IDEMPOTENCY_KEY,
      body,
      headers,
    });

    expect(fetchMock.mock.calls.length).toBe(1);
    const requestOptions = fetchMock.mock.calls[0]![1];
    expect(requestOptions?.method).toBe('POST');
    expect(requestOptions?.body).toBe(body);
    const requestHeaders = new Headers(requestOptions?.headers);
    expect(requestHeaders.get('Content-Type')).toBe('application/json');
    expect(requestHeaders.get('X-Custom-Header')).toBe('custom');
    expect(requestHeaders.get('Idempotency-Key')).toBe(MOCK_IDEMPOTENCY_KEY);
  });
});