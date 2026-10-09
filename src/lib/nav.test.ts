import { describe, it, expect } from 'vitest';
import { isNavActive, LIBRARY, PRIMARY } from './nav';

describe('isNavActive', () => {
	it('matches Home exactly and other destinations by prefix', () => {
		const home = PRIMARY[0];
		expect(isNavActive(home, '/')).toBe(true);
		expect(isNavActive(home, '/review')).toBe(false);
		expect(isNavActive({ href: '/items' }, '/items')).toBe(true);
		expect(isNavActive({ href: '/items' }, '/items/abc')).toBe(true);
		expect(isNavActive({ href: '/items' }, '/itemsx')).toBe(false);
	});
	it('keeps the Library tab lit on every library sub-page', () => {
		const lib = PRIMARY.find((p) => p.href === '/library')!;
		for (const l of LIBRARY) expect(isNavActive(lib, l.href)).toBe(true);
		expect(isNavActive(lib, '/items/abc')).toBe(true);
		expect(isNavActive(lib, '/library')).toBe(true);
		expect(isNavActive(lib, '/review')).toBe(false);
		expect(isNavActive(lib, '/settings')).toBe(false);
	});
	it('has five primary destinations', () => {
		expect(PRIMARY.map((p) => p.label)).toEqual(['Home', 'Review', 'Read', 'Library', 'Progress']);
	});
});
