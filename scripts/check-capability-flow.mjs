// Deterministic service simulation. Never contacts TikHub, Bailian or any website.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import vm from 'node:vm';
import ts from 'typescript';
const database = new DatabaseSync(':memory:');
database.exec(
  readFileSync(
    new URL('../drizzle/0002_youthful_jane_foster.sql', import.meta.url),
    'utf8',
  ),
);
const DB = {
  prepare(sql) {
    return {
      bind(...values) {
        const statement = database.prepare(sql);
        return {
          async run() {
            return {
              meta: { changes: Number(statement.run(...values).changes) },
            };
          },
          async first() {
            return statement.get(...values) ?? null;
          },
          async all() {
            return { results: statement.all(...values) };
          },
        };
      },
    };
  },
};
const requests = [];
let duration = 120000;
const context = vm.createContext({
  crypto,
  TextEncoder,
  TextDecoder,
  URL,
  URLSearchParams,
  Request,
  Response,
  AbortSignal,
  btoa,
  atob,
  console,
  fetch: async (url, options = {}) => {
    requests.push({ url, options });
    let payload;
    if (url.includes('fetch_one_video'))
      payload = {
        code: 200,
        data: {
          aweme_detail: {
            aweme_id: '7685586228548291892',
            desc: '模拟作品，不是真实采集',
            video: {
              duration: 120000,
              play_addr: { url_list: ['https://media.example/original.mp4'] },
            },
          },
        },
      };
    else if (url.includes('fetch_video_comments'))
      payload = {
        code: 200,
        data: {
          comments: [
            {
              cid: 'comment-a',
              text: '如何降低真实制作费用？',
              digg_count: 12,
            },
          ],
          has_more: false,
        },
      };
    else if (url.includes('/audio/asr/transcription'))
      payload = { output: { task_id: 'fixture-asr-1' } };
    else if (url.includes('/api/v1/tasks/'))
      payload = {
        output: {
          task_status: 'SUCCEEDED',
          results: [
            {
              subtask_status: 'SUCCEEDED',
              transcription_url: 'https://fixture.aliyuncs.com/transcript.json',
            },
          ],
        },
      };
    else if (url.includes('fixture.aliyuncs.com')) {
      assert.ok(!options.headers?.Authorization);
      payload = {
        properties: { original_duration_in_milliseconds: duration },
        transcripts: [
          { text: '这是原始口播的完整模拟文案，需要保留到后续写稿。' },
        ],
      };
    } else if (url.includes('text-generation/generation'))
      payload = {
        output: {
          choices: [{ message: { content: '模拟行业研究 [ref_1]' } }],
          search_info: {
            search_results: [
              { title: '示例来源', url: 'https://source.example/article' },
            ],
          },
        },
      };
    else if (url.includes('/chat/completions'))
      payload = {
        choices: [{ message: { content: '模拟分析或脚本；不是客户成品。' } }],
      };
    else throw new Error('Unexpected external route: ' + url);
    return Response.json(payload);
  },
});
const compile = (path) =>
  new vm.SourceTextModule(
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText,
    { context },
  );
const protocol = compile('../lib/capability-protocol.ts');
await protocol.link(() => {
  throw Error('Unexpected protocol import');
});
await protocol.evaluate();
const env = {
  DB,
  WORKBENCH_SECRET_KEY: 'a'.repeat(64),
  WORKBENCH_ADMIN_EMAIL: 'fixture@example.com',
};
const fixtures = {
  'cloudflare:workers': { env },
  '@/app/chatgpt-auth': {
    getChatGPTUser: async () => ({
      userId: 'fixture-owner',
      email: 'fixture@example.com',
    }),
  },
  '@/lib/client-profiles-db': {
    findClientProfileRow: async (id, owner) =>
      id === 'own-profile' && owner === 'fixture-owner'
        ? {
            id,
            profile_version: 2,
            profile_json: JSON.stringify({
              brandName: '模拟客户',
              industry: '企业服务',
              experiencePublic: false,
              evidenceSummary: '不应发送的内部案例',
              evidenceUseScope: 'internal_only',
            }),
          }
        : null,
  },
};
const server = compile('../lib/capability-server.ts');
await server.link((specifier) => {
  if (specifier === '@/lib/capability-protocol') return protocol;
  const values = fixtures[specifier];
  assert.ok(values, specifier);
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
const { execute, saveCredential, state } = server.namespace;
const owner = 'fixture-owner';
await saveCredential(owner, {
  provider: 'tikhub',
  key: 'dummy-tikhub-fixture',
});
await saveCredential(owner, {
  provider: 'bailian',
  key: 'dummy-bailian-fixture',
});
const run = (action, extra = {}) =>
  execute(owner, {
    action,
    requestId: crypto.randomUUID(),
    processingConsent: true,
    ...extra,
  });
const collect = await run('collect', {
  url: 'https://www.douyin.com/video/7685586228548291892',
});
assert.equal(collect.result.comments.length, 1);
assert.ok(!JSON.stringify(collect).includes('media.example'));
const beforeBlocked = requests.length;
await assert.rejects(run('script', { sourceRunId: collect.id }), /真实原文/);
assert.equal(requests.length, beforeBlocked);
const asr = await run('transcribe', { sourceRunId: collect.id });
assert.equal(asr.status, 'waiting');
const beforeDuplicate = requests.length;
assert.equal((await run('transcribe', { sourceRunId: collect.id })).id, asr.id);
assert.equal(requests.length, beforeDuplicate);
const text = await run('asr_poll', { sourceRunId: asr.id });
assert.equal(text.result.transcriptReady, true);
const analysis = await run('analyze', { sourceRunId: text.id });
const script = await run('script', {
  sourceRunId: analysis.id,
  profileId: 'own-profile',
});
assert.equal(script.result.profileVersion, 2);
const scriptBody = requests.at(-1).options.body;
assert.ok(scriptBody.includes('这是原始口播的完整模拟文案'));
assert.ok(scriptBody.includes('如何降低真实制作费用'));
assert.ok(!scriptBody.includes('不应发送的内部案例'));
const search = await run('search', { instructions: '模拟行业问题' });
const sourcedScript = await run('script', { sourceRunId: search.id });
assert.equal(
  sourcedScript.result.sources[0].url,
  'https://source.example/article',
);
duration = 40000;
const partial = await run('asr_poll', { sourceRunId: asr.id });
assert.equal(partial.result.transcriptReady, false);
const beforePartial = requests.length;
await assert.rejects(run('analyze', { sourceRunId: partial.id }), /时长校验/);
await assert.rejects(run('script', { sourceRunId: partial.id }), /真实原文/);
assert.equal(requests.length, beforePartial);
assert.equal((await state('another-owner')).history.length, 0);
assert.ok(
  !JSON.stringify(await state(owner)).includes('dummy-bailian-fixture'),
);
console.log(
  'PASS simulated link → comments → ASR → analysis → profile-aware script; source retention, transcript gates, duplicate ASR, owner isolation. No live-provider verification.',
);
database.close();
