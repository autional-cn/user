export type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';

export function getPasswordStrength(password: string): { level: StrengthLevel; score: number } {
	let score = 0;
	if (password.length >= 8) score++;
	if (password.length >= 12) score++;
	if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
	if (/\d/.test(password)) score++;
	if (/[^a-zA-Z0-9]/.test(password)) score++;

	const levels: StrengthLevel[] = ['weak', 'fair', 'good', 'strong', 'very-strong'];
	return { level: levels[Math.min(score, 4)], score };
}
