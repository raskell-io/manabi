import { writable } from 'svelte/store';

/**
 * True while a review session is running. On phones the shell hides its top
 * and bottom bars (focus mode, like a lesson screen); the session shows its
 * own quit button.
 */
export const immersive = writable(false);
