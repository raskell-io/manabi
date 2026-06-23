/**
 * Built-in starter content — a small, hand-verified seed per language so the
 * app is usable the moment it boots, before any AI generation. The workbench
 * (/workbench) generates the rest into the review queue.
 *
 * Seed items are inserted on first run with `status: 'published'`. They use
 * stable ids (`seed-<lang>-<n>`) so re-seeding is idempotent.
 */

import type { GeneratedItem, Language, LearningItem } from './types';

interface SeedSpec extends GeneratedItem {
	kind?: LearningItem['kind'];
}

const ZH: SeedSpec[] = [
	{
		target: '今天',
		reading: 'jīntiān',
		meaning: 'today',
		tags: ['time', 'daily', 'HSK1'],
		level: 'A1',
		examples: [
			{ target: '我今天很忙。', reading: 'Wǒ jīntiān hěn máng.', meaning: 'I am very busy today.' }
		]
	},
	{
		target: '你好',
		reading: 'nǐ hǎo',
		meaning: 'hello',
		tags: ['greeting', 'daily', 'HSK1'],
		level: 'A1',
		examples: [{ target: '你好，老师。', reading: 'Nǐ hǎo, lǎoshī.', meaning: 'Hello, teacher.' }]
	},
	{
		target: '谢谢',
		reading: 'xièxie',
		meaning: 'thank you',
		tags: ['greeting', 'daily', 'HSK1'],
		level: 'A1',
		examples: [{ target: '谢谢你的帮助。', reading: 'Xièxie nǐ de bāngzhù.', meaning: 'Thank you for your help.' }]
	},
	{
		target: '吃',
		reading: 'chī',
		meaning: 'to eat',
		tags: ['verb', 'food', 'HSK1'],
		level: 'A1',
		examples: [{ target: '我喜欢吃米饭。', reading: 'Wǒ xǐhuān chī mǐfàn.', meaning: 'I like to eat rice.' }]
	},
	{
		target: '水',
		reading: 'shuǐ',
		meaning: 'water',
		tags: ['food', 'noun', 'HSK1'],
		level: 'A1',
		examples: [{ target: '我想喝水。', reading: 'Wǒ xiǎng hē shuǐ.', meaning: 'I want to drink water.' }]
	},
	{
		target: '朋友',
		reading: 'péngyou',
		meaning: 'friend',
		tags: ['people', 'daily', 'HSK1'],
		level: 'A1',
		examples: [{ target: '他是我的朋友。', reading: 'Tā shì wǒ de péngyou.', meaning: 'He is my friend.' }]
	},
	{
		target: '明天',
		reading: 'míngtiān',
		meaning: 'tomorrow',
		tags: ['time', 'daily', 'HSK1'],
		level: 'A1',
		examples: [{ target: '我明天去北京。', reading: 'Wǒ míngtiān qù Běijīng.', meaning: 'I am going to Beijing tomorrow.' }]
	}
];

const JA: SeedSpec[] = [
	{
		target: '今日',
		reading: 'きょう',
		transliteration: 'kyō',
		meaning: 'today',
		tags: ['time', 'daily', 'N5'],
		level: 'A1',
		examples: [
			{
				target: '今日は忙しいです。',
				reading: 'きょうはいそがしいです。',
				transliteration: 'Kyō wa isogashii desu.',
				meaning: 'I am busy today.'
			}
		]
	},
	{
		target: '食べる',
		reading: 'たべる',
		transliteration: 'taberu',
		meaning: 'to eat',
		tags: ['verb', 'food', 'N5'],
		level: 'A1',
		examples: [
			{
				target: '寿司を食べます。',
				reading: 'すしをたべます。',
				transliteration: 'Sushi o tabemasu.',
				meaning: 'I eat sushi.'
			}
		]
	},
	{
		target: '水',
		reading: 'みず',
		transliteration: 'mizu',
		meaning: 'water',
		tags: ['food', 'noun', 'N5'],
		level: 'A1',
		examples: [
			{
				target: '水を飲みます。',
				reading: 'みずをのみます。',
				transliteration: 'Mizu o nomimasu.',
				meaning: 'I drink water.'
			}
		]
	},
	{
		target: '友達',
		reading: 'ともだち',
		transliteration: 'tomodachi',
		meaning: 'friend',
		tags: ['people', 'daily', 'N5'],
		level: 'A1',
		examples: [
			{
				target: '友達と会います。',
				reading: 'ともだちとあいます。',
				transliteration: 'Tomodachi to aimasu.',
				meaning: 'I meet a friend.'
			}
		]
	},
	{
		target: '行く',
		reading: 'いく',
		transliteration: 'iku',
		meaning: 'to go',
		tags: ['verb', 'daily', 'N5'],
		level: 'A1',
		examples: [
			{
				target: '学校に行きます。',
				reading: 'がっこうにいきます。',
				transliteration: 'Gakkō ni ikimasu.',
				meaning: 'I go to school.'
			}
		]
	},
	{
		target: '本',
		reading: 'ほん',
		transliteration: 'hon',
		meaning: 'book',
		tags: ['noun', 'daily', 'N5'],
		level: 'A1',
		examples: [
			{
				target: '本を読みます。',
				reading: 'ほんをよみます。',
				transliteration: 'Hon o yomimasu.',
				meaning: 'I read a book.'
			}
		]
	}
];

