/**
 * Haptic ticks for answers — a short tap for right, a double for wrong.
 * `navigator.vibrate` exists on Android browsers; iOS Safari ignores it, so
 * this is strictly additive.
 */

function haptic(pattern: number | number[]): void {
	try {
		navigator.vibrate?.(pattern);
	} catch {
		/* unsupported */
	}
}

export const tapCorrect = (): void => haptic(12);
export const tapWrong = (): void => haptic([30, 40, 30]);
