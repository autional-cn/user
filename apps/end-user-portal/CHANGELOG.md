# End-User Portal 变更日志

## 2026-05-17 — i18n 全面迁移 + 组件单元测试 + TypeScript 零错误修复

### 变更范围
- `package.json` / `vitest.config.ts` / `src/test/`
- `src/i18n/`（新增国际化基础设施）
- `src/hooks/use-language.ts` / `src/hooks/use-theme.ts`
- `src/main.tsx`
- `src/hooks/use-api-queries.ts`（类型修复）
- `src/components/layout/AppLayout.tsx` / `Breadcrumb.tsx`
- `src/components/ErrorBoundary.tsx` / `ErrorState.tsx` / `LoadingScreen.tsx`
- `src/app/page.tsx` / `not-found/page.tsx` / `notifications/page.tsx` / `profile/page.tsx` / `security/page.tsx` / `sessions/page.tsx`

---

### 1. i18n 全面迁移

**目标**：消除所有硬编码中文，支持多语言切换。

**新增基础设施**：
- `src/i18n/index.ts` — i18next + react-i18next + browser-language-detector 配置
- `src/i18n/types.ts` — TypeScript 类型声明（宽松策略，支持嵌套键）
- `src/i18n/locales/zh-CN.json` — 中文翻译（~200 键）
- `src/i18n/locales/en-US.json` — 英文翻译（~200 键）
- `src/hooks/use-language.ts` — 语言切换 Hook
- `src/main.tsx` — 引入 `./i18n` 完成全局初始化

**已迁移页面/组件**：

| 文件 | 迁移内容 |
|------|----------|
| `AppLayout.tsx` | Sidebar 导航标签、顶部栏标题、退出登录、主题切换 tooltip、用户菜单 |
| `Breadcrumb.tsx` | 面包屑路径映射（概览/个人资料/安全设置/会话管理/通知中心） |
| `ErrorBoundary.tsx` | 错误标题、错误描述、刷新按钮 |
| `ErrorState.tsx` | 默认错误文案 |
| `LoadingScreen.tsx` | 默认加载文案 |
| `page.tsx` (Dashboard) | 欢迎语、统计标签、快捷入口、安全提示 |
| `not-found/page.tsx` | 404 标题、描述、返回按钮 |
| `notifications/page.tsx` | 页面标题、通知类型标签、分页、空状态、操作按钮 |
| `profile/page.tsx` | 字段标签、编辑/保存/取消、头像操作、表单校验提示 |
| `security/page.tsx` | 密码修改、MFA 卡片、TOTP 弹窗（3 步骤）、Passkey 管理、禁用弹窗 |
| `sessions/page.tsx` | 页面标题、会话列表标签、注销按钮、空状态 |

**统一主题**：
- `src/hooks/use-theme.ts` 新增，包含 `applyTheme`、`getInitialTheme`、`useTheme`
- `AppLayout.tsx` 移除内联 `useTheme`，改用外部 Hook，消除重复代码

---

### 2. 组件单元测试

**新增依赖**：
- `vitest` + `@vitejs/plugin-react`
- `@testing-library/react` + `@testing-library/jest-dom`
- `jsdom`

**新增配置**：
- `vitest.config.ts` — 测试环境 jsdom，别名解析
- `src/test/setup.ts` — 引入 `@testing-library/jest-dom/vitest`
- `src/test/wrapper.tsx` — `I18nextProvider` 包装器（测试中强制 `zh-CN`）

**新增测试**：
- `ErrorState.test.tsx` — 4 个断言（默认文案、自定义文案、className、图标）
- `LoadingScreen.test.tsx` — 4 个断言（默认文案、自定义文案、className、图标）

**package.json 脚本**：
- `"test": "vitest run"`
- `"test:watch": "vitest"`

---

### 3. TypeScript 零错误修复

**问题**：`use-api-queries.ts` 内联类型与页面实际使用严重不匹配，产生 29 处 `TS2339` / `TS2345` 错误。

**修复内容**：

| 类型 | 修复 |
|------|------|
| `UserProfile` | 补充 `avatarUrl?: string`、`createdAt?: string` |
| `SessionInfo` | 补充 `device?: string`、`browser?: string`、`location?: string`、`ipAddress?: string`、`isCurrent?: boolean` |
| `MFAStatus` | 补充 `methods?: string[]` |
| `TOTPSetup` | 补充 `provisioningUri?: string` |
| `NotificationItem` | `isRead?: boolean` → `read: boolean`；`type?: string` → `type: string` |
| `WalletBalance` | 补充 `currency?: string`、`available?: string` |
| `PointAccount` | 补充 `available?: number`、`total?: number`、`frozen?: number` |
| `useSessions` | 返回类型改为 `SessionInfo[]`（内部解包 `PaginatedList.items`） |
| `useRevokeAllSessions` | 支持 `{ exceptCurrent?: boolean }` 参数 |

**页面调用修复**：
- `security/page.tsx` — `enableTotpMutation.mutateAsync()` 移除多余 `userId` 参数
- `security/page.tsx` — `verifyTotpMutation.mutateAsync(code)` 改为仅传 code
- `security/page.tsx` — `disableTotpMutation.mutateAsync(code)` 改为仅传 code
- `security/page.tsx` — `backupCodesMutation.mutateAsync()` 改为无参数
- `notifications/page.tsx` — `markAllMutation.mutateAsync()` 移除 `userId` 参数
- `page.tsx` (Dashboard) — `unreadQ.data?.items?.length` → `unreadQ.data?.length`

---

### 验证结果

| 检查项 | 结果 |
|--------|------|
| `pnpm run typecheck` (`tsc --noEmit`) | ✅ 0 错误 |
| `pnpm test` (`vitest run`) | ✅ 8/8 通过 |
| `pnpm build` (`vite build`) | ✅ 成功 |

---

### 遗留 TODO（后端接口待对接）

- `security/page.tsx:sendSMSCode()` — `/mfa/sms/send` 端点未对接
- `security/page.tsx:sendEmailCode()` — `/mfa/email/send` 端点未对接
