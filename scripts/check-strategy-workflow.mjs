// Tests source modules against an isolated in-memory SQLite database.
// No network, customer data, credentials, or persistent database is used.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';

const database = new DatabaseSync(':memory:');
const context = createContext({ Response, Request, crypto, console });
let user = { userId: 'test-owner-a' };
const db = {
  prepare(sql) {
    let args = [];
    return {
      bind(...values) {
        args = values;
        return this;
      },
      async run() {
        return {
          meta: { changes: Number(database.prepare(sql).run(...args).changes) },
        };
      },
      async all() {
        return { results: database.prepare(sql).all(...args) };
      },
      async first() {
        return database.prepare(sql).get(...args) ?? null;
      },
    };
  },
  async batch(statements) {
    return Promise.all(statements.map((statement) => statement.run()));
  },
};
const files = {
  '@/lib/client-profile': 'lib/client-profile.ts',
  '@/lib/client-profiles-db': 'lib/client-profiles-db.ts',
  brief: 'lib/strategy-brief.ts',
  route: 'app/api/client-profiles/route.ts',
  catalog: 'components/workbench/workflow-catalog.ts',
};
const modules = new Map();
modules.set(
  'cloudflare:workers',
  new SyntheticModule(
    ['env'],
    function () {
      this.setExport('env', { DB: db });
    },
    { context },
  ),
);
modules.set(
  '@/app/chatgpt-auth',
  new SyntheticModule(
    ['getChatGPTUser'],
    function () {
      this.setExport('getChatGPTUser', async () => user);
    },
    { context },
  ),
);
async function load(name) {
  if (name === './client-profile') name = '@/lib/client-profile';
  if (modules.has(name)) return modules.get(name);
  assert.ok(files[name], `Unrecognized import: ${name}`);
  const source = await readFile(
    new URL(`../${files[name]}`, import.meta.url),
    'utf8',
  );
  const js = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  const sourceModule = new SourceTextModule(js, { context, identifier: name });
  modules.set(name, sourceModule);
  await sourceModule.link(load);
  return sourceModule;
}
let checks = 0;
const check = (fn) => {
  fn();
  checks++;
};
try {
  for (const name of ['route', 'brief', 'catalog'])
    await (await load(name)).evaluate();
  const { createEmptyClientProfileData } = modules.get(
    '@/lib/client-profile',
  ).namespace;
  const { buildStrategyBrief, strategyGaps } = modules.get('brief').namespace;
  const { WORKFLOW_FEATURES, WORKFLOW_STAGES } =
    modules.get('catalog').namespace;
  const route = modules.get('route').namespace;
  const data = createEmptyClientProfileData();
  data.brandName = '测试档案';
  data.voiceSample = '我先拿一个具体例子说明。';
  data.evidenceSummary = '不可公开的客户姓名';
  data.uniqueMaterial = '不可公开的内部过程';
  for (const scope of ['internal_only', 'prohibited', 'anonymous_only']) {
    data.evidenceUseScope = scope;
    const brief = buildStrategyBrief('learning', data);
    check(() =>
      assert.ok(
        !brief.includes(data.evidenceSummary) &&
          !brief.includes(data.uniqueMaterial),
      ),
    );
  }
  data.evidenceUseScope = 'content_allowed';
  check(() =>
    assert.ok(
      buildStrategyBrief('learning', data).includes(data.evidenceSummary),
    ),
  );
  check(() =>
    assert.ok(buildStrategyBrief('learning', data).includes(data.voiceSample)),
  );
  check(() =>
    assert.ok(buildStrategyBrief('business', data).includes('待本人补充')),
  );
  check(() => assert.ok(strategyGaps('business', data).includes('主产品')));
  check(() =>
    assert.equal(new Set(WORKFLOW_FEATURES.map((item) => item.id)).size, 24),
  );
  check(() =>
    assert.ok(
      WORKFLOW_STAGES.every((stage) =>
        WORKFLOW_FEATURES.some((item) => item.stage === stage.id),
      ),
    ),
  );
  const targets = new Set([
    'learning',
    'business',
    'clients',
    'research',
    'topics',
    'factory',
    'production',
    'publish',
    'analytics',
    'rules',
    'connections',
  ]);
  check(() =>
    assert.ok(
      WORKFLOW_FEATURES.every(
        (item) =>
          targets.has(item.target) &&
          item.steps.length &&
          item.boundary &&
          item.stateDetail,
      ),
    ),
  );

  const request = (body, method = 'PUT') =>
    new Request('http://isolated.test/api/client-profiles', {
      method: method === 'POST' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  user = null;
  const denied = await route.GET();
  check(() => assert.equal(denied.status, 401));
  user = { userId: 'test-owner-a' };
  const created = await route.POST(
    request({ data, status: 'in_progress' }, 'POST'),
  );
  check(() => assert.equal(created.status, 201));
  const original = (await created.json()).profile;
  const putBody = {
    id: original.id,
    expectedVersion: 1,
    data: { ...data, primaryOffer: '服务 A' },
    status: 'in_progress',
  };
  const first = await route.PUT(request(putBody));
  check(() => assert.equal(first.status, 200));
  const revision2 = (await first.json()).profile;
  check(() => assert.equal(revision2.profileVersion, 2));
  const stale = await route.PUT(
    request({ ...putBody, data: { ...data, primaryOffer: '旧页面覆盖' } }),
  );
  check(() => assert.equal(stale.status, 409));
  const missingVersion = await route.PUT(
    request({ ...putBody, expectedVersion: undefined }),
  );
  check(() => assert.equal(missingVersion.status, 400));
  const savedRead = (await (await route.GET()).json()).profiles[0];
  check(() => assert.equal(savedRead.data.primaryOffer, '服务 A'));
  check(() => assert.equal(savedRead.data.voiceSample, data.voiceSample));
  const parallel = await Promise.all([
    route.PUT(
      request({
        ...putBody,
        expectedVersion: 2,
        data: { ...savedRead.data, tone: '修改 A' },
      }),
    ),
    route.PUT(
      request({
        ...putBody,
        expectedVersion: 2,
        data: { ...savedRead.data, tone: '修改 B' },
      }),
    ),
  ]);
  check(() =>
    assert.equal(
      parallel
        .map((r) => r.status)
        .sort((a, b) => a - b)
        .join(','),
      '200,409',
    ),
  );
  const thirdRead = (await (await route.GET()).json()).profiles[0];
  check(() => assert.equal(thirdRead.profileVersion, 3));
  user = { userId: 'test-owner-b' };
  check(() =>
    assert.equal(
      database.prepare('SELECT COUNT(*) AS n FROM client_profiles').get().n,
      1,
    ),
  );
  const otherList = (await (await route.GET()).json()).profiles;
  check(() => assert.equal(otherList.length, 0));
  const otherWrite = await route.PUT(
    request({ ...putBody, expectedVersion: 3 }),
  );
  check(() => assert.equal(otherWrite.status, 404));
  console.log(
    `${checks} isolated checks passed: evidence scope, workflow catalog, draft revisions, concurrent saves, owner isolation.`,
  );
} finally {
  database.close();
}
