/**
 * OpenAI provider — remote fallback for TTS, the engine behind the AI content
 * workbench (item generation via Chat Completions JSON mode), Hebrew
 * diacritization (same endpoint, temperature 0) and speech transcription
 * (pronunciation scoring).
 *
 * The API key lives in local settings and is sent directly from the browser
 * (single-user, local-first app — no proxy). Generated items are validated
 * before they ever become drafts.
 */

import type { GeneratedItem, GeneratedPassage, Language, ManabiSettings, PassageLine } from '$lib/db/types';
import type {
	DiacritizeInput,
	DiacritizeResult,
	GenerateItemsInput,
	GenerateItemsResult,
	GeneratePassagesInput,
	GeneratePassagesResult,
	InferenceProvider,
	InferenceResult,
	ProviderCapabilities,
	TranscribeInput,
	TranscribeResult,
	TtsInput,
	TtsResult
} from '../types';

const CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const TTS_URL = 'https://api.openai.com/v1/audio/speech';
const TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';
const TRANSCRIBE_MODEL = 'gpt-4o-mini-transcribe';

/**
 * Style prompts that steer the transcript's *script* without hinting at the
 * answer — e.g. keep Chinese in Simplified characters, which the items use.
 */
const TRANSCRIBE_PROMPT: Partial<Record<Language, string>> = {
	zh: '以下是普通话的句子。'
};

function audioFilename(mime: string): string {
	if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'recording.m4a';
	if (mime.includes('ogg')) return 'recording.ogg';
	if (mime.includes('wav')) return 'recording.wav';
	if (mime.includes('mpeg') || mime.includes('mp3')) return 'recording.mp3';
	return 'recording.webm';
}

function buildDiacritizePrompt(texts: string[]): string {
	return [
		"Add full niqqud to each Hebrew string below: vowel points, dagesh/mappiq and shin/sin dots, as in a learner's textbook (Modern Israeli Hebrew).",
		'Preserve every letter, space, punctuation mark and line break exactly — change nothing except adding marks. Keep the order.',
		'Return STRICT JSON only, shape: {"texts":["…"]} with exactly one output string per input string.',
		JSON.stringify({ texts })
	].join('\n');
}

const READING_GUIDE: Record<Language, string> = {
	zh: 'reading = Hanyu Pinyin WITH tone marks (e.g. "jīntiān"). Use Simplified characters for target.',
	ja: 'reading = kana (hiragana/katakana) for the whole target; transliteration = romaji (e.g. "taberu").',
	he: 'target = fully vowelled (niqqud) Modern Hebrew; reading and transliteration = Latin transcription (e.g. "shalom").'
};

function buildPrompt(input: GenerateItemsInput): string {
	const { language, kind, level, topic, count, existingTargets } = input;
	const topicLine = topic ? `Topic/theme: ${topic}.` : 'Pick common, useful everyday vocabulary.';
	const avoid =
		existingTargets.length > 0
			? `Do NOT generate any of these existing targets: ${existingTargets.slice(0, 200).join(', ')}.`
			: '';
	return [
		`Generate ${count} ${language} ${kind} learning items at ${level} level.`,
		topicLine,
		READING_GUIDE[language],
		'Each item must include exactly ONE natural example sentence.',
		'No handwriting/stroke-order content. Meanings are concise English glosses.',
		'Tags: 2-4 short lowercase tags incl. a proficiency tag where relevant (HSK/JLPT/CEFR).',
		avoid,
		'Return STRICT JSON only, shape:',
		'{"items":[{"target":"","reading":"","transliteration":"","meaning":"","tags":[""],"level":"","examples":[{"target":"","reading":"","transliteration":"","meaning":""}]}]}'
	]
		.filter(Boolean)
		.join('\n');
}

function buildPassagePrompt(input: GeneratePassagesInput): string {
	const { language, kind, level, topic, count } = input;
	const topicLine = topic ? `Topic/theme: ${topic}.` : 'Choose a useful, everyday situation.';
	const shape =
		kind === 'conversation'
			? '5-7 short natural turns; each line has a "speaker" label (a name or role).'
			: '4-6 sentences of flowing newspaper/non-fiction prose; NO "speaker" field on lines.';
	return [
		`Generate ${count} ${language} ${kind}${count > 1 ? 's' : ''} at ${level} level for a language learner.`,
		topicLine,
		'Make it natural, organic, and up to date with modern culture (phones, apps, remote work, streaming, etc. where relevant).',
		shape,
		READING_GUIDE[language],
		'Every line needs reading + concise English meaning; add transliteration where the guide asks.',
		'Give each passage a short bilingual "title" (target — English) and a one-sentence English "intro".',
		'Tags: 2-4 short lowercase topic tags.',
		'Return STRICT JSON only, shape:',
		'{"passages":[{"title":"","intro":"","tags":[""],"lines":[{"speaker":"","target":"","reading":"","transliteration":"","meaning":""}]}]}'
	]
		.filter(Boolean)
		.join('\n');
}

