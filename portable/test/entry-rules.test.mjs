import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { promptFor, SCHEMAS } from '../prompts.mjs';
import { ENTRY_RULES } from '../editorial-methods.mjs';

// Prompt wiring regression only; passing does not prove the quality of model output.
test('topic and script calls share audience, entry, and unfilmed-material boundaries', () => {
  for (const action of ['topics', 'script']) {
    const input = { profile: { industry: '美甲', audience: '到店消费者' }, genre: '干货', count: 7, seconds: 90, topic: '消费者已选问题' };
    for (const editorialDraft of [undefined, { fixture: 'machine draft' }]) {
      const prompt = promptFor(action, { ...input, editorialDraft });
      assert.ok(prompt.includes(ENTRY_RULES));
      assert.match(prompt, /没读过标题的人/);
      assert.match(prompt, /没有真实展示素材/);
      assert.match(prompt, /不能为了覆盖更多人擅自/);
      if (action === 'topics') assert.match(prompt, /恰好7个/);
      if (action === 'script') assert.match(prompt, /消费者已选问题/);
    }
  }
  assert.deepEqual(SCHEMAS.topics.properties.topics.items.properties.genre.enum, ['干货', '观点', '故事', '记录过程']);
});

test('entry editing rules do not change profile autofill or evidence analysis', () => {
  for (const action of ['profile-suggest', 'analyze']) {
    assert.equal(promptFor(action, { profile: { industry: '美甲' } }).includes(ENTRY_RULES), false);
  }
});

test('pending tasks lock script request fields; displayed genre comes from the saved result', async () => {
  const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const selector = source.match(/const locked = \[\.\.\.document\.querySelectorAll\('([^']+)'\)/)?.[1];
  assert.ok(selector?.includes('#view-script .form-card textarea'));
  assert.ok(selector?.includes('#view-script .form-card select'));
  assert.ok(selector?.includes('.topic-write'));
  assert.match(source, /record\.result\?\.genre \? record\.result\.genre/);
});
