import assert from 'node:assert/strict';
import {
  extractDouyinLink,
  publicHttpsUrl,
  originalVideoUrl,
  normaliseComment,
  curatedComments,
  sealSecret,
  openSecret,
  modelProfile,
} from '../lib/capability-protocol.ts';

let checks = 0;
function check(name, test) {
  test();
  checks++;
  console.log('PASS ' + name);
}
check('share text resolves only allowed Douyin video links', () => {
  assert.equal(
    extractDouyinLink('分享 https://v.douyin.com/Xrt2L5JgtAA/').url,
    'https://v.douyin.com/Xrt2L5JgtAA/',
  );
  assert.equal(
    extractDouyinLink('https://www.douyin.com/video/7685586228548291892').id,
    '7685586228548291892',
  );
});
check('rejects unrelated hosts, credentials and profile batch tasks', () => {
  for (const value of [
    'https://evil.example/video/12345678901',
    'https://www.douyin.com/user/foo',
    'https://user:pass@v.douyin.com/foo/',
    'http://v.douyin.com/foo/',
  ])
    assert.throws(() => extractDouyinLink(value));
});
check('public media URL filter', () => {
  for (const value of [
    'http://cdn.example/video',
    'https://127.0.0.1/video',
    'https://[::1]/',
    'https://a.internal/',
    'https://user:pass@cdn.example/a',
  ])
    assert.equal(publicHttpsUrl(value), false);
  assert.equal(publicHttpsUrl('https://cdn.example/video.mp4'), true);
});
check('original speech never comes from music or cover URLs', () => {
  assert.equal(
    originalVideoUrl({
      music: { play_url: { url_list: ['https://cdn.example/music.mp3'] } },
      video: { cover: { url_list: ['https://cdn.example/cover.jpg'] } },
    }),
    null,
  );
  assert.equal(
    originalVideoUrl({
      video: { play_addr: { url_list: ['https://cdn.example/video.mp4'] } },
    }),
    'https://cdn.example/video.mp4',
  );
});
check('comment text, parent linkage, dedupe and sample cap', () => {
  const parent = normaliseComment({
    cid: 'parent',
    text: '到底怎么操作？费用多少？',
    digg_count: 500,
  });
  const reply = normaliseComment(
    { cid: 'reply', text: '我也有这个实际问题', digg_count: 5 },
    'parent',
  );
  const rows = [
    parent,
    parent,
    reply,
    ...Array.from({ length: 50 }, (_, i) =>
      normaliseComment({ cid: 'c' + i, text: '赞', digg_count: i }),
    ),
  ];
  const selected = curatedComments(rows);
  assert.ok(selected.length <= 20);
  assert.equal(new Set(selected.map((c) => c.id)).size, selected.length);
  assert.ok(selected.some((c) => c.text === parent.text));
  assert.ok(selected.some((c) => c.parentId === 'parent'));
});
check('private client experience and case materials are excluded', () => {
  const data = modelProfile({
    brandName: '测试客户',
    experiencePublic: false,
    experienceStartedYear: '2000',
    evidenceUseScope: 'internal_only',
    evidenceSummary: 'private case',
    privatePhone: 'private number',
  });
  assert.deepEqual(data, { brandName: '测试客户' });
});
const master = 'a'.repeat(64),
  secret = 'dummy-test-key-not-a-real-credential';
const cipher = await sealSecret(secret, master, 'owner-a:tikhub');
assert.ok(!cipher.includes(secret));
assert.notEqual(cipher, await sealSecret(secret, master, 'owner-a:tikhub'));
assert.equal(await openSecret(cipher, master, 'owner-a:tikhub'), secret);
await assert.rejects(openSecret(cipher, master, 'owner-b:tikhub'));
await assert.rejects(openSecret(cipher, 'b'.repeat(64), 'owner-a:tikhub'));
await assert.rejects(sealSecret(secret, 'invalid', 'owner-a:tikhub'));
checks += 6;
console.log(
  `PASS ${checks} protocol/encryption checks; no external API calls.`,
);
