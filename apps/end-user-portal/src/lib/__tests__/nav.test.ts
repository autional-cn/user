import { describe, it, expect } from 'vitest';
import { stripTenantPrefix, pickActiveNavPath } from '@/lib/nav';

describe('stripTenantPrefix', () => {
	it('strips the tenant slug prefix', () => {
		expect(stripTenantPrefix('/simple-inc/devices/family', 'simple-inc')).toBe('/devices/family');
	});

	it('normalizes the tenant root with and without trailing slash', () => {
		expect(stripTenantPrefix('/simple-inc', 'simple-inc')).toBe('/');
		expect(stripTenantPrefix('/simple-inc/', 'simple-inc')).toBe('/');
	});

	it('trims a trailing slash on sub paths', () => {
		expect(stripTenantPrefix('/simple-inc/profile/', 'simple-inc')).toBe('/profile');
	});

	it('returns the path unchanged when slug is absent or does not match', () => {
		expect(stripTenantPrefix('/devices', undefined)).toBe('/devices');
		expect(stripTenantPrefix('/other-tenant/devices', 'simple-inc')).toBe('/other-tenant/devices');
	});
});

describe('pickActiveNavPath', () => {
	const navPaths = [
		'/',
		'/profile',
		'/security',
		'/security/login-history',
		'/devices',
		'/devices/pair',
		'/devices/family',
		'/notification/api/v1/notifications',
		'/notification/api/v1/notifications/preferences',
	];

	it('picks the deepest child instead of its parent (single highlight)', () => {
		expect(pickActiveNavPath(navPaths, '/devices/family')).toBe('/devices/family');
		expect(
			pickActiveNavPath(navPaths, '/notification/api/v1/notifications/preferences'),
		).toBe('/notification/api/v1/notifications/preferences');
		expect(pickActiveNavPath(navPaths, '/security/login-history')).toBe(
			'/security/login-history',
		);
	});

	it('picks the exact match for a parent route', () => {
		expect(pickActiveNavPath(navPaths, '/devices')).toBe('/devices');
		expect(pickActiveNavPath(navPaths, '/security')).toBe('/security');
	});

	it('keeps the parent highlighted on descendant pages not listed in the nav', () => {
		expect(pickActiveNavPath(navPaths, '/devices/123/transfer')).toBe('/devices');
	});

	it('matches the dashboard only on the root path', () => {
		expect(pickActiveNavPath(navPaths, '/')).toBe('/');
		expect(pickActiveNavPath(navPaths, '/profile')).toBe('/profile');
	});

	it('respects segment boundaries (no partial-segment match)', () => {
		expect(pickActiveNavPath(['/devices'], '/devices-archive')).toBeNull();
	});

	it('returns null when nothing matches', () => {
		expect(pickActiveNavPath(navPaths, '/onboarding')).toBeNull();
	});
});
