import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { codexEnvironment } from './codex-bridge.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prefix = path.join(root, 'tools/codex');
const npm = path.join(root, 'runtime/npm/bin/npm-cli.js');
const entry = path.join(prefix, 'node_modules/@openai/codex/bin/codex.js');
const run = args => new Promise((resolve,reject) => {
  const env = codexEnvironment(); env.PATH = path.dirname(process.execPath) + path.delimiter + (env.PATH || env.Path || '');
  const child = spawn(process.execPath,args,{stdio:'inherit',shell:false,env});
  child.on('error',reject); child.on('exit',code=>code===0?resolve():reject(new Error('The command did not complete.')));
});
try {
  console.log('Install official Codex CLI 0.166.0 into this folder. Internet required.');
  await access(npm);
  await run([npm,'install','--prefix',prefix,'--registry=https://registry.npmjs.org','--ignore-scripts','--no-audit','--no-fund','--save-exact','@openai/codex@0.166.0']);
  console.log('Sign in with your own ChatGPT account in the browser. Never share or copy login files.');
  await run([entry,'login']);
  console.log('Return to the workbench: AI settings > Codex > Apply > Check connection.');
} catch { console.error('Setup not completed. Check network/system permissions, or use DeepSeek API in AI settings.'); process.exitCode=1; }
