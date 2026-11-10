import { writeFile } from 'node:fs/promises';
import { WORKFLOW_STAGES, WORKFLOW_FEATURES } from '../components/workbench/workflow-catalog.ts';
const targetMap = { factory: 'script', learning: 'clients' };
const features = WORKFLOW_FEATURES.map(({ id, stage, name, summary, input, output, steps, boundary, target }) => ({ id, stage, name, summary, input, output, steps, boundary, target: targetMap[target] || target }));
await writeFile(new URL('./public/workflow-catalog.json', import.meta.url), JSON.stringify({ stages: WORKFLOW_STAGES, features }, null, 2));
console.log(`Workflow catalog prepared: ${features.length} original feature descriptions; historical capability claims omitted.`);
