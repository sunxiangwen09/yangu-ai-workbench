// Local-only HTTP regression check. Never send test identities to a live Site.
import assert from 'node:assert/strict';

const endpoint = 'http://localhost:3000/api/research-preferences';
const auth = { Cookie: '__sites_local_auth=1' };
const json = {
  ...auth,
  'Content-Type': 'application/json',
  Origin: 'http://localhost:3000',
};
const put = (body, headers = json) =>
  fetch(endpoint, { method: 'PUT', headers, body: JSON.stringify(body) });
let checks = 0;
async function status(promise, expected) {
  const response = await promise;
  assert.equal(response.status, expected);
  checks++;
  return response;
}

await status(fetch(endpoint), 401);
const initialResponse = await status(fetch(endpoint, { headers: auth }), 200);
assert.match(initialResponse.headers.get('cache-control'), /no-store/);
const initial = await initialResponse.json();
const input = {
  policy: { preset: 'quick', maxWorks: 10 },
  expectedRevision: initial.revision,
};
await status(put(input, { ...json, Origin: 'https://untrusted.example' }), 403);
await status(put({ ...input, ownerUserId: 'someone-else' }), 400);
await status(
  put({ ...input, policy: { preset: 'quick', maxWorks: 10000 } }),
  400,
);
await status(
  put({ ...input, policy: { preset: 'unbounded', maxWorks: 10 } }),
  400,
);
await status(put({ ...input, expectedRevision: -1 }), 400);
await status(put(input, { ...json, 'Content-Type': 'text/plain' }), 415);
let written = false;
try {
  const saved = await (await status(put(input), 200)).json();
  written = true;
  assert.equal(saved.revision, initial.revision + 1);
  // Separate request with the same identity emulates another device reading.
  const secondDevice = await (
    await status(
      fetch(endpoint, { headers: { ...auth }, cache: 'no-store' }),
      200,
    )
  ).json();
  assert.deepEqual(secondDevice.policy, input.policy);
  await status(put(input), 409);
} finally {
  if (written) {
    const current = await (await fetch(endpoint, { headers: auth })).json();
    await status(
      put({ policy: initial.policy, expectedRevision: current.revision }),
      200,
    );
  }
}
console.log(
  `${checks} local HTTP checks passed; original local policy restored.`,
);
