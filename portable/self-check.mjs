import { createApp } from './server.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'yangu-self-check-'));
let app;
try {
  console.log(`Runtime: ${process.version}; OS: ${process.platform}; CPU: ${process.arch}`);
  app=await createApp({dataDir:dir,port:0,fetcher:()=>{throw new Error('Self-check never calls external AI services.');}});
  for(const file of ['/','/app.js','/workspace.js','/topic-form.mjs','/styles.css','/workflow-catalog.json']) {
    const r=await fetch(app.origin+file);if(!r.ok)throw new Error(`Missing application file: ${file}`);await r.text();
  }
  const headers={'X-Yangu-Token':app.token,Origin:app.origin,'Content-Type':'application/json'};
  const saved=await fetch(app.origin+'/api/workspace',{method:'POST',headers,body:JSON.stringify({section:'self-check',fields:{title:'Temporary test only'}})});
  if(!saved.ok)throw new Error('Local data cannot be saved.');
  const state=await fetch(app.origin+'/api/workspace',{headers}).then(r=>r.json());
  if(state.workspace['self-check']?.fields.title!=='Temporary test only')throw new Error('Saved data cannot be read.');
  console.log('PASS: runtime, page assets, local HTTP, local save/read.');
  console.log('NOT TESTED: Codex/DeepSeek/OpenAI login, quota, model output, collection, editing, publishing.');
  console.log('Next: Start-Windows.cmd / Start-Mac.command, then select Codex or DeepSeek in AI settings.');
}catch(e){console.error('FAIL: '+e.message);process.exitCode=1;}
finally{if(app)await app.close();await rm(dir,{recursive:true});}
