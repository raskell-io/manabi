/**
 * Short synthesized UI feedback sounds for the review loop, à la Duolingo:
 * a bright rising chime when you answer correctly, a soft descending tone when
 * you miss. Built with the Web Audio API — no asset files, so they are tiny,
 * instant, work offline, and are trivially tweakable (just edit the notes).
 *
 * The AudioContext is created lazily on first use; since these only ever fire
 * from a click/keypress, autoplay policies are satisfied.
 */

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
	if (typeof window === 'undefined' || !window.AudioContext) return null;
	if (!ctx) ctx = new AudioContext();
	if (ctx.state === 'suspended') void ctx.resume();
	return ctx;
}

/** One short enveloped oscillator note (soft attack, exponential release). */
function note(
	ac: AudioContext,
	freq: number,
	startAt: number,
	dur: number,
	peak: number,
	type: OscillatorType = 'triangle'
): void {
	const osc = ac.createOscillator();
	const gain = ac.createGain();
	osc.type = type;
	const t = ac.currentTime + startAt;
	osc.frequency.setValueAtTime(freq, t);
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(peak, t + 0.012); // ~12ms attack, no click
	gain.gain.exponentialRampToValueAtTime(0.0001, t + dur); // smooth tail
	osc.connect(gain);
	gain.connect(ac.destination);
	osc.start(t);
	osc.stop(t + dur + 0.03);
}

/** Correct: a bright rising major triad (C6·E6·G6), the last note ringing out. */
export function playCorrect(): void {
	const ac = audioCtx();
	if (!ac) return;
	note(ac, 1046.5, 0.0, 0.14, 0.16);
	note(ac, 1318.5, 0.05, 0.14, 0.16);
	note(ac, 1568.0, 0.1, 0.24, 0.18);
}

/** Wrong: a soft descending pair (G4 → E♭4), mellow and non-harsh. */
export function playWrong(): void {
	const ac = audioCtx();
	if (!ac) return;
	note(ac, 392.0, 0.0, 0.16, 0.15, 'sine');
	note(ac, 311.1, 0.1, 0.3, 0.15, 'sine');
}
