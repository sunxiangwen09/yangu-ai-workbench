// Pure source-module regressions. No browser, credentials, network or customer data.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, createContext } from 'node:vm';
import ts from 'typescript';
const context = createContext({ URL });
async function load(file) {
  const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  const mod = new SourceTextModule(js, { context });
  await mod.link(() => {
    throw new Error('Unexpected external import');
  });
  await mod.evaluate();
  return mod.namespace;
}
const {
  extractDouyinLink,
  analysisMatchesSelection,
  claimMatchesTab,
  evidenceQuote,
  commentSelectionLabel,
} = await load('lib/research-link.ts');
const { WORKBENCH_ISSUES, auditMarkdown, VIDEO_CHECK } = await load(
  'lib/workbench-audit.ts',
);
let checks = 0;
function check(name, test) {
  test();
  checks++;
  console.log(`PASS ${name}`);
}
const url = 'https://v.douyin.com/Xrt2L5JgtAA/';
for (const input of [
  url,
  `复制此链接 ${url} 打开抖音`,
  `[${url}](${url})`,
  `${url}复制此链接`,
  `${url}, 打开抖音`,
]) {
  check(`share link ${input}`, () =>
    assert.equal(extractDouyinLink(input), url),
  );
}
for (const input of [
  'http://v.douyin.com/abc/',
  'https://v.douyin.com.evil.example/abc/',
  'https://user:pass@v.douyin.com/abc/',
  'https://v.douyin.com:8443/abc/',
  'javascript:alert(1)',
  'https://www.douyin.com/settings',
  'https://evil.example/?next=https%3A%2F%2Fv.douyin.com%2Fabc',
]) {
  check(`reject ${input}`, () => assert.equal(extractDouyinLink(input), null));
}
check('canonical work URL', () =>
  assert.equal(
    extractDouyinLink(VIDEO_CHECK.canonicalUrl),
    VIDEO_CHECK.canonicalUrl,
  ),
);
check('creator URL', () =>
  assert.equal(
    extractDouyinLink('https://www.douyin.com/user/example'),
    'https://www.douyin.com/user/example',
  ),
);
const analysis = { content_id: 'work-a', evidence_job_id: 'job-a' };
check('matching analysis allowed', () =>
  assert.equal(analysisMatchesSelection(analysis, 'job-a', 'work-a'), true),
);
check('stale content rejected', () =>
  assert.equal(analysisMatchesSelection(analysis, 'job-a', 'work-b'), false),
);
check('same content different job rejected', () =>
  assert.equal(analysisMatchesSelection(analysis, 'job-b', 'work-a'), false),
);
check('missing selection rejected', () =>
  assert.equal(analysisMatchesSelection(analysis), false),
);
check('null analysis rejected', () =>
  assert.equal(analysisMatchesSelection(null, 'job-a', 'work-a'), false),
);
check('why_hot maps to why-fire tab', () =>
  assert.equal(claimMatchesTab('why_hot', 'traffic'), true),
);
check('performance maps to why-fire tab', () =>
  assert.equal(claimMatchesTab('performance', 'traffic'), true),
);
check('acquisition not mixed into why-fire', () =>
  assert.equal(claimMatchesTab('acquisition', 'traffic'), false),
);
check('classification maps exactly', () =>
  assert.equal(claimMatchesTab('classification', 'classification'), true),
);
check('monetization maps exactly', () =>
  assert.equal(claimMatchesTab('monetization', 'monetization'), true),
);
const transcripts = [
  { transcript_id: 'same-id', raw_text: '原文', verified_text: '校对正文' },
];
const comments = [{ comment_id: 'same-id', text: '评论原句' }];
check('cross-table same ID chooses comment', () =>
  assert.equal(
    evidenceQuote(
      { evidence_type: 'comment', evidence_ref_id: 'same-id' },
      transcripts,
      comments,
    ),
    '评论原句',
  ),
);
check('transcript prefers verified text', () =>
  assert.equal(
    evidenceQuote(
      { evidence_type: 'transcript', evidence_ref_id: 'same-id' },
      transcripts,
      comments,
    ),
    '校对正文',
  ),
);
check('missing quote stays missing', () =>
  assert.equal(
    evidenceQuote(
      { evidence_type: 'comment', evidence_ref_id: 'absent' },
      transcripts,
      comments,
    ),
    null,
  ),
);
check('external evidence never takes transcript by ID', () =>
  assert.equal(
    evidenceQuote(
      { evidence_type: 'external_source', evidence_ref_id: 'same-id' },
      transcripts,
      comments,
    ),
    null,
  ),
);
check('browser comment needs no heuristic categories', () =>
  assert.equal(commentSelectionLabel({ method: 'browser_observed' }), '浏览器观察精选 · 非全站排名 · 待复核'),
);
check('missing selection stays absent', () => assert.equal(commentSelectionLabel(null), null));
check('malformed categories do not crash comment view', () =>
  assert.equal(commentSelectionLabel({ method: 'heuristic_v1', categories: 'question' }), '规则初筛：候选内互动信号 · 待复核'),
);
check('heuristic categories retain their own labels', () =>
  assert.equal(commentSelectionLabel({ categories: ['question', 4] }, () => '具体提问'), '规则初筛：具体提问 · 待复核'),
);
check('issue IDs unique', () =>
  assert.equal(
    new Set(WORKBENCH_ISSUES.map((x) => x.id)).size,
    WORKBENCH_ISSUES.length,
  ),
);
check('export contains every issue', () =>
  assert.ok(WORKBENCH_ISSUES.every((x) => auditMarkdown().includes(x.id))),
);
check('report names actual test video', () =>
  assert.ok(auditMarkdown().includes(VIDEO_CHECK.canonicalUrl)),
);
console.log(`${checks} research UI regression checks passed`);
