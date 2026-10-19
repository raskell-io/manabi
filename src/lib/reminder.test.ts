import { describe, expect, it } from 'vitest';
import { isTime, reminderIcs } from './reminder';

describe('reminderIcs', () => {
	const now = new Date(2026, 9, 19, 20, 30); // 19 Oct, 20:30 local
	it('repeats daily from the next occurrence of the time', () => {
		const ics = reminderIcs('19:00', 'https://manabi.example/', now);
		expect(ics).toContain('DTSTART:20261020T190000'); // 19:00 has passed today
		expect(ics).toContain('RRULE:FREQ=DAILY');
		expect(ics).toContain('URL:https://manabi.example/');
		expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
		expect(reminderIcs('21:15', 'u', now)).toContain('DTSTART:20261019T211500'); // still today
	});
	it('validates the time', () => {
		expect(isTime('07:05')).toBe(true);
		expect(isTime('24:00')).toBe(false);
		expect(() => reminderIcs('7pm', 'u', now)).toThrow();
	});
});
