# 站内账号连接：执行服务契约

状态：工作台窗口与服务网关已实现；真实浏览器执行服务尚未部署。这里不是已完成的扫码登录服务，不得用测试响应、截图或本机登录状态冒充云端绑定。

## 当前范围

- 客户所有连接操作留在工作台 Dialog 内，没有跳转官网的按钮或官网 iframe。
- 网站身份复用现有 `getChatGPTUser()`。只从可信登录请求取得 userId，不接受客户端传入 owner。
- 平台登录、研究采集、发布能力分别验证；登录成功不自动提升能力。
- 视频号在当前运行环境被安全策略阻止，网关固定暂停，不向执行服务发送该平台请求。
- 客户不填写 API Key、Cookie、平台密码。执行服务的地址和服务凭据由运营者部署时配置。
- 不下载或保存二维码到文件、D1 或浏览器存储。二维码只在有效会话内通过同源鉴权图片接口显示，禁止缓存。

## 仍缺的真实服务

需要具备 HTTPS 地址的独立服务，运行平台允许使用的受控浏览器或已获批官方授权应用。当前 Sites Worker 没有浏览器运行绑定，不能直接在其中启动本机浏览器。现有 Codex 浏览器是内部人工验证工具，不是任意客户可调用的公网服务。

运营者配置（默认留空）：

- `PLATFORM_SESSION_SERVICE_URL`：专用 HTTPS origin，不包含路径、查询串或账号口令。
- `PLATFORM_SESSION_SERVICE_KEY`：至少 32 字符随机秘密，仅服务端保存。密钥轮换需要迁移 ownerRef 映射，不能当作日常刷新。

这些变量不能单独创造浏览器能力。必须实现并验收以下契约后，才可填写和启用。

## HTTP 契约 v1

网关所有请求带 `Authorization: Bearer <服务密钥>` 与 `X-Workbench-Owner: <不透明用户标识>`。ownerRef 是站点命名空间和网站 userId 的 HMAC；不传邮箱和用户显示名。服务先核验自己的密钥，再以 ownerRef 分区。只允许抖音/小红书，不接受任意 URL、脚本或浏览器命令。

### GET /v1/platforms/{platform}/connection

返回该用户该平台的当前连接。每个用户/平台最多一个活动登录任务；GET 不新建任务。

```json
{
  "ownerRef": "请求头中的同一标识",
  "platform": "douyin",
  "status": "waiting_scan",
  "loginSession": {
    "id": "随机且不可预测的16到100位字母数字下划线标识",
    "expiresAt": "实际有效期ISO时间，最多未来15分钟",
    "qrAvailable": true
  }
}
```

状态：`unavailable / disconnected / starting / waiting_scan / waiting_confirmation / needs_verification / connected / expired / error`。

只有服务在自己的用户专属执行环境中观察到真实平台身份，才能返回 `connected`、`accountLabel` 和五分钟内的 `verifiedAt`。不得因用户点击“我已登录”或二维码消失而盲目通过。对 research/publish 每项返回 `{status, verifiedAt}`；无单独验证时间时网关保持 `not_verified`。限制状态为 `restricted`。

### POST /v1/platforms/{platform}/connection

请求 `{platform, action, requestId, sessionId?}`。

- `start`：创建/恢复自己的登录任务。
- `refresh`：使指定旧二维码失效，返回新的随机 sessionId 与新的二维码；不能仅延长旧图的过期时间。
- `cancel`：撤销指定的待登录任务并销毁临时会话，不注销用户已有的正常连接。
- `disconnect`：停止该用户该平台的任务，销毁对应运行会话和服务端保存的凭据，再返回 disconnected。

`refresh/cancel` 必须带有效 sessionId。服务必须核对 ownerRef、platform 与 sessionId 三者一致；对每个 ownerRef/requestId 持久幂等，避免超时重复建立浏览器；每用户限制启动频率、总会话数和并发。网关不自动重试有副作用的 POST。网络结果不确定时先 GET 当前状态。

### GET /v1/platforms/{platform}/sessions/{sessionId}/qr

服务核对所有权、当前活动任务及实际平台二维码的有效期，只返回官方允许授权流程产生的 PNG，不生成任意登录网址的替代二维码，不共享运营者账号二维码。响应需包含：

- `Content-Type: image/png`
- `X-Workbench-Owner` 与请求一致
- `X-Login-Session` 与路径一致
- 图像小于 512 KB

网关先检查当前连接状态和会话所有权，再读取图片；客户端只能读取 `/api/platform-connections/qr?...`。PNG 格式、长度与响应身份均检查。任何不一致停止显示。

## 生产启用前验收

1. 两位不同工作台用户不能查看、扫描、取消或解绑对方任务，包括猜到 sessionId 的情况。
2. 登录二维码从真实执行环境实时取得，扫码账户与最终账号标签一致；过期立即撤图，旧二维码不可用。
3. 同一用户刷新页面/换设备能查到同一连接；不复制本机浏览器凭据实现这一点。
4. 会话重启和过期后有清晰重连；额外验证暂停等待本人，不绕过平台限制。
5. 解绑实际销毁连接和凭据；浏览器崩溃、断网、POST 超时可恢复，且不会多开会话。
6. 各平台分别测试指定作品的可见信息/有上限评论；自动发布需要另行接入和审核。
7. 收费和资源配额明确；本轮没有购买/创建服务器，不能承诺整体零成本。

本地契约测试使用隔离模拟返回，不能作为真实扫码验收。官方授权与普通网页登录也不是同一个能力：抖音网站 OAuth 要先有上线应用及获批权限，不能由扫码授权推导出任意博主评论权限。

参考：[抖音登录和授权](https://partner.open-douyin.com/docs/resource/zh-CN/dop/ability/opensdk/user-authorization/solution)、[Cloudflare Live View](https://developers.cloudflare.com/browser-run/features/live-view/)、[浏览器 iframe 约束](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)。Live View 文档不保证官网/托管界面能被我们的站点内嵌，需单独验证。
