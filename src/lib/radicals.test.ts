import { describe, it, expect } from 'vitest';
import { RADICALS, getRadical, radicalMembers, radicalOf, searchRadicals } from './radicals';

describe('radical table', () => {
	it('has all 214 Kangxi radicals in order, with stroke counts', () => {
		expect(RADICALS).toHaveLength(214);
		RADICALS.forEach((r, i) => expect(r.n).toBe(i + 1));
		expect(getRadical(1)).toMatchObject({ char: '一', strokes: 1 });
		expect(getRadical(85)).toMatchObject({ char: '水', strokes: 4, meaning: 'water' });
		expect(getRadical(214)).toMatchObject({ char: '龠', strokes: 17 });
	});
	it('lists component and simplified forms', () => {
		expect(getRadical(85)!.variants).toContain('氵');
		expect(getRadical(149)!.variants).toContain('讠');
		expect(getRadical(140)!.variants).toContain('艹');
	});
});

describe('radicalOf / radicalMembers', () => {
	it('files characters under their radical with residual strokes', () => {
		expect(radicalOf('河')).toMatchObject({ radical: { n: 85 }, residual: 5 });
		expect(radicalOf('妈')?.radical.n).toBe(38);
		expect(radicalOf('語')?.radical.n).toBe(149);
		expect(radicalOf('a')).toBeUndefined();
	});
	it('groups members by residual strokes and honours the filter', () => {
		const all = radicalMembers(85);
		expect(all[0]).toEqual({ residual: 0, chars: ['水'] });
		const flat = all.flatMap((g) => g.chars);
		expect(flat).toContain('河');
		const only = radicalMembers(85, (c) => c === '河' || c === '海');
		expect(only.flatMap((g) => g.chars).sort()).toEqual(['河', '海']);
		expect(only.every((g) => g.chars.length > 0)).toBe(true);
	});
});

describe('searchRadicals', () => {
	it('finds by number, character, variant, meaning and toneless pinyin', () => {
		expect(searchRadicals('85').map((r) => r.n)).toEqual([85]);
		expect(searchRadicals('水').map((r) => r.n)).toEqual([85]);
		expect(searchRadicals('氵').map((r) => r.n)).toEqual([85]);
		expect(searchRadicals('water').map((r) => r.n)).toContain(85);
		expect(searchRadicals('shui').map((r) => r.n)).toContain(85);
		expect(searchRadicals('  ')).toHaveLength(214);
	});
});
