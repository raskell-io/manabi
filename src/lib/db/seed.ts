/**
 * Built-in starter content — a hand-verified seed per language, tuned to the
 * learner's levels: Chinese A1→A2 (HSK1-2), Japanese B1 refresher (N4/N3),
 * Hebrew A1 (alef-bet, numbers, everyday phrases, vowelled).
 *
 * Each spec carries a STABLE `id` so the seed upserts idempotently into an
 * existing document (see store `applyNewSeeds`). Never change an existing id;
 * append new entries with new ids. The workbench (/workbench) generates more.
 */

import type { GeneratedItem, ItemKind, Language, LearningItem } from './types';

interface SeedSpec extends GeneratedItem {
	id: string;
	kind?: ItemKind;
}

// ---------------------------------------------------------------------------
// Chinese — A1 → A2 (HSK1-2)
// ---------------------------------------------------------------------------
const ZH: SeedSpec[] = [
	// — original seed (do not change ids) —
	{ id: 'seed-zh-0', target: '今天', reading: 'jīntiān', meaning: 'today', tags: ['time', 'daily', 'HSK1'], level: 'A1',
		examples: [{ target: '我今天很忙。', reading: 'Wǒ jīntiān hěn máng.', meaning: 'I am very busy today.' }] },
	{ id: 'seed-zh-1', target: '你好', reading: 'nǐ hǎo', meaning: 'hello', tags: ['greeting', 'daily', 'HSK1'], level: 'A1',
		examples: [{ target: '你好，老师。', reading: 'Nǐ hǎo, lǎoshī.', meaning: 'Hello, teacher.' }] },
	{ id: 'seed-zh-2', target: '谢谢', reading: 'xièxie', meaning: 'thank you', tags: ['greeting', 'daily', 'HSK1'], level: 'A1',
		examples: [{ target: '谢谢你的帮助。', reading: 'Xièxie nǐ de bāngzhù.', meaning: 'Thank you for your help.' }] },
	{ id: 'seed-zh-3', target: '吃', reading: 'chī', meaning: 'to eat', tags: ['verb', 'food', 'HSK1'], level: 'A1',
		examples: [{ target: '我喜欢吃米饭。', reading: 'Wǒ xǐhuān chī mǐfàn.', meaning: 'I like to eat rice.' }] },
	{ id: 'seed-zh-4', target: '水', reading: 'shuǐ', meaning: 'water', tags: ['food', 'noun', 'HSK1'], level: 'A1',
		examples: [{ target: '我想喝水。', reading: 'Wǒ xiǎng hē shuǐ.', meaning: 'I want to drink water.' }] },
	{ id: 'seed-zh-5', target: '朋友', reading: 'péngyou', meaning: 'friend', tags: ['people', 'daily', 'HSK1'], level: 'A1',
		examples: [{ target: '他是我的朋友。', reading: 'Tā shì wǒ de péngyou.', meaning: 'He is my friend.' }] },
	{ id: 'seed-zh-6', target: '明天', reading: 'míngtiān', meaning: 'tomorrow', tags: ['time', 'daily', 'HSK1'], level: 'A1',
		examples: [{ target: '我明天去北京。', reading: 'Wǒ míngtiān qù Běijīng.', meaning: 'I am going to Beijing tomorrow.' }] },

	// — numbers —
	{ id: 'seed-zh-num-1', target: '一', reading: 'yī', meaning: 'one', tags: ['number', 'HSK1'], level: 'A1',
		examples: [{ target: '我有一个问题。', reading: 'Wǒ yǒu yí gè wèntí.', meaning: 'I have a question.' }] },
	{ id: 'seed-zh-num-2', target: '二', reading: 'èr', meaning: 'two', tags: ['number', 'HSK1'], level: 'A1',
		examples: [{ target: '我要两个，不是二楼。', reading: 'Wǒ yào liǎng gè, bú shì èr lóu.', meaning: 'I want two, not the second floor.' }] },
	{ id: 'seed-zh-num-3', target: '三', reading: 'sān', meaning: 'three', tags: ['number', 'HSK1'], level: 'A1',
		examples: [{ target: '我有三个孩子。', reading: 'Wǒ yǒu sān gè háizi.', meaning: 'I have three children.' }] },
	{ id: 'seed-zh-num-5', target: '五', reading: 'wǔ', meaning: 'five', tags: ['number', 'HSK1'], level: 'A1',
		examples: [{ target: '现在五点。', reading: 'Xiànzài wǔ diǎn.', meaning: 'It is five o’clock now.' }] },
	{ id: 'seed-zh-num-10', target: '十', reading: 'shí', meaning: 'ten', tags: ['number', 'HSK1'], level: 'A1',
		examples: [{ target: '一共十块钱。', reading: 'Yígòng shí kuài qián.', meaning: 'Ten yuan in total.' }] },

	// — time —
	{ id: 'seed-zh-now', target: '现在', reading: 'xiànzài', meaning: 'now', tags: ['time', 'HSK1'], level: 'A1',
		examples: [{ target: '现在几点？', reading: 'Xiànzài jǐ diǎn?', meaning: 'What time is it now?' }] },
	{ id: 'seed-zh-week', target: '星期', reading: 'xīngqī', meaning: 'week', tags: ['time', 'HSK1'], level: 'A1',
		examples: [{ target: '今天星期几？', reading: 'Jīntiān xīngqī jǐ?', meaning: 'What day of the week is it today?' }] },
	{ id: 'seed-zh-yesterday', target: '昨天', reading: 'zuótiān', meaning: 'yesterday', tags: ['time', 'HSK2'], level: 'A2',
		examples: [{ target: '昨天我很累。', reading: 'Zuótiān wǒ hěn lèi.', meaning: 'I was very tired yesterday.' }] },

	// — core verbs —
	{ id: 'seed-zh-shi', target: '是', reading: 'shì', meaning: 'to be', tags: ['verb', 'HSK1'], level: 'A1',
		examples: [{ target: '我是学生。', reading: 'Wǒ shì xuéshēng.', meaning: 'I am a student.' }] },
	{ id: 'seed-zh-you', target: '有', reading: 'yǒu', meaning: 'to have', tags: ['verb', 'HSK1'], level: 'A1',
		examples: [{ target: '我有一只猫。', reading: 'Wǒ yǒu yì zhī māo.', meaning: 'I have a cat.' }] },
	{ id: 'seed-zh-qu', target: '去', reading: 'qù', meaning: 'to go', tags: ['verb', 'HSK1'], level: 'A1',
		examples: [{ target: '我去学校。', reading: 'Wǒ qù xuéxiào.', meaning: 'I go to school.' }] },
	{ id: 'seed-zh-he', target: '喝', reading: 'hē', meaning: 'to drink', tags: ['verb', 'food', 'HSK1'], level: 'A1',
		examples: [{ target: '我喝茶。', reading: 'Wǒ hē chá.', meaning: 'I drink tea.' }] },
	{ id: 'seed-zh-kan', target: '看', reading: 'kàn', meaning: 'to look / watch / read', tags: ['verb', 'HSK1'], level: 'A1',
		examples: [{ target: '我看书。', reading: 'Wǒ kàn shū.', meaning: 'I read a book.' }] },
	{ id: 'seed-zh-shuo', target: '说', reading: 'shuō', meaning: 'to speak / say', tags: ['verb', 'HSK1'], level: 'A1',
		examples: [{ target: '你说中文吗？', reading: 'Nǐ shuō Zhōngwén ma?', meaning: 'Do you speak Chinese?' }] },
	{ id: 'seed-zh-mai', target: '买', reading: 'mǎi', meaning: 'to buy', tags: ['verb', 'HSK1'], level: 'A1',
		examples: [{ target: '我想买票。', reading: 'Wǒ xiǎng mǎi piào.', meaning: 'I want to buy a ticket.' }] },
	{ id: 'seed-zh-xihuan', target: '喜欢', reading: 'xǐhuān', meaning: 'to like', tags: ['verb', 'HSK1'], level: 'A1',
		examples: [{ target: '我喜欢咖啡。', reading: 'Wǒ xǐhuān kāfēi.', meaning: 'I like coffee.' }] },
	{ id: 'seed-zh-xiang', target: '想', reading: 'xiǎng', meaning: 'to want / to think', tags: ['verb', 'HSK1'], level: 'A1',
		examples: [{ target: '我想回家。', reading: 'Wǒ xiǎng huí jiā.', meaning: 'I want to go home.' }] },

	// — food —
	{ id: 'seed-zh-rice', target: '米饭', reading: 'mǐfàn', meaning: 'cooked rice', tags: ['food', 'noun', 'HSK1'], level: 'A1',
		examples: [{ target: '我要一碗米饭。', reading: 'Wǒ yào yì wǎn mǐfàn.', meaning: 'I want a bowl of rice.' }] },
	{ id: 'seed-zh-tea', target: '茶', reading: 'chá', meaning: 'tea', tags: ['food', 'noun', 'HSK1'], level: 'A1',
		examples: [{ target: '这是中国茶。', reading: 'Zhè shì Zhōngguó chá.', meaning: 'This is Chinese tea.' }] },
	{ id: 'seed-zh-coffee', target: '咖啡', reading: 'kāfēi', meaning: 'coffee', tags: ['food', 'noun', 'HSK2'], level: 'A2',
		examples: [{ target: '我每天喝咖啡。', reading: 'Wǒ měitiān hē kāfēi.', meaning: 'I drink coffee every day.' }] },

	// — travel —
	{ id: 'seed-zh-train', target: '火车', reading: 'huǒchē', meaning: 'train', tags: ['travel', 'noun', 'HSK1'], level: 'A1',
		examples: [{ target: '火车几点开？', reading: 'Huǒchē jǐ diǎn kāi?', meaning: 'What time does the train leave?' }] },
	{ id: 'seed-zh-plane', target: '飞机', reading: 'fēijī', meaning: 'airplane', tags: ['travel', 'noun', 'HSK1'], level: 'A1',
		examples: [{ target: '我坐飞机去北京。', reading: 'Wǒ zuò fēijī qù Běijīng.', meaning: 'I go to Beijing by plane.' }] },
	{ id: 'seed-zh-hotel', target: '酒店', reading: 'jiǔdiàn', meaning: 'hotel', tags: ['travel', 'noun', 'HSK2'], level: 'A2',
		examples: [{ target: '酒店在哪里？', reading: 'Jiǔdiàn zài nǎlǐ?', meaning: 'Where is the hotel?' }] },
	{ id: 'seed-zh-ticket', target: '票', reading: 'piào', meaning: 'ticket', tags: ['travel', 'noun', 'HSK2'], level: 'A2',
		examples: [{ target: '一张票多少钱？', reading: 'Yì zhāng piào duōshao qián?', meaning: 'How much is one ticket?' }] },

	// — daily life —
	{ id: 'seed-zh-home', target: '家', reading: 'jiā', meaning: 'home / family', tags: ['daily', 'noun', 'HSK1'], level: 'A1',
		examples: [{ target: '我在家。', reading: 'Wǒ zài jiā.', meaning: 'I am at home.' }] },
	{ id: 'seed-zh-work', target: '工作', reading: 'gōngzuò', meaning: 'work / job', tags: ['daily', 'noun', 'HSK1'], level: 'A1',
		examples: [{ target: '我在北京工作。', reading: 'Wǒ zài Běijīng gōngzuò.', meaning: 'I work in Beijing.' }] },

	// — particles & patterns —
	{ id: 'seed-zh-hen', target: '很', reading: 'hěn', meaning: 'very', kind: 'grammar', tags: ['grammar', 'particle', 'HSK1'], level: 'A1',
		examples: [{ target: '今天很热。', reading: 'Jīntiān hěn rè.', meaning: 'It is very hot today.' }] },
	{ id: 'seed-zh-bu', target: '不', reading: 'bù', meaning: 'not (negation)', kind: 'grammar', tags: ['grammar', 'particle', 'HSK1'], level: 'A1',
		examples: [{ target: '我不喝酒。', reading: 'Wǒ bù hē jiǔ.', meaning: 'I do not drink alcohol.' }] },
	{ id: 'seed-zh-le', target: '了', reading: 'le', meaning: 'particle: completed action / change', kind: 'grammar', tags: ['grammar', 'particle', 'HSK1'], level: 'A2',
		examples: [{ target: '我吃饭了。', reading: 'Wǒ chīfàn le.', meaning: 'I have eaten.' }] },
	{ id: 'seed-zh-howmuch', target: '多少钱', reading: 'duōshao qián', meaning: 'how much (money)?', kind: 'phrase', tags: ['phrase', 'shopping', 'HSK1'], level: 'A1',
		examples: [{ target: '这个多少钱？', reading: 'Zhège duōshao qián?', meaning: 'How much is this?' }] },
	{ id: 'seed-zh-where', target: '在哪里', reading: 'zài nǎlǐ', meaning: 'where is …?', kind: 'phrase', tags: ['phrase', 'travel', 'HSK1'], level: 'A1',
		examples: [{ target: '厕所在哪里？', reading: 'Cèsuǒ zài nǎlǐ?', meaning: 'Where is the toilet?' }] }
];

