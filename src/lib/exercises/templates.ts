/**
 * Exercise templates — the concrete drill shapes and which skill each trains.
 *
 * A review task is a (item, dimension) pair; `generate.ts` turns it into one
 * of these. Each dimension has a signature exercise, with text-only fallbacks
 * when local audio is off so the review loop works before M3 audio lands.
 */

import type { Dimension, ExerciseType, Language } from '$lib/db/types';

export interface Choice {
	/** Stable key for keyed-each + selection. */
	key: string;
	/** Primary text shown on the button (script or English). */
	label: string;
	/** Secondary text (reading / transliteration). */
	sublabel?: string;
	correct: boolean;
}

export type PromptMode =
	| 'script' // show target script (+ reading)
	| 'reading' // show reading / transliteration only
	| 'meaning' // show English gloss
	| 'audio' // play audio, no text
	| 'cloze'; // sentence with a blank

export interface Exercise {
	itemId: string;
	language: Language;
	dimension: Dimension;
	type: ExerciseType;
	instruction: string;
	promptMode: PromptMode;
	/** Target script for the prompt (script/cloze/audio modes). */
	promptScript?: string;
	/** Reading shown with the prompt where helpful. */
	promptReading?: string;
	/** English gloss for meaning-mode prompts. */
	promptMeaning?: string;
	/** Cloze sentence with the answer blanked out. */
	clozeText?: string;
	clozeMeaning?: string;
	/** Audio ref for audio prompts (resolved/synthesized by the runner). */
	promptAudioRef?: string;
	/** Multiple-choice options (absent for record-compare). */
	choices?: Choice[];
	/** Canonical correct answer, for attempt logging. */
	answer: string;
}

export const INSTRUCTIONS: Record<ExerciseType, string> = {
	'word-to-meaning': 'What does this mean?',
	'word-to-reading': 'How is this pronounced?',
	'reading-to-word': 'Which word is this?',
	'audio-to-word': 'Which word do you hear?',
	cloze: 'Fill in the blank',
	'meaning-to-word': 'Choose the word',
	'record-compare': 'Listen, then record yourself'
};

/**
 * The exercise type used to drill a dimension. `audio` flags whether local
 * TTS is available — when off, listening/pronunciation fall back to text.
 */
export function exerciseTypeFor(dimension: Dimension, audio: boolean): ExerciseType {
	switch (dimension) {
		case 'recognition':
			return 'word-to-meaning';
		case 'pronunciation':
			return audio ? 'record-compare' : 'word-to-reading';
		case 'listening':
			return audio ? 'audio-to-word' : 'reading-to-word';
		case 'context':
			return 'cloze';
		case 'recall':
			return 'meaning-to-word';
	}
}
