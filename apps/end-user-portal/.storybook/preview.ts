import type { Preview } from '@storybook/react';
import '../src/app/globals.css';

// ⚠ 设计令牌不在 globals.css 里，也不该在这里 import —— 见 preview-head.html。
// 生产里它是 index.html 的一条 CDN <link>，**不经过 PostCSS**：
// 直接 import tokens.css 会被 Tailwind 的 @layer 处理链拒绝（实测：
// normalizeTailwindDirectives 在 tokens.css 的 @layer base 上直接抛错，整个 preview 起不来）。
// 那正是当初把令牌放到 CDN 的原因。所以 Storybook 也用同样的机制补，而不是绕开它。

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