// ---------------------------------------------------------------------------
// Japanese — B1 refresher (N4/N3): kanji recognition, verbs, particles, grammar
// ---------------------------------------------------------------------------
const JA: SeedSpec[] = [
	// — original seed (do not change ids) —
	{ id: 'seed-ja-0', target: '今日', reading: 'きょう', transliteration: 'kyō', meaning: 'today', tags: ['time', 'daily', 'N5'], level: 'A1',
		examples: [{ target: '今日は忙しいです。', reading: 'きょうはいそがしいです。', transliteration: 'Kyō wa isogashii desu.', meaning: 'I am busy today.' }] },
	{ id: 'seed-ja-1', target: '食べる', reading: 'たべる', transliteration: 'taberu', meaning: 'to eat', tags: ['verb', 'food', 'N5'], level: 'A1',
		examples: [{ target: '寿司を食べます。', reading: 'すしをたべます。', transliteration: 'Sushi o tabemasu.', meaning: 'I eat sushi.' }] },
	{ id: 'seed-ja-2', target: '水', reading: 'みず', transliteration: 'mizu', meaning: 'water', tags: ['food', 'noun', 'N5'], level: 'A1',
		examples: [{ target: '水を飲みます。', reading: 'みずをのみます。', transliteration: 'Mizu o nomimasu.', meaning: 'I drink water.' }] },
	{ id: 'seed-ja-3', target: '友達', reading: 'ともだち', transliteration: 'tomodachi', meaning: 'friend', tags: ['people', 'daily', 'N5'], level: 'A1',
		examples: [{ target: '友達と会います。', reading: 'ともだちとあいます。', transliteration: 'Tomodachi to aimasu.', meaning: 'I meet a friend.' }] },
	{ id: 'seed-ja-4', target: '行く', reading: 'いく', transliteration: 'iku', meaning: 'to go', tags: ['verb', 'daily', 'N5'], level: 'A1',
		examples: [{ target: '学校に行きます。', reading: 'がっこうにいきます。', transliteration: 'Gakkō ni ikimasu.', meaning: 'I go to school.' }] },
	{ id: 'seed-ja-5', target: '本', reading: 'ほん', transliteration: 'hon', meaning: 'book', tags: ['noun', 'daily', 'N5'], level: 'A1',
		examples: [{ target: '本を読みます。', reading: 'ほんをよみます。', transliteration: 'Hon o yomimasu.', meaning: 'I read a book.' }] },

	// — N4 vocabulary (kanji recognition refresh) —
	{ id: 'seed-ja-jikan', target: '時間', reading: 'じかん', transliteration: 'jikan', meaning: 'time', tags: ['noun', 'time', 'N5'], level: 'B1',
		examples: [{ target: '時間がありません。', reading: 'じかんがありません。', transliteration: 'Jikan ga arimasen.', meaning: 'I don’t have time.' }] },
	{ id: 'seed-ja-shigoto', target: '仕事', reading: 'しごと', transliteration: 'shigoto', meaning: 'work / job', tags: ['noun', 'daily', 'N4'], level: 'B1',
		examples: [{ target: '仕事は忙しいです。', reading: 'しごとはいそがしいです。', transliteration: 'Shigoto wa isogashii desu.', meaning: 'Work is busy.' }] },
	{ id: 'seed-ja-densha', target: '電車', reading: 'でんしゃ', transliteration: 'densha', meaning: 'train', tags: ['noun', 'travel', 'N5'], level: 'B1',
		examples: [{ target: '電車で行きます。', reading: 'でんしゃでいきます。', transliteration: 'Densha de ikimasu.', meaning: 'I go by train.' }] },
	{ id: 'seed-ja-eiga', target: '映画', reading: 'えいが', transliteration: 'eiga', meaning: 'movie', tags: ['noun', 'daily', 'N5'], level: 'B1',
		examples: [{ target: '昨日映画を見ました。', reading: 'きのうえいがをみました。', transliteration: 'Kinō eiga o mimashita.', meaning: 'I watched a movie yesterday.' }] },
	{ id: 'seed-ja-tenki', target: '天気', reading: 'てんき', transliteration: 'tenki', meaning: 'weather', tags: ['noun', 'daily', 'N5'], level: 'B1',
		examples: [{ target: '今日はいい天気です。', reading: 'きょうはいいてんきです。', transliteration: 'Kyō wa ii tenki desu.', meaning: 'The weather is nice today.' }] },
	{ id: 'seed-ja-basho', target: '場所', reading: 'ばしょ', transliteration: 'basho', meaning: 'place', tags: ['noun', 'N4'], level: 'B1',
		examples: [{ target: 'この場所が好きです。', reading: 'このばしょがすきです。', transliteration: 'Kono basho ga suki desu.', meaning: 'I like this place.' }] },

	// — verbs (conjugation refresh) —
	{ id: 'seed-ja-nomu', target: '飲む', reading: 'のむ', transliteration: 'nomu', meaning: 'to drink', tags: ['verb', 'food', 'N5'], level: 'B1',
		examples: [{ target: 'コーヒーを飲みます。', reading: 'コーヒーをのみます。', transliteration: 'Kōhī o nomimasu.', meaning: 'I drink coffee.' }] },
	{ id: 'seed-ja-miru', target: '見る', reading: 'みる', transliteration: 'miru', meaning: 'to see / watch', tags: ['verb', 'N5'], level: 'B1',
		examples: [{ target: 'テレビを見ます。', reading: 'テレビをみます。', transliteration: 'Terebi o mimasu.', meaning: 'I watch TV.' }] },
	{ id: 'seed-ja-hanasu', target: '話す', reading: 'はなす', transliteration: 'hanasu', meaning: 'to speak / talk', tags: ['verb', 'N5'], level: 'B1',
		examples: [{ target: '日本語を話します。', reading: 'にほんごをはなします。', transliteration: 'Nihongo o hanashimasu.', meaning: 'I speak Japanese.' }] },
	{ id: 'seed-ja-matsu', target: '待つ', reading: 'まつ', transliteration: 'matsu', meaning: 'to wait', tags: ['verb', 'N5'], level: 'B1',
		examples: [{ target: 'ちょっと待ってください。', reading: 'ちょっとまってください。', transliteration: 'Chotto matte kudasai.', meaning: 'Please wait a moment.' }] },
	{ id: 'seed-ja-omou', target: '思う', reading: 'おもう', transliteration: 'omou', meaning: 'to think', tags: ['verb', 'N4'], level: 'B1',
		examples: [{ target: '私もそう思います。', reading: 'わたしもそうおもいます。', transliteration: 'Watashi mo sō omoimasu.', meaning: 'I think so too.' }] },
	{ id: 'seed-ja-tsukau', target: '使う', reading: 'つかう', transliteration: 'tsukau', meaning: 'to use', tags: ['verb', 'N4'], level: 'B1',
		examples: [{ target: 'パソコンを使います。', reading: 'パソコンをつかいます。', transliteration: 'Pasokon o tsukaimasu.', meaning: 'I use a computer.' }] },

	// — N3 grammar patterns —
	{ id: 'seed-ja-g-nakereba', target: '〜なければならない', reading: '〜なければならない', transliteration: 'nakereba naranai', meaning: 'must / have to (do)', kind: 'grammar', tags: ['grammar', 'N4'], level: 'B1',
		examples: [{ target: 'もう行かなければなりません。', reading: 'もういかなければなりません。', transliteration: 'Mō ikanakereba narimasen.', meaning: 'I have to go now.' }] },
	{ id: 'seed-ja-g-takotogaaru', target: '〜たことがある', reading: '〜たことがある', transliteration: 'ta koto ga aru', meaning: 'have done (before) — experience', kind: 'grammar', tags: ['grammar', 'N4'], level: 'B1',
		examples: [{ target: '日本へ行ったことがあります。', reading: 'にほんへいったことがあります。', transliteration: 'Nihon e itta koto ga arimasu.', meaning: 'I have been to Japan.' }] },
	{ id: 'seed-ja-g-nagara', target: '〜ながら', reading: '〜ながら', transliteration: 'nagara', meaning: 'while doing (two actions at once)', kind: 'grammar', tags: ['grammar', 'N4'], level: 'B1',
		examples: [{ target: '音楽を聞きながら勉強します。', reading: 'おんがくをききながらべんきょうします。', transliteration: 'Ongaku o kikinagara benkyō shimasu.', meaning: 'I study while listening to music.' }] },
	{ id: 'seed-ja-g-kamoshirenai', target: '〜かもしれない', reading: '〜かもしれない', transliteration: 'kamoshirenai', meaning: 'might / maybe', kind: 'grammar', tags: ['grammar', 'N4'], level: 'B1',
		examples: [{ target: '明日雨が降るかもしれません。', reading: 'あしたあめがふるかもしれません。', transliteration: 'Ashita ame ga furu kamoshiremasen.', meaning: 'It might rain tomorrow.' }] },
	{ id: 'seed-ja-g-teshimau', target: '〜てしまう', reading: '〜てしまう', transliteration: 'te shimau', meaning: 'do completely / unintentionally (regret)', kind: 'grammar', tags: ['grammar', 'N3'], level: 'B1',
		examples: [{ target: '宿題を忘れてしまいました。', reading: 'しゅくだいをわすれてしまいました。', transliteration: 'Shukudai o wasurete shimaimashita.', meaning: 'I (carelessly) forgot my homework.' }] },
	{ id: 'seed-ja-g-youtoomou', target: '〜ようと思う', reading: '〜ようとおもう', transliteration: 'yō to omou', meaning: 'intend to / be thinking of doing', kind: 'grammar', tags: ['grammar', 'N4'], level: 'B1',
		examples: [{ target: '来年日本へ行こうと思います。', reading: 'らいねんにほんへいこうとおもいます。', transliteration: 'Rainen Nihon e ikō to omoimasu.', meaning: 'I’m thinking of going to Japan next year.' }] }
];

