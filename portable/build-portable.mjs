import { mkdir, readFile, writeFile, readdir, lstat, copyFile, chmod, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const HERE=path.dirname(fileURLToPath(import.meta.url)), REPO=path.dirname(HERE);
const phase=path.resolve(REPO,'../21-便携演示版-2026-11-05');
const cache=path.join(phase,'runtime-cache');
const name=process.argv[2] || 'YanguAI-Workbench-0.8.3-20261105';
if(!/^[A-Za-z0-9.-]+$/.test(name))throw new Error('Use a simple release name.');
const output=path.join(phase,'交付',name);
try{await access(output);throw new Error('Release folder already exists; choose a new name, never overwrite.');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(output,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifests=[];
async function copy(src,relative){const st=await lstat(src);if(st.isSymbolicLink())throw new Error(`Symlink not packaged: ${relative}`);if(!st.isFile())throw new Error(`Not a regular file: ${relative}`);const dest=path.join(output,relative);await mkdir(path.dirname(dest),{recursive:true});await copyFile(src,dest,constants.COPYFILE_FICLONE);const bytes=await readFile(dest);manifests.push({path:relative,bytes:bytes.length,sha256:sha(bytes)});}
async function tree(src,relative){for(const entry of await readdir(src,{withFileTypes:true})){if(['node_modules','.git','.codex','tools','sessions','.openai','.wrangler','dist','releases','test-output'].includes(entry.name))continue;if(/^(?:\.env|\.dev\.vars|\.DS_Store)/.test(entry.name)||/\.(?:log|sqlite|db|pem|key)$/.test(entry.name))continue;const from=path.join(src,entry.name),to=path.join(relative,entry.name);if(entry.isDirectory())await tree(from,to);else await copy(from,to);}}
async function generated(relative,content,mode){const dest=path.join(output,relative);await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,content);if(mode)await chmod(dest,mode);const bytes=await readFile(dest);manifests.push({path:relative,bytes:bytes.length,sha256:sha(bytes)});}
const runtimeManifest=JSON.parse(await readFile(path.join(cache,'runtime-manifest.json'),'utf8'));
const platformDirs={'darwin-arm64':'macos-arm64','darwin-x64':'macos-x64','win-x64':'windows-x64'};
for(const runtime of runtimeManifest.runtimes){const src=path.join(cache,runtime.path);if(sha(await readFile(src))!==runtime.sha256)throw new Error('Runtime checksum mismatch');const dirname=platformDirs[runtime.platform],filename=runtime.platform==='win-x64'?'node.exe':'node';await copy(src,`runtime/${dirname}/${filename}`);await copy(path.join(cache,runtime.licensePath),`runtime/${dirname}/LICENSE`);if(filename==='node')await chmod(path.join(output,`runtime/${dirname}/node`),0o755);}
// npm's own node_modules are its bundled, platform-independent dependencies.
async function npmTree(src,relative){for(const entry of await readdir(src,{withFileTypes:true})){const from=path.join(src,entry.name),to=path.join(relative,entry.name);if(entry.isDirectory())await npmTree(from,to);else await copy(from,to);}}
await npmTree(path.join(cache,'npm'),'runtime/npm');
await copy(path.join(cache,'runtime-manifest.json'),'runtime/runtime-manifest.json');
await copy(path.join(cache,'npm-manifest.json'),'runtime/npm-manifest.json');
await generated('runtime/windows-x64/npm.cmd','@echo off\r\n"%~dp0node.exe" "%~dp0..\\npm\\bin\\npm-cli.js" %*\r\n');
await generated('runtime/windows-x64/npx.cmd','@echo off\r\n"%~dp0node.exe" "%~dp0..\\npm\\bin\\npx-cli.js" %*\r\n');
for(const file of ['server.mjs','prompts.mjs','editorial-methods.mjs','content-knowledge.mjs','THIRD_PARTY_NOTICES.txt','self-check.mjs','codex-bridge.mjs','deepseek-provider.mjs','install-codex.mjs'])await copy(path.join(HERE,file),`app/${file}`);
await tree(path.join(HERE,'public'),'app/public');await tree(path.join(HERE,'test'),'app/test');
await generated('app/package.json',JSON.stringify({name:'yangu-ai-portable',private:true,version:'0.8.3',type:'module',scripts:{start:'node server.mjs',test:'node --test test/*.test.mjs'}},null,2));
for(const file of ['Start-Mac.command','Start-Windows.cmd','Check-Windows.cmd','Dev-Windows.cmd','Install-Codex-Windows.cmd','Install-Codex-Mac.command','先读我.html','演示入口.html']){let bytes=await readFile(path.join(HERE,file),'utf8');if(file.endsWith('.cmd'))bytes=bytes.replace(/\r?\n/g,'\r\n');await generated(file,bytes,file.endsWith('.command')?0o755:undefined);}
for(const dir of ['app','components','db','drizzle','hooks','lib','public','scripts','docs','portable'])await tree(path.join(REPO,dir),`source/web-v1/${dir}`);
for(const file of ['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','next.config.ts','vite.config.ts','drizzle.config.ts','tsconfig.json','components.json','cloudflare-env.d.ts','.gitignore'])await copy(path.join(REPO,file),`source/web-v1/${file}`);
await generated('source/工程说明.txt','app/ 是当前独立便携版源码；source/web-v1/ 是原版完整业务工程快照，包含便携构建目标 portable/。\n不含凭据、登录信息、数据库、Git 历史、依赖缓存与部署身份。原站开发需要按 pnpm-lock.yaml 重新安装依赖、配置云端服务。\n此目录是交付快照，后续正式迭代仍以主项目 web-v1 为准，不自动双向同步。\n');
for(const file of manifests.filter(x=>/\.(?:js|mjs|ts|tsx|json|html|txt|yaml)$/.test(x.path)&&!x.path.startsWith('runtime/'))){const content=await readFile(path.join(output,file.path),'utf8');if(/sk-(?:proj-)?[A-Za-z0-9_-]{45,}/.test(content)||/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(content))throw new Error(`Potential secret in ${file.path}; package stopped.`);}
await generated('MANIFEST.json',JSON.stringify({name,version:'0.8.3',generatedAt:new Date().toISOString(),runtime:'Node v24.22.2',scope:'Personal local demo; no production tenant isolation',verification:{realCodex:'see current local validation report; no Windows execution claimed',realDeepSeek:'pending user key; mock tests only',realOpenAI:'not tested; optional mode',windowsExecution:'not tested on Windows',macArmExecution:'see local validation report'},files:manifests},null,2));
execFileSync('/usr/bin/zip',['-q','-r',`${name}.zip`,name],{cwd:path.dirname(output),stdio:'pipe'});
console.log(JSON.stringify({folder:output,archive:`${output}.zip`,files:manifests.length},null,2));
