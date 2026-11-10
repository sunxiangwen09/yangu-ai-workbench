// Local preview only. Uses a disposable test credential, never a real provider call.
import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:3100';
const cookie = '__sites_local_auth=1';
const headers = {
  Cookie: cookie,
  Origin: base,
  'Content-Type': 'application/json',
};
async function post(body, override = {}) {
  return fetch(base + '/api/capabilities', {
    method: 'POST',
    headers: { ...headers, ...override },
    body: JSON.stringify(body),
    redirect: 'manual',
  });
}
const anonymous = await fetch(base + '/api/capabilities', {
  redirect: 'manual',
});
assert.ok([401, 307, 302].includes(anonymous.status));
const initialResponse = await fetch(base + '/api/capabilities', {
  headers: { Cookie: cookie },
});
assert.equal(initialResponse.status, 200);
const initial = await initialResponse.json();
assert.equal(initial.secureStorageReady, true);
assert.equal(
  initial.credentials.length,
  0,
  'Do not touch an existing local credential.',
);
assert.equal(
  (
    await post(
      {
        action: 'configure',
        provider: 'tikhub',
        key: 'dummy-only-test-credential',
      },
      { Origin: 'https://untrusted.example' },
    )
  ).status,
  403,
);
const missing = await post({
  action: 'collect',
  requestId: crypto.randomUUID(),
  processingConsent: true,
  url: 'https://v.douyin.com/Xrt2L5JgtAA/',
});
assert.equal(missing.status, 409);
assert.match((await missing.json()).error, /尚未配置/);
assert.equal(
  (
    await post({
      action: 'configure',
      provider: 'tikhub',
      key: 'dummy-only-test-credential',
    })
  ).status,
  200,
);
try {
  const visible = await fetch(base + '/api/capabilities', {
    headers: { Cookie: cookie },
  });
  const text = await visible.text();
  assert.ok(!text.includes('dummy-only-test-credential'));
  assert.ok(!text.includes('encrypted_secret'));
  assert.equal(JSON.parse(text).credentials[0].provider, 'tikhub');
  const invalid = await post({
    action: 'collect',
    requestId: crypto.randomUUID(),
    processingConsent: true,
    url: 'https://untrusted.example/',
  });
  assert.equal(invalid.status, 400);
  const otherOwner = await post({
    action: 'collect',
    requestId: crypto.randomUUID(),
    processingConsent: true,
    url: 'https://v.douyin.com/Xrt2L5JgtAA/',
    sourceRunId: 'another-users-nonexistent-run',
  });
  assert.equal(otherOwner.status, 404);
  const noConsent = await post({
    action: 'collect',
    requestId: crypto.randomUUID(),
    processingConsent: false,
    url: 'https://v.douyin.com/Xrt2L5JgtAA/',
  });
  assert.equal(noConsent.status, 400);
} finally {
  assert.equal(
    (await post({ action: 'configure', provider: 'tikhub', remove: true }))
      .status,
    200,
  );
}
const final = await (
  await fetch(base + '/api/capabilities', { headers: { Cookie: cookie } })
).json();
assert.equal(final.credentials.length, 0);
assert.equal(
  final.history.length,
  initial.history.length,
  'Validation failures must not create paid runs.',
);
console.log(
  'PASS local HTTP: auth, cross-origin rejection, missing-key stop, encrypted credential DTO, invalid URL, owner-scoped source lookup, consent, fixture cleanup. No provider requests submitted.',
);