const HE: SeedSpec[] = [
	{
		target: 'שָׁלוֹם',
		reading: 'shalom',
		transliteration: 'shalom',
		meaning: 'hello / peace',
		tags: ['greeting', 'daily'],
		level: 'A1',
		examples: [{ target: 'שָׁלוֹם, מָה שְׁלוֹמְךָ?', reading: 'shalom, ma shlomkha?', meaning: 'Hello, how are you?' }]
	},
	{
		target: 'תּוֹדָה',
		reading: 'todah',
		transliteration: 'todah',
		meaning: 'thank you',
		tags: ['greeting', 'daily'],
		level: 'A1',
		examples: [{ target: 'תּוֹדָה רַבָּה.', reading: 'todah rabah.', meaning: 'Thank you very much.' }]
	},
	{
		target: 'מַיִם',
		reading: 'mayim',
		transliteration: 'mayim',
		meaning: 'water',
		tags: ['food', 'noun'],
		level: 'A1',
		examples: [{ target: 'אֲנִי שׁוֹתֶה מַיִם.', reading: 'ani shoteh mayim.', meaning: 'I drink water.' }]
	},
	{
		target: 'יוֹם',
		reading: 'yom',
		transliteration: 'yom',
		meaning: 'day',
		tags: ['time', 'daily'],
		level: 'A1',
		examples: [{ target: 'הַיּוֹם אֲנִי עָסוּק.', reading: 'hayom ani asuk.', meaning: 'Today I am busy.' }]
	},
	{
		target: 'חָבֵר',
		reading: 'chaver',
		transliteration: 'chaver',
		meaning: 'friend',
		tags: ['people', 'daily'],
		level: 'A1',
		examples: [{ target: 'הוּא חָבֵר שֶׁלִּי.', reading: 'hu chaver sheli.', meaning: 'He is my friend.' }]
	},
	{
		target: 'סֵפֶר',
		reading: 'sefer',
		transliteration: 'sefer',
		meaning: 'book',
		tags: ['noun', 'daily'],
		level: 'A1',
		examples: [{ target: 'אֲנִי קוֹרֵא סֵפֶר.', reading: 'ani kore sefer.', meaning: 'I read a book.' }]
	}
];

const SEED: Record<Language, SeedSpec[]> = { zh: ZH, ja: JA, he: HE };

/** All seed items as fully-formed `LearningItem`s with stable ids. */
export function seedItems(now: number = Date.now()): LearningItem[] {
	const out: LearningItem[] = [];
	for (const [lang, specs] of Object.entries(SEED) as [Language, SeedSpec[]][]) {
		specs.forEach((spec, i) => {
			out.push({
				id: `seed-${lang}-${i}`,
				language: lang,
				kind: spec.kind ?? 'word',
				target: spec.target,
				reading: spec.reading,
				transliteration: spec.transliteration,
				meaning: spec.meaning,
				tags: spec.tags,
				level: spec.level,
				examples: spec.examples,
				status: 'published',
				createdAt: now,
				updatedAt: now
			});
		});
	}
	return out;
}
