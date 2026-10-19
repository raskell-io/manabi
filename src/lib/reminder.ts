/**
 * A daily practice reminder without a server: an iCalendar event that repeats
 * every day at the chosen time and links back to Manabi. The learner adds it
 * to their own calendar app, which does the reminding (push notifications
 * would need a server, which a local-first app doesn't have).
 */

/** `HH:MM` → the next date-time (local, floating) at that time, as an iCalendar stamp. */
function stamp(date: Date, time: string): string {
	const [h, m] = time.split(':').map(Number);
	const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
	if (d.getTime() < date.getTime()) d.setDate(d.getDate() + 1);
	const p = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

function utcStamp(d: Date): string {
	return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function isTime(v: string): boolean {
	return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/** The .ics text for a daily reminder at `time` (local), first occurring after `now`. */
export function reminderIcs(time: string, url: string, now: Date = new Date(), minutes = 10): string {
	if (!isTime(time)) throw new Error(`Not a time: ${time}`);
	return [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Manabi//Daily reminder//EN',
		'CALSCALE:GREGORIAN',
		'BEGIN:VEVENT',
		'UID:manabi-daily-practice@manabi',
		`DTSTAMP:${utcStamp(now)}`,
		`DTSTART:${stamp(now, time)}`,
		`DURATION:PT${minutes}M`,
		'RRULE:FREQ=DAILY',
		'SUMMARY:Manabi — a few minutes of practice',
		`DESCRIPTION:Your reviews are waiting. Open Manabi: ${url}`,
		`URL:${url}`,
		'BEGIN:VALARM',
		'ACTION:DISPLAY',
		'DESCRIPTION:Time for Manabi',
		'TRIGGER:PT0M',
		'END:VALARM',
		'END:VEVENT',
		'END:VCALENDAR',
		''
	].join('\r\n');
}
