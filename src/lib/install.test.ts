import { describe, it, expect } from 'vitest';
import { decideInstallHint, MIN_ATTEMPTS } from './install';

const base = { standalone: false, ios: false, hasPrompt: false, dismissed: false, attempts: MIN_ATTEMPTS };

describe('decideInstallHint', () => {
	it('never shows when installed, dismissed, or before a real session', () => {
		expect(decideInstallHint({ ...base, hasPrompt: true, standalone: true })).toBeNull();
		expect(decideInstallHint({ ...base, hasPrompt: true, dismissed: true })).toBeNull();
		expect(decideInstallHint({ ...base, hasPrompt: true, attempts: MIN_ATTEMPTS - 1 })).toBeNull();
	});
	it('prefers the native prompt, falls back to iOS instructions, else nothing', () => {
		expect(decideInstallHint({ ...base, hasPrompt: true })).toBe('prompt');
		expect(decideInstallHint({ ...base, hasPrompt: true, ios: true })).toBe('prompt');
		expect(decideInstallHint({ ...base, ios: true })).toBe('ios');
		expect(decideInstallHint(base)).toBeNull();
	});
});