/** Validate + coerce the model's JSON into clean GeneratedPassage[]. Drops bad entries. */
export function validateGeneratedPassages(raw: unknown, kind: 'conversation' | 'text'): GeneratedPassage[] {
	const root = raw as { passages?: unknown };
	if (!root || !Array.isArray(root.passages)) return [];
	const out: GeneratedPassage[] = [];
	for (const entry of root.passages) {
		const e = entry as Record<string, unknown>;
		if (typeof e.title !== 'string' || !e.title.trim()) continue;
		const linesRaw = Array.isArray(e.lines) ? e.lines : [];
		const lines: PassageLine[] = linesRaw
			.map((x) => x as Record<string, unknown>)
			.filter((x) => typeof x.target === 'string' && x.target.trim() && typeof x.meaning === 'string')
			.map((x) => {
				const line: PassageLine = {
					target: String(x.target).trim(),
					reading: typeof x.reading === 'string' ? x.reading.trim() : '',
					meaning: String(x.meaning).trim()
				};
				if (kind === 'conversation' && typeof x.speaker === 'string' && x.speaker.trim()) {
					line.speaker = x.speaker.trim();
				}
				if (typeof x.transliteration === 'string' && x.transliteration.trim()) {
					line.transliteration = x.transliteration.trim();
				}
				return line;
			});
		if (lines.length === 0) continue;
		out.push({
			title: e.title.trim(),
			intro: typeof e.intro === 'string' && e.intro.trim() ? e.intro.trim() : undefined,
			tags: Array.isArray(e.tags) ? e.tags.filter((t): t is string => typeof t === 'string') : [],
			lines
		});
	}
	return out;
}

/** Validate + coerce the model's JSON into clean GeneratedItem[]. Drops bad entries. */
export function validateGeneratedItems(raw: unknown): GeneratedItem[] {
	const root = raw as { items?: unknown };
	if (!root || !Array.isArray(root.items)) return [];
	const out: GeneratedItem[] = [];
	for (const entry of root.items) {
		const e = entry as Record<string, unknown>;
		if (typeof e.target !== 'string' || !e.target.trim()) continue;
		if (typeof e.reading !== 'string' || !e.reading.trim()) continue;
		if (typeof e.meaning !== 'string' || !e.meaning.trim()) continue;
		const examplesRaw = Array.isArray(e.examples) ? e.examples : [];
		const examples = examplesRaw
			.map((x) => x as Record<string, unknown>)
			.filter((x) => typeof x.target === 'string' && typeof x.meaning === 'string')
			.map((x) => ({
				target: String(x.target),
				reading: typeof x.reading === 'string' ? x.reading : '',
				transliteration: typeof x.transliteration === 'string' ? x.transliteration : undefined,
				meaning: String(x.meaning)
			}));
		out.push({
			target: e.target.trim(),
			reading: e.reading.trim(),
			transliteration: typeof e.transliteration === 'string' && e.transliteration.trim() ? e.transliteration.trim() : undefined,
			meaning: e.meaning.trim(),
			tags: Array.isArray(e.tags) ? e.tags.filter((t): t is string => typeof t === 'string') : [],
			level: typeof e.level === 'string' && e.level.trim() ? e.level.trim() : 'A1',
			examples
		});
	}
	return out;
}

