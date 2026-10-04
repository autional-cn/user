import { describe, it, expect } from 'vitest';
import { parseUserAgent } from '@/lib/user-agent';

// UP-36 回归锁：判定必须窄→宽。
// 修复前实测反例：Edge 被判 Chrome（其 UA 同时含 Chrome/Safari）、iPhone 被判 macOS（其 UA 含 "Mac OS X"）。
describe('parseUserAgent', () => {
	it('Edge 先于 Chrome 判定（Edg 标记）', () => {
		const ua =
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
		expect(parseUserAgent(ua)).toEqual({ browser: 'Edge', os: '(Windows)' });
	});

	it('Chrome UA → Chrome', () => {
		const ua =
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
		expect(parseUserAgent(ua).browser).toBe('Chrome');
	});

	it('iPhone 先于 Mac 判定（其 UA 含 "Mac OS X"）', () => {
		const ua =
			'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
		expect(parseUserAgent(ua)).toEqual({ browser: 'Safari', os: '(iOS)' });
	});

	it('Android 先于 Linux 判定', () => {
		const ua =
			'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
		expect(parseUserAgent(ua)).toEqual({ browser: 'Chrome', os: '(Android)' });
	});

	it('空值返回空串；未识别浏览器透传原文', () => {
		expect(parseUserAgent()).toEqual({ browser: '', os: '' });
		expect(parseUserAgent(undefined)).toEqual({ browser: '', os: '' });
		expect(parseUserAgent('curl/8.0')).toEqual({ browser: 'curl/8.0', os: '' });
	});
});
