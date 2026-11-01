'use strict';

// Integration tests may only talk to the local test server. Any outbound
// fetch to a non-loopback host (e.g. an AI provider) throws instead of
// leaving the machine, and is recorded so suites can assert none happened.
// A suite may register an in-process mock for a host; mocked requests are
// recorded too and still never leave the machine.
const blockedRequests = [];
const mockedRequests = [];
const mocks = new Map();
const realFetch = global.fetch;
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

global.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (LOOPBACK.has(url.hostname)) return realFetch(input, init);
  const mock = mocks.get(url.hostname);
  if (mock) {
    mockedRequests.push({ host: url.hostname, body: init && init.body ? JSON.parse(init.body) : null });
    return mock(url, init);
  }
  blockedRequests.push(url.hostname);
  throw new Error(`External network access is blocked in integration tests (${url.hostname})`);
};

const mockHost = (hostname, responder) => mocks.set(hostname, responder);
const clearMocks = () => mocks.clear();

module.exports = { blockedRequests, mockedRequests, mockHost, clearMocks };