export const openaiProvider: InferenceProvider = {
	id: 'openai',
	target: 'remote',
	capabilities(settings: ManabiSettings): ProviderCapabilities {
		const hasKey = settings.openaiApiKey.trim().length > 0;
		return {
			tts: hasKey,
			generate: hasKey,
			diacritize: hasKey,
			transcribe: hasKey && settings.asrScoring !== false
		};
	},

	async diacritize(
		input: DiacritizeInput,
		settings: ManabiSettings
	): Promise<InferenceResult<DiacritizeResult>> {
		const key = settings.openaiApiKey.trim();
		if (!key) return { ok: false, error: 'No OpenAI API key set', providerId: 'openai', target: 'remote' };
		try {
			const res = await fetch(CHAT_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
				body: JSON.stringify({
					model: settings.openaiModel || 'gpt-4o',
					temperature: 0,
					response_format: { type: 'json_object' },
					messages: [
						{ role: 'system', content: 'You are an expert in Modern Hebrew niqqud (vowel pointing). Output only valid JSON.' },
						{ role: 'user', content: buildDiacritizePrompt(input.texts) }
					]
				})
			});
			if (!res.ok) {
				const text = await res.text();
				return { ok: false, error: `OpenAI ${res.status}: ${text.slice(0, 200)}`, providerId: 'openai', target: 'remote' };
			}
			const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
			const content = data.choices?.[0]?.message?.content ?? '{}';
			const parsed = JSON.parse(content) as { texts?: unknown };
			const texts = Array.isArray(parsed.texts) ? parsed.texts.map((t) => String(t)) : [];
			if (texts.length !== input.texts.length) {
				return { ok: false, error: `Expected ${input.texts.length} strings back, got ${texts.length}`, providerId: 'openai', target: 'remote' };
			}
			return { ok: true, value: { texts }, providerId: 'openai', target: 'remote' };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : 'Diacritization failed', providerId: 'openai', target: 'remote' };
		}
	},

	async transcribe(
		input: TranscribeInput,
		settings: ManabiSettings
	): Promise<InferenceResult<TranscribeResult>> {
		const key = settings.openaiApiKey.trim();
		if (!key) return { ok: false, error: 'No OpenAI API key set', providerId: 'openai', target: 'remote' };
		try {
			const form = new FormData();
			form.append('file', input.audio, audioFilename(input.audio.type));
			form.append('model', TRANSCRIBE_MODEL);
			form.append('language', input.language);
			form.append('response_format', 'json');
			const prompt = TRANSCRIBE_PROMPT[input.language];
			if (prompt) form.append('prompt', prompt);
			const res = await fetch(TRANSCRIBE_URL, {
				method: 'POST',
				headers: { Authorization: `Bearer ${key}` },
				body: form
			});
			if (!res.ok) {
				const text = await res.text();
				return { ok: false, error: `OpenAI transcription ${res.status}: ${text.slice(0, 200)}`, providerId: 'openai', target: 'remote' };
			}
			const data = (await res.json()) as { text?: string };
			return { ok: true, value: { text: (data.text ?? '').trim() }, providerId: 'openai', target: 'remote' };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : 'Transcription failed', providerId: 'openai', target: 'remote' };
		}
	},

	async generateItems(
		input: GenerateItemsInput,
		settings: ManabiSettings
	): Promise<InferenceResult<GenerateItemsResult>> {
		const key = settings.openaiApiKey.trim();
		if (!key) return { ok: false, error: 'No OpenAI API key set', providerId: 'openai', target: 'remote' };
		try {
			const res = await fetch(CHAT_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
				body: JSON.stringify({
					model: settings.openaiModel || 'gpt-4o',
					temperature: 0.7,
					response_format: { type: 'json_object' },
					messages: [
						{ role: 'system', content: 'You are an expert language-learning content author. Output only valid JSON.' },
						{ role: 'user', content: buildPrompt(input) }
					]
				})
			});
			if (!res.ok) {
				const text = await res.text();
				return { ok: false, error: `OpenAI ${res.status}: ${text.slice(0, 200)}`, providerId: 'openai', target: 'remote' };
			}
			const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
			const content = data.choices?.[0]?.message?.content ?? '{}';
			const items = validateGeneratedItems(JSON.parse(content));
			return { ok: true, value: { items }, providerId: 'openai', target: 'remote' };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : 'Generation failed', providerId: 'openai', target: 'remote' };
		}
	},

	async generatePassages(
		input: GeneratePassagesInput,
		settings: ManabiSettings
	): Promise<InferenceResult<GeneratePassagesResult>> {
		const key = settings.openaiApiKey.trim();
		if (!key) return { ok: false, error: 'No OpenAI API key set', providerId: 'openai', target: 'remote' };
		try {
			const res = await fetch(CHAT_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
				body: JSON.stringify({
					model: settings.openaiModel || 'gpt-4o',
					temperature: 0.8,
					response_format: { type: 'json_object' },
					messages: [
						{ role: 'system', content: 'You are an expert language-learning content author. Output only valid JSON.' },
						{ role: 'user', content: buildPassagePrompt(input) }
					]
				})
			});
			if (!res.ok) {
				const text = await res.text();
				return { ok: false, error: `OpenAI ${res.status}: ${text.slice(0, 200)}`, providerId: 'openai', target: 'remote' };
			}
			const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
			const content = data.choices?.[0]?.message?.content ?? '{}';
			const passages = validateGeneratedPassages(JSON.parse(content), input.kind);
			return { ok: true, value: { passages }, providerId: 'openai', target: 'remote' };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : 'Generation failed', providerId: 'openai', target: 'remote' };
		}
	},

	async tts(input: TtsInput, settings: ManabiSettings): Promise<InferenceResult<TtsResult>> {
		const key = settings.openaiApiKey.trim();
		if (!key) return { ok: false, error: 'No OpenAI API key set', providerId: 'openai', target: 'remote' };
		try {
			const res = await fetch(TTS_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
				body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: 'alloy', input: input.text, response_format: 'mp3' })
			});
			if (!res.ok) {
				const text = await res.text();
				return { ok: false, error: `OpenAI TTS ${res.status}: ${text.slice(0, 200)}`, providerId: 'openai', target: 'remote' };
			}
			const audio = await res.arrayBuffer();
			return { ok: true, value: { audio, mimeType: 'audio/mpeg' }, providerId: 'openai', target: 'remote' };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : 'TTS failed', providerId: 'openai', target: 'remote' };
		}
	}
};
