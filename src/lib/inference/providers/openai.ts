/**
 * OpenAI provider — remote fallback for TTS and the engine behind the AI
 * content workbench (item generation via Chat Completions JSON mode).
 *
 * The API key lives in local settings and is sent directly from the browser
 * (single-user, local-first app — no proxy). Generated items are validated
 * before they ever become drafts.
 */

import type { GeneratedItem, Language, ManabiSettings } from '$lib/db/types';
import type {
	GenerateItemsInput,
	GenerateItemsResult,
	InferenceProvider,
	InferenceResult,
	ProviderCapabilities,
	TtsInput,
	TtsResult
} from '../types';

const CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const TTS_URL = 'https://api.openai.com/v1/audio/speech';

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
		return { tts: hasKey, generate: hasKey };
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
