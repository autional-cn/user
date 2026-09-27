import { describe, it, expect, vi } from 'vitest';

vi.mock('@/i18n', () => ({ default: { language: 'zh-CN' } }));

import { formatTime, formatDate } from '@/lib/format';

const validISO = '2025-06-15T10:30:00Z';

describe('formatTime', () => {
	it('returns -- for null', () => {
		expect(formatTime(null)).toBe('--');
	});

	it('returns -- for undefined', () => {
		expect(formatTime(undefined)).toBe('--');
	});

	it('returns -- for empty string', () => {
		expect(formatTime('')).toBe('--');
	});

	it('returns original string for an invalid date', () => {
		expect(formatTime('not-a-date')).toBe('not-a-date');
	});

	it('formats a valid ISO string correctly', () => {
		const result = formatTime(validISO);

		expect(result).not.toBe('--');
		expect(result).not.toBe(validISO);
		expect(result).toMatch(/\d{4}/);
		expect(result.length).toBeGreaterThan(5);
	});

	it('uses locale param to override i18n default', () => {
		const zhResult = formatTime(validISO);
		const enResult = formatTime(validISO, 'en-US');

		expect(zhResult).not.toBe(enResult);
	});
});

describe('formatDate', () => {
	it('returns -- for null', () => {
		expect(formatDate(null)).toBe('--');
	});

	it('returns -- for undefined', () => {
		expect(formatDate(undefined)).toBe('--');
	});

	it('returns -- for empty string', () => {
		expect(formatDate('')).toBe('--');
	});

	it('returns original string for an invalid date', () => {
		expect(formatDate('invalid')).toBe('invalid');
	});

	it('formats a valid ISO string correctly', () => {
		const result = formatDate(validISO);

		expect(result).not.toBe('--');
		expect(result).not.toBe(validISO);
		expect(result).toMatch(/\d{4}/);
		expect(result.length).toBeGreaterThan(5);
	});

	it('uses locale param to override i18n default', () => {
		const zhResult = formatDate(validISO);
		const enResult = formatDate(validISO, 'en-US');

		expect(zhResult).not.toBe(enResult);
	});
});
