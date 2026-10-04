// 登录历史 / 活动日志共用的 UA 粗解析（UP-36：同一数据两页同口径）。
// 判定顺序即正确性：Edge 与 Chrome 的 UA 互相包含（Edg/… Chrome/… Safari/…），
// iPhone 的 UA 也含 "Mac OS X" —— 必须先窄后宽，否则 Edge 判成 Chrome、iOS 判成 macOS。
export function parseUserAgent(ua?: string): { browser: string; os: string } {
	if (!ua) return { browser: '', os: '' };

	let browser = ua;
	if (ua.includes('Edg')) browser = 'Edge';
	else if (ua.includes('Chrome')) browser = 'Chrome';
	else if (ua.includes('Firefox')) browser = 'Firefox';
	else if (ua.includes('Safari')) browser = 'Safari';

	let os = '';
	if (ua.includes('Android')) os = 'Android';
	else if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iOS')) os = 'iOS';
	else if (ua.includes('Windows')) os = 'Windows';
	else if (ua.includes('Linux')) os = 'Linux';
	else if (ua.includes('Mac')) os = 'macOS';

	return { browser, os: os ? `(${os})` : '' };
}
