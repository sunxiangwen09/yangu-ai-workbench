// Isolated contract/security tests. No real browser, platform or login service is contacted.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const env = {};
let user = { userId: 'owner-a' };
let remote;
let remoteCalls = 0;
const context = vm.createContext({
  crypto,
  TextEncoder,
  TextDecoder,
  URL,
  Response,
  Request,
  AbortSignal,
  Uint8Array,
  fetch: async (url, options) => {
    remoteCalls++;
    return remote(url, options);
  },
});
function compile(path) {
  return new vm.SourceTextModule(
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText,
    { context },
  );
}
const protocol = compile('../lib/platform-connections.ts');
await protocol.link(() => {
  throw new Error('Unexpected dependency');
});
await protocol.evaluate();
const server = compile('../lib/platform-connections-server.ts');
await server.link((name) => {
  if (name === '@/lib/platform-connections') return protocol;
  const values =
    name === 'cloudflare:workers'
      ? { env }
      : { getChatGPTUser: async () => user };
  return new vm.SyntheticModule(
    Object.keys(values),
    function () {
      for (const [key, value] of Object.entries(values))
        this.setExport(key, value);
    },
    { context },
  );
});
await server.evaluate();
const p = protocol.namespace,
  s = server.namespace;
const now = Date.now(),
  session = 'fixture_session_0123456789';
const waiting = {
  ownerRef: 'owner-a',
  platform: 'douyin',
  status: 'waiting_scan',
  loginSession: {
    id: session,
    expiresAt: new Date(now + 60000).toISOString(),
    qrAvailable: true,
  },
};
assert.equal(
  p.verifiedConnection(waiting, 'owner-a', 'douyin', now).loginSession.qrPath,
  `/api/platform-connections/qr?platform=douyin&sessionId=${session}`,
);
assert.throws(() => p.verifiedConnection(waiting, 'owner-b', 'douyin', now));
assert.throws(() =>
  p.verifiedConnection(waiting, 'owner-a', 'xiaohongshu', now),
);
assert.throws(() => p.platformId('__proto__'));
assert.throws(() => p.sessionId('../other-user'));
assert.throws(() =>
  p.verifiedConnection(
    { ...waiting, status: 'connected' },
    'owner-a',
    'douyin',
    now,
  ),
);
const expired = p.verifiedConnection(
  {
    ...waiting,
    loginSession: {
      ...waiting.loginSession,
      expiresAt: new Date(now - 1).toISOString(),
    },
  },
  'owner-a',
  'douyin',
  now,
);
assert.equal(expired.status, 'expired');
assert.equal(expired.loginSession, undefined);
const connected = p.verifiedConnection(
  {
    ...waiting,
    status: 'connected',
    verifiedAt: new Date(now).toISOString(),
    accountLabel: '模拟账号',
    capabilities: {
      research: {
        status: 'available',
        verifiedAt: new Date(now).toISOString(),
      },
      publish: { status: 'available' },
    },
    cookie: 'must-never-leak',
  },
  'owner-a',
  'douyin',
  now,
);
assert.equal(connected.capabilities.research, 'available');
assert.equal(connected.capabilities.publish, 'not_verified');
assert.ok(!JSON.stringify(connected).includes('must-never-leak'));
const command = {
  action: 'start',
  platform: 'douyin',
  requestId: crypto.randomUUID(),
};
assert.equal((await s.connectionsState('owner-a')).mode, 'not_configured');
await assert.rejects(
  s.changeConnection('owner-a', command),
  (e) => e.code === 'session_service_not_configured',
);
await assert.rejects(
  s.changeConnection('owner-a', { ...command, platform: 'channels' }),
  (e) => e.code === 'platform_restricted',
);
assert.equal(remoteCalls, 0);
user = null;
await assert.rejects(s.connectionUser(), (e) => e.status === 401);
user = { userId: 'owner-a' };
await assert.rejects(
  s.connectionUser(
    new Request('https://workbench.example/api/platform-connections', {
      method: 'POST',
      headers: {
        Origin: 'https://other.example',
        'Content-Type': 'application/json',
      },
    }),
  ),
  (e) => e.status === 403,
);
env.PLATFORM_SESSION_SERVICE_URL = 'https://127.0.0.1';
env.PLATFORM_SESSION_SERVICE_KEY = 'test-secret-not-for-deployment-12345';
await assert.rejects(
  s.changeConnection('owner-a', command),
  (e) => e.code === 'session_service_config_invalid',
);
assert.equal(remoteCalls, 0);
env.PLATFORM_SESSION_SERVICE_URL = 'https://executor.example';
const owners = [];
remote = async (url, options) => {
  const owner = options.headers['X-Workbench-Owner'];
  owners.push(owner);
  if (url.endsWith('/qr'))
    return new Response(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), {
      headers: {
        'Content-Type': 'image/png',
        'X-Workbench-Owner': owner,
        'X-Login-Session': session,
      },
    });
  const platform = url.includes('xiaohongshu') ? 'xiaohongshu' : 'douyin';
  return Response.json({ ...waiting, platform, ownerRef: owner });
};
await s.changeConnection('owner-a', command);
await s.changeConnection('owner-b', command);
assert.notEqual(owners[0], owners[1]);
assert.ok(!owners[0].includes('owner-a'));
const qr = await s.connectionQr(
  'owner-a',
  `https://workbench.example/api/platform-connections/qr?platform=douyin&sessionId=${session}`,
);
assert.equal(qr.headers.get('Cache-Control'), 'no-store, private');
assert.equal(qr.headers.get('Content-Type'), 'image/png');
await assert.rejects(
  s.connectionQr(
    'owner-a',
    'https://workbench.example/api/platform-connections/qr?platform=douyin&sessionId=other_session_0123456789',
  ),
  (e) => e.code === 'qr_not_available',
);
remote = async () => Response.json(waiting); // Owner echo from another tenant is rejected.
await assert.rejects(
  s.changeConnection('owner-a', command),
  (e) => e.code === 'connection_owner_mismatch',
);
console.log(
  'PASS: platform states, expiry, independent capabilities, tenant checks, QR ownership, authentication, same-origin writes and no-provider fail-closed. All remote replies were fixtures.',
);