// ---------------------------------------------------------------------------
// Hebrew — A1: alef-bet, numbers, everyday phrases (vowelled / niqqud)
// ---------------------------------------------------------------------------
const HE: SeedSpec[] = [
	// — original seed (do not change ids) —
	{ id: 'seed-he-0', target: 'שָׁלוֹם', reading: 'shalom', transliteration: 'shalom', meaning: 'hello / peace', tags: ['greeting', 'daily'], level: 'A1',
		examples: [{ target: 'שָׁלוֹם, מָה שְׁלוֹמְךָ?', reading: 'shalom, ma shlomkha?', meaning: 'Hello, how are you?' }] },
	{ id: 'seed-he-1', target: 'תּוֹדָה', reading: 'todah', transliteration: 'todah', meaning: 'thank you', tags: ['greeting', 'daily'], level: 'A1',
		examples: [{ target: 'תּוֹדָה רַבָּה.', reading: 'todah rabah.', meaning: 'Thank you very much.' }] },
	{ id: 'seed-he-2', target: 'מַיִם', reading: 'mayim', transliteration: 'mayim', meaning: 'water', tags: ['food', 'noun'], level: 'A1',
		examples: [{ target: 'אֲנִי שׁוֹתֶה מַיִם.', reading: 'ani shoteh mayim.', meaning: 'I drink water.' }] },
	{ id: 'seed-he-3', target: 'יוֹם', reading: 'yom', transliteration: 'yom', meaning: 'day', tags: ['time', 'daily'], level: 'A1',
		examples: [{ target: 'הַיּוֹם אֲנִי עָסוּק.', reading: 'hayom ani asuk.', meaning: 'Today I am busy.' }] },
	{ id: 'seed-he-4', target: 'חָבֵר', reading: 'chaver', transliteration: 'chaver', meaning: 'friend', tags: ['people', 'daily'], level: 'A1',
		examples: [{ target: 'הוּא חָבֵר שֶׁלִּי.', reading: 'hu chaver sheli.', meaning: 'He is my friend.' }] },
	{ id: 'seed-he-5', target: 'סֵפֶר', reading: 'sefer', transliteration: 'sefer', meaning: 'book', tags: ['noun', 'daily'], level: 'A1',
		examples: [{ target: 'אֲנִי קוֹרֵא סֵפֶר.', reading: 'ani kore sefer.', meaning: 'I read a book.' }] },

	// — alef-bet (letter recognition) —
	{ id: 'seed-he-l-alef', target: 'א', reading: 'alef', meaning: 'letter: alef (silent / glottal)', kind: 'grammar', tags: ['alefbet', 'letter'], level: 'A1', examples: [] },
	{ id: 'seed-he-l-bet', target: 'בּ', reading: 'bet', meaning: 'letter: bet (b)', kind: 'grammar', tags: ['alefbet', 'letter'], level: 'A1', examples: [] },
	{ id: 'seed-he-l-gimel', target: 'ג', reading: 'gimel', meaning: 'letter: gimel (g)', kind: 'grammar', tags: ['alefbet', 'letter'], level: 'A1', examples: [] },
	{ id: 'seed-he-l-dalet', target: 'ד', reading: 'dalet', meaning: 'letter: dalet (d)', kind: 'grammar', tags: ['alefbet', 'letter'], level: 'A1', examples: [] },
	{ id: 'seed-he-l-he', target: 'ה', reading: 'he', meaning: 'letter: he (h)', kind: 'grammar', tags: ['alefbet', 'letter'], level: 'A1', examples: [] },
	{ id: 'seed-he-l-vav', target: 'ו', reading: 'vav', meaning: 'letter: vav (v / o / u)', kind: 'grammar', tags: ['alefbet', 'letter'], level: 'A1', examples: [] },
	{ id: 'seed-he-l-shin', target: 'שׁ', reading: 'shin', meaning: 'letter: shin (sh)', kind: 'grammar', tags: ['alefbet', 'letter'], level: 'A1', examples: [] },
	{ id: 'seed-he-l-lamed', target: 'ל', reading: 'lamed', meaning: 'letter: lamed (l)', kind: 'grammar', tags: ['alefbet', 'letter'], level: 'A1', examples: [] },
	{ id: 'seed-he-l-mem', target: 'מ', reading: 'mem', meaning: 'letter: mem (m)', kind: 'grammar', tags: ['alefbet', 'letter'], level: 'A1', examples: [] },

	// — numbers (feminine / counting form) —
	{ id: 'seed-he-n-1', target: 'אַחַת', reading: 'achat', transliteration: 'achat', meaning: 'one (f)', tags: ['number'], level: 'A1', examples: [] },
	{ id: 'seed-he-n-2', target: 'שְׁתַּיִם', reading: 'shtayim', transliteration: 'shtayim', meaning: 'two (f)', tags: ['number'], level: 'A1', examples: [] },
	{ id: 'seed-he-n-3', target: 'שָׁלוֹשׁ', reading: 'shalosh', transliteration: 'shalosh', meaning: 'three (f)', tags: ['number'], level: 'A1', examples: [] },

	// — everyday words & phrases —
	{ id: 'seed-he-yes', target: 'כֵּן', reading: 'ken', transliteration: 'ken', meaning: 'yes', tags: ['daily', 'phrase'], level: 'A1',
		examples: [{ target: 'כֵּן, בְּבַקָּשָׁה.', reading: 'ken, bevakasha.', meaning: 'Yes, please.' }] },
	{ id: 'seed-he-no', target: 'לֹא', reading: 'lo', transliteration: 'lo', meaning: 'no / not', tags: ['daily', 'phrase'], level: 'A1',
		examples: [{ target: 'לֹא, תּוֹדָה.', reading: 'lo, todah.', meaning: 'No, thank you.' }] },
	{ id: 'seed-he-please', target: 'בְּבַקָּשָׁה', reading: 'bevakasha', transliteration: 'bevakasha', meaning: 'please / you’re welcome', tags: ['greeting', 'phrase'], level: 'A1',
		examples: [{ target: 'מַיִם, בְּבַקָּשָׁה.', reading: 'mayim, bevakasha.', meaning: 'Water, please.' }] },
	{ id: 'seed-he-slicha', target: 'סְלִיחָה', reading: 'slicha', transliteration: 'slicha', meaning: 'excuse me / sorry', tags: ['greeting', 'phrase'], level: 'A1',
		examples: [{ target: 'סְלִיחָה, אֵיפֹה הַתַּחֲנָה?', reading: 'slicha, eifo hatachana?', meaning: 'Excuse me, where is the station?' }] },
	{ id: 'seed-he-bokertov', target: 'בֹּקֶר טוֹב', reading: 'boker tov', transliteration: 'boker tov', meaning: 'good morning', kind: 'phrase', tags: ['greeting', 'phrase'], level: 'A1', examples: [] },
	{ id: 'seed-he-ani', target: 'אֲנִי', reading: 'ani', transliteration: 'ani', meaning: 'I', tags: ['pronoun', 'daily'], level: 'A1',
		examples: [{ target: 'אֲנִי מִיִּשְׂרָאֵל.', reading: 'ani mi-Yisrael.', meaning: 'I am from Israel.' }] },
	{ id: 'seed-he-ata', target: 'אַתָּה', reading: 'ata', transliteration: 'ata', meaning: 'you (m)', tags: ['pronoun', 'daily'], level: 'A1',
		examples: [{ target: 'מָה אַתָּה עוֹשֶׂה?', reading: 'ma ata oseh?', meaning: 'What are you doing?' }] },
	{ id: 'seed-he-bayit', target: 'בַּיִת', reading: 'bayit', transliteration: 'bayit', meaning: 'house / home', tags: ['noun', 'daily'], level: 'A1',
		examples: [{ target: 'זֶה הַבַּיִת שֶׁלִּי.', reading: 'ze habayit sheli.', meaning: 'This is my house.' }] },
	{ id: 'seed-he-ochel', target: 'אֹכֶל', reading: 'ochel', transliteration: 'ochel', meaning: 'food', tags: ['food', 'noun'], level: 'A1',
		examples: [{ target: 'הָאֹכֶל טָעִים.', reading: 'ha’ochel ta’im.', meaning: 'The food is delicious.' }] },
	{ id: 'seed-he-gadol', target: 'גָּדוֹל', reading: 'gadol', transliteration: 'gadol', meaning: 'big (m)', tags: ['adjective', 'daily'], level: 'A1',
		examples: [{ target: 'הַבַּיִת גָּדוֹל.', reading: 'habayit gadol.', meaning: 'The house is big.' }] },
	{ id: 'seed-he-katan', target: 'קָטָן', reading: 'katan', transliteration: 'katan', meaning: 'small (m)', tags: ['adjective', 'daily'], level: 'A1',
		examples: [{ target: 'הַסֵּפֶר קָטָן.', reading: 'hasefer katan.', meaning: 'The book is small.' }] }
];

const SEED: Record<Language, SeedSpec[]> = { zh: ZH, ja: JA, he: HE };

/**
 * Which seed items still need applying to a document — those whose id isn't yet
 * in `seededIds`. Pure + exported so the existing-user upgrade path is testable.
 */
export function seedsToApply(seededIds: Record<string, boolean> | undefined): LearningItem[] {
	const seeded = seededIds ?? {};
	return seedItems().filter((it) => !seeded[it.id]);
}

/** All seed items as fully-formed `LearningItem`s with stable ids. */
export function seedItems(now: number = Date.now()): LearningItem[] {
	const out: LearningItem[] = [];
	for (const [lang, specs] of Object.entries(SEED) as [Language, SeedSpec[]][]) {
		for (const spec of specs) {
			out.push({
				id: spec.id,
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
		}
	}
	return out;
}
