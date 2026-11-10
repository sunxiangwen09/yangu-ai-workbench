import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYSTEM, SCHEMAS, promptFor } from './prompts.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export class CodexError extends Error {
  constructor(message, code = 'codex_unavailable', status = 409) { super(message); this.code = code; this.status = status; }
}
// Do not forward API credentials or unrelated application secrets to the child.
export function codexEnvironment(source = process.env) {
  const env = {};
  for (const key of ['PATH','Path','HOME','USERPROFILE','APPDATA','LOCALAPPDATA','SystemRoot','WINDIR','TEMP','TMP','TMPDIR','LANG','LC_ALL','CODEX_HOME','HTTPS_PROXY','HTTP_PROXY','ALL_PROXY','NO_PROXY','SSL_CERT_FILE']) {
    if (source[key]) env[key] = source[key];
  }
  return env;
}
export async function locateCodex() {
  const executable = process.platform === 'win32' ? 'codex.exe' : 'codex';
  const candidates = [];
  if (process.env.YANGU_CODEX_BIN && path.isAbsolute(process.env.YANGU_CODEX_BIN)) candidates.push(process.env.YANGU_CODEX_BIN);
  for (const dir of (process.env.PATH || process.env.Path || '').split(path.delimiter).filter(Boolean)) candidates.push(path.join(dir, executable));
  if (process.platform === 'darwin') candidates.push(
    '/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex',
    '/Applications/Codex.app/Contents/Resources/codex',
    path.join(homedir(), '.local/bin/codex'), '/opt/homebrew/bin/codex', '/usr/local/bin/codex');
  for (const entry of candidates) {
    if (/\.(cmd|bat)$/i.test(entry)) continue;
    try { await access(entry, constants.X_OK); return { command: entry, prefix: [] }; } catch {}
  }
  const scripts = [path.resolve(HERE, '../tools/codex/node_modules/@openai/codex/bin/codex.js')];
  if (process.env.APPDATA) scripts.push(path.join(process.env.APPDATA, 'npm/node_modules/@openai/codex/bin/codex.js'));
  for (const dir of (process.env.PATH || process.env.Path || '').split(path.delimiter).filter(Boolean)) scripts.push(path.join(dir, 'node_modules/@openai/codex/bin/codex.js'));
  for (const entry of scripts) { try { await access(entry); return { command: process.execPath, prefix: [entry] }; } catch {} }
  throw new CodexError('未找到 Codex。请先运行文件夹内的 Install-Codex 安装入口并登录，然后重新检查。', 'codex_not_installed');
}
export function runProcess(target, args, { input = '', timeout = 15000, cwd, signal, maxBytes = 3 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(target.command, [...target.prefix, ...args], { cwd, env: codexEnvironment(), shell: false, detached: process.platform !== 'win32', windowsHide: true, stdio: ['pipe','pipe','pipe'] });
    let stdout = '', stderr = '', bytes = 0, done = false;
    const finish = (error, value) => { if (done) return; done = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); error ? reject(error) : resolve(value); };
    const stop = error => {
      if (child.pid) {
        if (process.platform === 'win32') {
          const killer = spawn(path.join(process.env.SystemRoot || 'C:\\Windows','System32/taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], {shell:false,windowsHide:true,stdio:'ignore'});
          killer.on('error',()=>child.kill());
        } else { try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill(); } }
      }
      finish(error);
    };
    const abort = () => stop(new CodexError('任务已停止，没有自动重试。', 'codex_cancelled', 499));
    const timer = setTimeout(() => stop(new CodexError('Codex 处理超时。未自动重试，请查看历史后再试。', 'codex_timeout', 504)), timeout);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    child.on('error', () => finish(new CodexError('无法启动 Codex，请检查安装或重新登录。', 'codex_start_failed')));
    for (const [stream, name] of [[child.stdout,'stdout'], [child.stderr,'stderr']]) stream.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > maxBytes) return stop(new CodexError('Codex 返回数据过多，任务已停止。', 'codex_output_limit', 502));
      if (name === 'stdout') stdout += chunk.toString(); else stderr += chunk.toString();
    });
    child.on('close', code => finish(null, { code, stdout, stderr }));
    child.stdin.on('error', () => {}); child.stdin.end(input);
  });
}
export async function checkCodex() {
  try {
    const target = await locateCodex();
    const version = await runProcess(target, ['--version']);
    const auth = await runProcess(target, ['login','status']);
    const loggedIn = auth.code === 0 && /Logged in using ChatGPT/i.test(auth.stdout + auth.stderr);
    const help = await runProcess(target, ['exec','--help']);
    const supported = ['--ignore-user-config','--ephemeral','--output-schema'].every(flag => help.stdout.includes(flag));
    return { installed: true, loggedIn, supported, ready: loggedIn && supported, version: (version.stdout.match(/codex-cli\s+[\w.+-]+/) || [])[0] || 'Codex', note: !supported ? 'Codex 版本不兼容，请用安装入口升级。' : !loggedIn ? '请先在本机 Codex 中使用 ChatGPT 账号登录；API 密钥登录不用于此模式。' : '已连接本机 Codex；生成内容使用该 ChatGPT 账号的 Codex 额度。' };
  } catch (error) { return { installed: false, loggedIn: false, supported: false, ready: false, note: error instanceof CodexError ? error.message : 'Codex 检查失败，请重新检查。' }; }
}
export function codexArgs(schemaPath, outputPath, directory) {
  return ['exec', '--ignore-user-config', '--ephemeral', '--skip-git-repo-check', '--sandbox','read-only', '--cd',directory,
    '-c','approval_policy="never"', '-c','features.shell_tool=false', '-c','features.apply_patch_freeform=false', '-c','features.apps=false',
    '-c','features.plugins=false', '-c','features.hooks=false', '-c','features.multi_agent=false', '-c','features.browser_use=false', '-c','features.computer_use=false',
    '-c','features.view_image=false', '-c','features.goals=false', '-c','apps._default.enabled=false',
    '-c','web_search="disabled"', '-c','model_provider="openai"', '-c','forced_login_method="chatgpt"',
    '--output-schema', schemaPath, '--output-last-message', outputPath, '--json', '--color','never','-'];
}
export function adaptCodexOutput(output, events, action) {
  let completed = false;
  for (const line of events.split('\n')) {
    if (!line.trim()) continue;
    let event; try { event = JSON.parse(line); } catch { continue; }
    // A recoverable stream warning may precede a successful completed turn.
    if (event.type === 'turn.failed') throw new CodexError('Codex 未完成任务。请检查登录、网络或套餐用量后再试；未自动切换 API。', 'codex_turn_failed', 502);
    if (event.type === 'item.completed' && ['command_execution','file_change','mcp_tool_call'].includes(event.item?.type)) throw new CodexError('本次出现了不属于文字生成的操作，结果已拒收。', 'codex_unexpected_tool', 502);
    if (event.type === 'turn.completed') completed = true;
  }
  if (!completed) throw new CodexError('Codex 没有返回完整结果，未保存为成品。', 'codex_incomplete', 502);
  let value; try { value = JSON.parse(output); } catch { throw new CodexError('Codex 返回格式不完整，请保留输入后重试。', 'codex_invalid_json', 502); }
  validateSchema(value, SCHEMAS[action]);
  return { status: 'completed', model: 'Codex · ChatGPT 登录', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] };
}
export function validateSchema(value, schema) {
  const fail = () => { throw new CodexError('Codex 返回内容缺少必要字段，未保存为成品。', 'codex_invalid_shape', 502); };
  if (schema.type === 'string' && (typeof value !== 'string' || (schema.enum && !schema.enum.includes(value)))) fail();
  if (schema.type === 'array') { if (!Array.isArray(value)) fail(); value.forEach(item => validateSchema(item, schema.items)); }
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
    if (schema.required.some(key => !Object.hasOwn(value, key))) fail();
    for (const key of Object.keys(value)) { if (!schema.properties[key]) fail(); validateSchema(value[key], schema.properties[key]); }
  }
}
export async function generateWithCodex(action, input, { signal, observe } = {}) {
  if (input.webSearch) throw new CodexError('Codex 本机模式目前按业务资料策划选题，尚未接入可核验的联网来源。请关闭“联网找依据”，或手动选择 API 模式。', 'codex_search_unavailable');
  const status = await checkCodex();
  if (!status.ready) throw new CodexError(status.note, 'codex_login_required');
  const target = await locateCodex();
  const directory = await mkdtemp(path.join(tmpdir(), 'yangu-codex-'));
  try {
    const schemaPath = path.join(directory, 'schema.json'), outputPath = path.join(directory, 'result.json');
    await writeFile(schemaPath, JSON.stringify(SCHEMAS[action]), { mode: 0o600 });
    const stdin = `${SYSTEM}\n这是纯文字策划任务，不使用文件、命令、插件或外部工具，不读取本机资料。不继承其他会话。只按结构返回最终结果。\n${promptFor(action, input)}`;
    observe?.('模型请求', { stdin, schema: SCHEMAS[action], skillVisibility: '插件关闭；CLI 事件未提供可核验的逐 Skill 记录' });
    const run = await runProcess(target, codexArgs(schemaPath, outputPath, directory), { cwd: directory, signal, timeout: 300000, input: stdin });
    if (observe) {
      const tools = [];
      for (const line of run.stdout.split('\n')) {
        let event;
        try { event = JSON.parse(line); } catch { continue; }
        const item = event.item;
        if (['command_execution', 'file_change', 'mcp_tool_call', 'web_search', 'collab_tool_call'].includes(item?.type)) {
          tools.push({ event: event.type, id: item.id, type: item.type, server: item.server, tool: item.tool, status: item.status });
        }
      }
      observe('Codex 可见工具事件', { tools, exitCode: run.code });
    }
    if (run.code !== 0) throw new CodexError('Codex 调用未成功。请检查本机 Codex 的登录、网络和套餐用量；未自动重试或切换 API。', 'codex_exec_failed', 502);
    let output; try { output = await readFile(outputPath, 'utf8'); } catch { throw new CodexError('Codex 未返回结果文件。', 'codex_missing_output', 502); }
    observe?.('模型原始正文', { output });
    return adaptCodexOutput(output, run.stdout, action);
  } finally { await rm(directory, { recursive: true, force: true }); }
}
