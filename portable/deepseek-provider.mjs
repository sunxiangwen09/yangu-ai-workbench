import { SYSTEM, SCHEMAS, promptFor } from './prompts.mjs';
import { validateSchema } from './codex-bridge.mjs';
export class DeepSeekError extends Error {
  constructor(message, code = 'deepseek_error', status = 502) { super(message); this.code = code; this.status = status; }
}
export async function deepseekCall(endpoint, key, { fetcher = fetch, body, signal } = {}) {
  if (!key) throw new DeepSeekError('请在 AI 设置中填写 DeepSeek 密钥并应用。', 'deepseek_key_required', 409);
  if (!['/models','/chat/completions'].includes(endpoint)) throw new DeepSeekError('DeepSeek 接口不在允许范围内。');
  let response;
  try {
    response = await fetcher(`https://api.deepseek.com${endpoint}`, {
      method: body ? 'POST' : 'GET', redirect: 'error', headers: { Authorization: `Bearer ${key}`, ...(body ? { 'Content-Type':'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(180000)]) : AbortSignal.timeout(15000),
    });
  } catch { throw new DeepSeekError('DeepSeek 网络请求未完成。没有自动重试或切换其他通道。', 'deepseek_network'); }
  if (!response.ok) {
    await response.body?.cancel();
    const message = {401:'DeepSeek 密钥无效或已撤销。',402:'DeepSeek 余额不足，请到官方账户检查。',403:'DeepSeek 拒绝访问，请检查账号权限。',429:'DeepSeek 请求受限，请稍后再试。',400:'DeepSeek 不接受当前模型或参数，请检查模型设置。',404:'DeepSeek 模型或接口不可用。'}[response.status] || 'DeepSeek 服务暂不可用，请稍后再试。';
    throw new DeepSeekError(message, `deepseek_${response.status}`);
  }
  const chunks = []; let bytes = 0;
  try {
    for await (const chunk of response.body) { bytes += chunk.length; if (bytes > 2 * 1024 * 1024) throw new Error('large'); chunks.push(Buffer.from(chunk)); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { throw new DeepSeekError('DeepSeek 返回内容异常，未保存为成品。', 'deepseek_invalid_response'); }
}
export function adaptDeepSeek(action, raw) {
  const choice = raw.choices?.[0];
  if (choice?.finish_reason !== 'stop' || typeof choice.message?.content !== 'string' || !choice.message.content.trim()) throw new DeepSeekError('DeepSeek 输出未完成或为空，未保存为成品。', 'deepseek_incomplete');
  let value;
  try { value = JSON.parse(choice.message.content); validateSchema(value, SCHEMAS[action]); }
  catch { throw new DeepSeekError('DeepSeek 输出缺少必要字段，未保存为成品。', 'deepseek_invalid_shape'); }
  return { status:'completed', model: raw.model || 'DeepSeek', usage: { input_tokens:raw.usage?.prompt_tokens, output_tokens:raw.usage?.completion_tokens }, output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}] };
}
export async function generateWithDeepSeek(action, input, { key, model, fetcher, signal, observe }) {
  if (input.webSearch) throw new DeepSeekError('当前 DeepSeek 通道只按已提供资料策划，联网检索尚未接入。请关闭“联网找依据”。', 'deepseek_search_unavailable', 409);
  const payload = {
    model, stream:false, max_tokens:action === 'profile-suggest' ? 2000 : action === 'topics' ? Math.max(16000, (input.count ?? 6) * 1800) : 12000,
    ...(action === 'profile-suggest' ? {thinking:{type:'disabled'}} : {thinking:{type:'enabled'},reasoning_effort:'high'}), response_format:{type:'json_object'},
    messages:[{role:'system',content:`${SYSTEM}\n只输出 JSON 对象，严格满足以下 JSON Schema，不输出代码围栏或说明：${JSON.stringify(SCHEMAS[action])}`},{role:'user',content:promptFor(action,input)}],
  };
  observe?.('模型请求', { payload, tools: [], skills: [] });
  const raw = await deepseekCall('/chat/completions', key, { fetcher, signal, body: payload });
  observe?.('模型原始正文', { output: raw.choices?.[0]?.message?.content, tools: (raw.choices?.[0]?.message?.tool_calls || []).map(call => ({ id: call.id, name: call.function?.name })), usage: raw.usage });
  return adaptDeepSeek(action, raw);
}
