/**
 * Built-in starter content — a hand-verified seed per language, tuned to the
 * learner's levels: Chinese A1→A2 (HSK1-2), Japanese B1 refresher (N4/N3),
 * Hebrew A1 (alef-bet, numbers, everyday phrases, vowelled).
 *
 * Each spec carries a STABLE `id` so the seed upserts idempotently into an
 * existing document (see store `applyNewSeeds`). Never change an existing id;
 * append new entries with new ids. The workbench (/workbench) generates more.
 */

import type {
	GeneratedItem,
	ItemKind,
	Language,
	LearningItem,
	Passage,
	PassageKind,
	PassageLine
} from './types';

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
		examples: [{ target: '厕所在哪里？', reading: 'Cèsuǒ zài nǎlǐ?', meaning: 'Where is the toilet?' }] },

	// — A2 batch (HSK2-3): modern daily life & connectives —
	{ id: 'seed-zh-weekend', target: '周末', reading: 'zhōumò', meaning: 'weekend', tags: ['time', 'daily', 'HSK2'], level: 'A2',
		examples: [{ target: '这个周末你有空吗？', reading: 'Zhège zhōumò nǐ yǒu kòng ma?', meaning: 'Are you free this weekend?' }] },
	{ id: 'seed-zh-movie', target: '电影', reading: 'diànyǐng', meaning: 'movie', tags: ['daily', 'noun', 'HSK1'], level: 'A2',
		examples: [{ target: '我们一起去看电影吧。', reading: 'Wǒmen yìqǐ qù kàn diànyǐng ba.', meaning: 'Let’s go watch a movie together.' }] },
	{ id: 'seed-zh-phone', target: '手机', reading: 'shǒujī', meaning: 'mobile phone', tags: ['tech', 'daily', 'HSK2'], level: 'A2',
		examples: [{ target: '我用手机买票。', reading: 'Wǒ yòng shǒujī mǎi piào.', meaning: 'I buy tickets with my phone.' }] },
	{ id: 'seed-zh-internet', target: '网络', reading: 'wǎngluò', meaning: 'internet / network', tags: ['tech', 'HSK3'], level: 'A2',
		examples: [{ target: '这里的网络很快。', reading: 'Zhèlǐ de wǎngluò hěn kuài.', meaning: 'The internet here is fast.' }] },
	{ id: 'seed-zh-pay', target: '支付', reading: 'zhīfù', meaning: 'to pay (esp. digitally)', tags: ['tech', 'shopping', 'HSK3'], level: 'A2',
		examples: [{ target: '可以用手机支付吗？', reading: 'Kěyǐ yòng shǒujī zhīfù ma?', meaning: 'Can I pay by phone?' }] },
	{ id: 'seed-zh-together', target: '一起', reading: 'yìqǐ', meaning: 'together', tags: ['daily', 'HSK2'], level: 'A2',
		examples: [{ target: '我们一起吃饭吧。', reading: 'Wǒmen yìqǐ chīfàn ba.', meaning: 'Let’s eat together.' }] },
	{ id: 'seed-zh-feel', target: '觉得', reading: 'juéde', meaning: 'to feel / think', tags: ['daily', 'HSK2'], level: 'A2',
		examples: [{ target: '我觉得这个电影很好。', reading: 'Wǒ juéde zhège diànyǐng hěn hǎo.', meaning: 'I think this movie is great.' }] },
	{ id: 'seed-zh-already', target: '已经', reading: 'yǐjīng', meaning: 'already', tags: ['daily', 'HSK2'], level: 'A2',
		examples: [{ target: '我已经买票了。', reading: 'Wǒ yǐjīng mǎi piào le.', meaning: 'I have already bought the tickets.' }] },
	{ id: 'seed-zh-should', target: '应该', reading: 'yīnggāi', meaning: 'should / ought to', tags: ['daily', 'HSK3'], level: 'A2',
		examples: [{ target: '你应该早点睡。', reading: 'Nǐ yīnggāi zǎo diǎn shuì.', meaning: 'You should sleep earlier.' }] },
	{ id: 'seed-zh-maybe', target: '可能', reading: 'kěnéng', meaning: 'maybe / possible', tags: ['daily', 'HSK3'], level: 'A2',
		examples: [{ target: '明天可能下雨。', reading: 'Míngtiān kěnéng xià yǔ.', meaning: 'It might rain tomorrow.' }] },
	{ id: 'seed-zh-habit', target: '习惯', reading: 'xíguàn', meaning: 'habit / to be used to', tags: ['daily', 'HSK3'], level: 'A2',
		examples: [{ target: '我习惯早上喝咖啡。', reading: 'Wǒ xíguàn zǎoshang hē kāfēi.', meaning: 'I’m used to drinking coffee in the morning.' }] },
	{ id: 'seed-zh-because', target: '因为', reading: 'yīnwèi', meaning: 'because', kind: 'grammar', tags: ['grammar', 'connective', 'HSK2'], level: 'A2',
		examples: [{ target: '因为下雨，我没去。', reading: 'Yīnwèi xià yǔ, wǒ méi qù.', meaning: 'Because it rained, I didn’t go.' }] },
	{ id: 'seed-zh-so', target: '所以', reading: 'suǒyǐ', meaning: 'so / therefore', kind: 'grammar', tags: ['grammar', 'connective', 'HSK2'], level: 'A2',
		examples: [{ target: '我很累，所以早点睡了。', reading: 'Wǒ hěn lèi, suǒyǐ zǎo diǎn shuì le.', meaning: 'I was tired, so I went to bed early.' }] },
	{ id: 'seed-zh-butptn', target: '虽然', reading: 'suīrán', meaning: 'although', kind: 'grammar', tags: ['grammar', 'connective', 'HSK3'], level: 'A2',
		examples: [{ target: '虽然很贵，但是很好吃。', reading: 'Suīrán hěn guì, dànshì hěn hǎochī.', meaning: 'Although it’s expensive, it’s delicious.' }] }
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
		examples: [{ target: '来年日本へ行こうと思います。', reading: 'らいねんにほんへいこうとおもいます。', transliteration: 'Rainen Nihon e ikō to omoimasu.', meaning: 'I’m thinking of going to Japan next year.' }] },

	// — N3 batch: vocabulary & grammar —
	{ id: 'seed-ja-yakusoku', target: '約束', reading: 'やくそく', transliteration: 'yakusoku', meaning: 'promise / appointment', tags: ['noun', 'N4'], level: 'B1',
		examples: [{ target: '友達と約束があります。', reading: 'ともだちとやくそくがあります。', transliteration: 'Tomodachi to yakusoku ga arimasu.', meaning: 'I have plans with a friend.' }] },
	{ id: 'seed-ja-keiken', target: '経験', reading: 'けいけん', transliteration: 'keiken', meaning: 'experience', tags: ['noun', 'N3'], level: 'B1',
		examples: [{ target: 'いい経験になりました。', reading: 'いいけいけんになりました。', transliteration: 'Ii keiken ni narimashita.', meaning: 'It was a good experience.' }] },
	{ id: 'seed-ja-setsumei', target: '説明', reading: 'せつめい', transliteration: 'setsumei', meaning: 'explanation (する: to explain)', tags: ['noun', 'verb', 'N4'], level: 'B1',
		examples: [{ target: 'もう一度説明してください。', reading: 'もういちどせつめいしてください。', transliteration: 'Mō ichido setsumei shite kudasai.', meaning: 'Please explain once more.' }] },
	{ id: 'seed-ja-hitsuyou', target: '必要', reading: 'ひつよう', transliteration: 'hitsuyō', meaning: 'necessary / need', tags: ['adjective', 'N4'], level: 'B1',
		examples: [{ target: 'パスポートが必要です。', reading: 'パスポートがひつようです。', transliteration: 'Pasupōto ga hitsuyō desu.', meaning: 'A passport is necessary.' }] },
	{ id: 'seed-ja-renraku', target: '連絡', reading: 'れんらく', transliteration: 'renraku', meaning: 'contact (する: to get in touch)', tags: ['noun', 'verb', 'N4'], level: 'B1',
		examples: [{ target: '後で連絡します。', reading: 'あとでれんらくします。', transliteration: 'Ato de renraku shimasu.', meaning: 'I’ll contact you later.' }] },
	{ id: 'seed-ja-junbi', target: '準備', reading: 'じゅんび', transliteration: 'junbi', meaning: 'preparation (する: to prepare)', tags: ['noun', 'verb', 'N4'], level: 'B1',
		examples: [{ target: '旅行の準備をします。', reading: 'りょこうのじゅんびをします。', transliteration: 'Ryokō no junbi o shimasu.', meaning: 'I prepare for the trip.' }] },
	{ id: 'seed-ja-zannen', target: '残念', reading: 'ざんねん', transliteration: 'zannen', meaning: 'unfortunate / too bad', tags: ['adjective', 'N4'], level: 'B1',
		examples: [{ target: '行けなくて残念です。', reading: 'いけなくてざんねんです。', transliteration: 'Ikenakute zannen desu.', meaning: 'It’s a shame I can’t go.' }] },
	{ id: 'seed-ja-kyoumi', target: '興味', reading: 'きょうみ', transliteration: 'kyōmi', meaning: 'interest', tags: ['noun', 'N3'], level: 'B1',
		examples: [{ target: '日本の文化に興味があります。', reading: 'にほんのぶんかにきょうみがあります。', transliteration: 'Nihon no bunka ni kyōmi ga arimasu.', meaning: 'I’m interested in Japanese culture.' }] },
	{ id: 'seed-ja-saikin', target: '最近', reading: 'さいきん', transliteration: 'saikin', meaning: 'recently / lately', tags: ['time', 'N4'], level: 'B1',
		examples: [{ target: '最近、運動を始めました。', reading: 'さいきん、うんどうをはじめました。', transliteration: 'Saikin, undō o hajimemashita.', meaning: 'I recently started exercising.' }] },
	{ id: 'seed-ja-fueru', target: '増える', reading: 'ふえる', transliteration: 'fueru', meaning: 'to increase', tags: ['verb', 'N4'], level: 'B1',
		examples: [{ target: '在宅勤務が増えています。', reading: 'ざいたくきんむがふえています。', transliteration: 'Zaitaku kinmu ga fuete imasu.', meaning: 'Working from home is increasing.' }] },
	{ id: 'seed-ja-g-youni', target: '〜ように', reading: '〜ように', transliteration: 'yō ni', meaning: 'so that / in order to', kind: 'grammar', tags: ['grammar', 'N3'], level: 'B1',
		examples: [{ target: '忘れないようにメモします。', reading: 'わすれないようにメモします。', transliteration: 'Wasurenai yō ni memo shimasu.', meaning: 'I take notes so I won’t forget.' }] },
	{ id: 'seed-ja-g-hazu', target: '〜はずだ', reading: '〜はずだ', transliteration: 'hazu da', meaning: 'should / is expected to (be)', kind: 'grammar', tags: ['grammar', 'N3'], level: 'B1',
		examples: [{ target: '彼はもう着いたはずです。', reading: 'かれはもうついたはずです。', transliteration: 'Kare wa mō tsuita hazu desu.', meaning: 'He should have already arrived.' }] },
	{ id: 'seed-ja-g-okagede', target: '〜おかげで', reading: '〜おかげで', transliteration: 'okage de', meaning: 'thanks to (positive cause)', kind: 'grammar', tags: ['grammar', 'N3'], level: 'B1',
		examples: [{ target: 'あなたのおかげで助かりました。', reading: 'あなたのおかげでたすかりました。', transliteration: 'Anata no okage de tasukarimashita.', meaning: 'Thanks to you, I was saved.' }] }
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

// ===========================================================================
// Reading material — natural conversations & newspaper/non-fiction texts.
// ===========================================================================

interface PassageSpec {
	id: string;
	kind: PassageKind;
	title: string;
	level: string;
	tags: string[];
	intro?: string;
	lines: PassageLine[];
}

const ZH_PASSAGES: PassageSpec[] = [
	{
		id: 'pass-zh-weekend',
		kind: 'conversation',
		title: '周末看电影 — Making weekend plans',
		level: 'A2',
		tags: ['daily', 'plans', 'HSK2'],
		intro: 'Two friends text about going to a movie this weekend.',
		lines: [
			{ speaker: 'A', target: '这个周末你有空吗？', reading: 'Zhège zhōumò nǐ yǒu kòng ma?', meaning: 'Are you free this weekend?' },
			{ speaker: 'B', target: '有啊，怎么了？', reading: 'Yǒu a, zěnme le?', meaning: 'Yeah, what’s up?' },
			{ speaker: 'A', target: '我们一起去看电影吧。', reading: 'Wǒmen yìqǐ qù kàn diànyǐng ba.', meaning: 'Let’s go watch a movie together.' },
			{ speaker: 'B', target: '好主意！几点的？', reading: 'Hǎo zhǔyi! Jǐ diǎn de?', meaning: 'Good idea! What time?' },
			{ speaker: 'A', target: '下午三点，我用手机买票。', reading: 'Xiàwǔ sān diǎn, wǒ yòng shǒujī mǎi piào.', meaning: 'Three p.m. — I’ll buy the tickets on my phone.' },
			{ speaker: 'B', target: '太好了，到时候见！', reading: 'Tài hǎo le, dào shíhou jiàn!', meaning: 'Great, see you then!' }
		]
	},
	{
		id: 'pass-zh-cafe',
		kind: 'conversation',
		title: '在咖啡店 — Ordering at a café',
		level: 'A2',
		tags: ['daily', 'food', 'shopping'],
		intro: 'A customer orders a coffee and pays with their phone.',
		lines: [
			{ speaker: '店员', target: '您好，要点什么？', reading: 'Nín hǎo, yào diǎn shénme?', meaning: 'Hi, what would you like?' },
			{ speaker: '顾客', target: '一杯拿铁，谢谢。', reading: 'Yì bēi nátiě, xièxie.', meaning: 'A latte, thanks.' },
			{ speaker: '店员', target: '要大杯还是中杯？', reading: 'Yào dà bēi háishì zhōng bēi?', meaning: 'Large or medium?' },
			{ speaker: '顾客', target: '中杯就好。可以用手机支付吗？', reading: 'Zhōng bēi jiù hǎo. Kěyǐ yòng shǒujī zhīfù ma?', meaning: 'Medium is fine. Can I pay by phone?' },
			{ speaker: '店员', target: '当然可以，扫这个二维码。', reading: 'Dāngrán kěyǐ, sǎo zhège èrwéimǎ.', meaning: 'Of course, scan this QR code.' }
		]
	},
	{
		id: 'pass-zh-wfh',
		kind: 'text',
		title: '在家工作越来越普遍 — Working from home',
		level: 'A2',
		tags: ['society', 'work', 'tech'],
		intro: 'A short newspaper-style piece on remote work.',
		lines: [
			{ target: '近年来，越来越多的人选择在家工作。', reading: 'Jìnnián lái, yuèláiyuè duō de rén xuǎnzé zài jiā gōngzuò.', meaning: 'In recent years, more and more people choose to work from home.' },
			{ target: '有了网络和智能手机，人们可以随时开会。', reading: 'Yǒule wǎngluò hé zhìnéng shǒujī, rénmen kěyǐ suíshí kāihuì.', meaning: 'With the internet and smartphones, people can hold meetings anytime.' },
			{ target: '这样不但节省时间，也对环境有好处。', reading: 'Zhèyàng búdàn jiéshěng shíjiān, yě duì huánjìng yǒu hǎochù.', meaning: 'This not only saves time but is also good for the environment.' },
			{ target: '不过，有些人觉得在家很难集中注意力。', reading: 'Búguò, yǒuxiē rén juéde zài jiā hěn nán jízhōng zhùyìlì.', meaning: 'However, some people find it hard to concentrate at home.' }
		]
	},
	{
		id: 'pass-zh-restaurant',
		kind: 'conversation',
		title: '在饭馆点菜 — Ordering at a restaurant',
		level: 'A2',
		tags: ['daily', 'food'],
		intro: 'A waiter takes an order at a casual restaurant.',
		lines: [
			{ speaker: '服务员', target: '您好，几位？', reading: 'Nín hǎo, jǐ wèi?', meaning: 'Hello, how many people?' },
			{ speaker: '顾客', target: '两位。有什么推荐的菜吗？', reading: 'Liǎng wèi. Yǒu shénme tuījiàn de cài ma?', meaning: 'Two. Any recommended dishes?' },
			{ speaker: '服务员', target: '我们的牛肉面很有名。', reading: 'Wǒmen de niúròumiàn hěn yǒumíng.', meaning: 'Our beef noodles are famous.' },
			{ speaker: '顾客', target: '好，那来两碗，再要两杯茶。', reading: 'Hǎo, nà lái liǎng wǎn, zài yào liǎng bēi chá.', meaning: 'Great, two bowls then, and two teas as well.' },
			{ speaker: '服务员', target: '好的，请稍等。', reading: 'Hǎo de, qǐng shāo děng.', meaning: 'Sure, please wait a moment.' }
		]
	},
	{
		id: 'pass-zh-directions',
		kind: 'conversation',
		title: '问路 — Asking for directions',
		level: 'A2',
		tags: ['daily', 'travel'],
		intro: 'Finding the subway station on the street.',
		lines: [
			{ speaker: 'A', target: '请问，地铁站在哪里？', reading: 'Qǐngwèn, dìtiězhàn zài nǎlǐ?', meaning: 'Excuse me, where is the subway station?' },
			{ speaker: 'B', target: '一直往前走，到红绿灯左转。', reading: 'Yìzhí wǎng qián zǒu, dào hónglǜdēng zuǒ zhuǎn.', meaning: 'Go straight ahead, turn left at the traffic light.' },
			{ speaker: 'A', target: '远吗？', reading: 'Yuǎn ma?', meaning: 'Is it far?' },
			{ speaker: 'B', target: '不远，走五分钟就到了。', reading: 'Bù yuǎn, zǒu wǔ fēnzhōng jiù dào le.', meaning: 'Not far, five minutes on foot.' },
			{ speaker: 'A', target: '谢谢！我用手机地图看看。', reading: 'Xièxie! Wǒ yòng shǒujī dìtú kànkan.', meaning: 'Thanks! I’ll check on my phone map.' }
		]
	},
	{
		id: 'pass-zh-reschedule',
		kind: 'conversation',
		title: '改时间 — Rescheduling',
		level: 'A2',
		tags: ['daily', 'plans'],
		intro: 'Moving a meeting to another day by message.',
		lines: [
			{ speaker: 'A', target: '不好意思，我今天有事，能改到明天吗？', reading: 'Bù hǎoyìsi, wǒ jīntiān yǒu shì, néng gǎi dào míngtiān ma?', meaning: 'Sorry, something came up today — can we move it to tomorrow?' },
			{ speaker: 'B', target: '没问题，明天几点？', reading: 'Méi wèntí, míngtiān jǐ diǎn?', meaning: 'No problem, what time tomorrow?' },
			{ speaker: 'A', target: '下午两点怎么样？', reading: 'Xiàwǔ liǎng diǎn zěnmeyàng?', meaning: 'How about 2 p.m.?' },
			{ speaker: 'B', target: '可以，到时候发消息给我。', reading: 'Kěyǐ, dào shíhou fā xiāoxi gěi wǒ.', meaning: 'Sure, message me when it’s time.' }
		]
	},
	{
		id: 'pass-zh-mobilepay',
		kind: 'text',
		title: '手机支付 — Paying with your phone',
		level: 'A2',
		tags: ['society', 'tech', 'money'],
		intro: 'A short piece on mobile-payment culture.',
		lines: [
			{ target: '在中国，很多人出门不带钱包。', reading: 'Zài Zhōngguó, hěn duō rén chūmén bú dài qiánbāo.', meaning: 'In China, many people leave home without a wallet.' },
			{ target: '无论买菜还是坐车，都可以用手机扫码支付。', reading: 'Wúlùn mǎi cài háishì zuò chē, dōu kěyǐ yòng shǒujī sǎomǎ zhīfù.', meaning: 'Whether buying groceries or taking transit, you can pay by scanning a code with your phone.' },
			{ target: '这种方式又快又方便。', reading: 'Zhè zhǒng fāngshì yòu kuài yòu fāngbiàn.', meaning: 'This way is both fast and convenient.' },
			{ target: '不过，有些老人觉得不太习惯。', reading: 'Búguò, yǒuxiē lǎorén juéde bú tài xíguàn.', meaning: 'However, some older people find it hard to get used to.' }
		]
	},
	{
		id: 'pass-zh-hsr',
		kind: 'text',
		title: '高铁 — High-speed rail',
		level: 'A2',
		tags: ['society', 'travel', 'tech'],
		intro: 'A short newspaper-style piece on high-speed trains.',
		lines: [
			{ target: '中国的高铁发展得非常快。', reading: 'Zhōngguó de gāotiě fāzhǎn de fēicháng kuài.', meaning: 'China’s high-speed rail has developed very fast.' },
			{ target: '从北京到上海只要四个多小时。', reading: 'Cóng Běijīng dào Shànghǎi zhǐ yào sì gè duō xiǎoshí.', meaning: 'From Beijing to Shanghai takes only a little over four hours.' },
			{ target: '很多人坐高铁去外地工作或者旅游。', reading: 'Hěn duō rén zuò gāotiě qù wàidì gōngzuò huòzhě lǚyóu.', meaning: 'Many people take the high-speed rail to work or travel in other cities.' },
			{ target: '车上又安静又舒服。', reading: 'Chē shàng yòu ānjìng yòu shūfu.', meaning: 'On board it’s quiet and comfortable.' }
		]
	}
];

const JA_PASSAGES: PassageSpec[] = [
	{
		id: 'pass-ja-plans',
		kind: 'conversation',
		title: '週末の予定 — Weekend plans',
		level: 'N3',
		tags: ['daily', 'plans'],
		intro: 'Two friends message about checking out a new café.',
		lines: [
			{ speaker: 'A', target: '今週末、暇？', reading: 'こんしゅうまつ、ひま？', transliteration: 'Konshūmatsu, hima?', meaning: 'Are you free this weekend?' },
			{ speaker: 'B', target: 'うん、特に予定はないよ。', reading: 'うん、とくによていはないよ。', transliteration: 'Un, toku ni yotei wa nai yo.', meaning: 'Yeah, no special plans.' },
			{ speaker: 'A', target: 'じゃあ、新しいカフェに行かない？', reading: 'じゃあ、あたらしいカフェにいかない？', transliteration: 'Jā, atarashii kafe ni ikanai?', meaning: 'Then shall we go to the new café?' },
			{ speaker: 'B', target: 'いいね。インスタで見て、行きたかったんだ。', reading: 'いいね。インスタでみて、いきたかったんだ。', transliteration: 'Ii ne. Insuta de mite, ikitakatta n da.', meaning: 'Nice. I saw it on Instagram and wanted to go.' },
			{ speaker: 'A', target: 'じゃあ、11時に駅で待ち合わせしよう。', reading: 'じゃあ、じゅういちじにえきでまちあわせしよう。', transliteration: 'Jā, jūichi-ji ni eki de machiawase shiyō.', meaning: 'Then let’s meet at the station at eleven.' }
		]
	},
	{
		id: 'pass-ja-work',
		kind: 'conversation',
		title: '仕事のお願い — A favor at work',
		level: 'N3',
		tags: ['work', 'polite'],
		intro: 'Asking a colleague to check a document — polite workplace Japanese.',
		lines: [
			{ speaker: 'A', target: 'すみません、この資料、確認してもらえますか。', reading: 'すみません、このしりょう、かくにんしてもらえますか。', transliteration: 'Sumimasen, kono shiryō, kakunin shite moraemasu ka.', meaning: 'Excuse me, could you check this document?' },
			{ speaker: 'B', target: 'いいですよ。午後でもいいですか。', reading: 'いいですよ。ごごでもいいですか。', transliteration: 'Ii desu yo. Gogo demo ii desu ka.', meaning: 'Sure. Is the afternoon okay?' },
			{ speaker: 'A', target: 'もちろんです。よろしくお願いします。', reading: 'もちろんです。よろしくおねがいします。', transliteration: 'Mochiron desu. Yoroshiku onegai shimasu.', meaning: 'Of course. Thank you very much.' }
		]
	},
	{
		id: 'pass-ja-sleep',
		kind: 'text',
		title: 'スマホと睡眠 — Smartphones and sleep',
		level: 'N3',
		tags: ['society', 'health', 'tech'],
		intro: 'A short non-fiction passage on screens and sleep.',
		lines: [
			{ target: '最近、寝る前にスマホを使う人が増えている。', reading: 'さいきん、ねるまえにスマホをつかうひとがふえている。', transliteration: 'Saikin, neru mae ni sumaho o tsukau hito ga fuete iru.', meaning: 'Recently, more people use their smartphones before bed.' },
			{ target: '画面の光は脳を刺激し、眠りにくくすると言われている。', reading: 'がめんのひかりはのうをしげきし、ねむりにくくするといわれている。', transliteration: 'Gamen no hikari wa nō o shigeki shi, nemurinikuku suru to iwarete iru.', meaning: 'The screen’s light stimulates the brain and is said to make sleep harder.' },
			{ target: '専門家は、寝る一時間前にはスマホをやめるよう勧めている。', reading: 'せんもんかは、ねるいちじかんまえにはスマホをやめるようすすめている。', transliteration: 'Senmonka wa, neru ichi-jikan mae ni wa sumaho o yameru yō susumete iru.', meaning: 'Experts recommend stopping smartphone use an hour before sleeping.' }
		]
	},
	{
		id: 'pass-ja-konbini-talk',
		kind: 'conversation',
		title: 'コンビニで — At the convenience store',
		level: 'N3',
		tags: ['daily', 'food'],
		intro: 'Checking out at a convenience store.',
		lines: [
			{ speaker: '店員', target: 'いらっしゃいませ。', reading: 'いらっしゃいませ。', transliteration: 'Irasshaimase.', meaning: 'Welcome.' },
			{ speaker: '客', target: 'これ、温めてもらえますか。', reading: 'これ、あたためてもらえますか。', transliteration: 'Kore, atatamete moraemasu ka.', meaning: 'Could you heat this up?' },
			{ speaker: '店員', target: 'はい。お箸はおつけしますか。', reading: 'はい。おはしはおつけしますか。', transliteration: 'Hai. O-hashi wa o-tsuke shimasu ka.', meaning: 'Yes. Shall I add chopsticks?' },
			{ speaker: '客', target: 'お願いします。あと、これも。', reading: 'おねがいします。あと、これも。', transliteration: 'Onegai shimasu. Ato, kore mo.', meaning: 'Please. And this too.' },
			{ speaker: '店員', target: '合わせて650円です。', reading: 'あわせてろっぴゃくごじゅうえんです。', transliteration: 'Awasete roppyaku-gojū en desu.', meaning: 'That’s 650 yen altogether.' }
		]
	},
	{
		id: 'pass-ja-lunch',
		kind: 'conversation',
		title: 'ランチに誘う — Inviting a coworker to lunch',
		level: 'N3',
		tags: ['work', 'food'],
		intro: 'Casual workplace small talk over lunch plans.',
		lines: [
			{ speaker: 'A', target: 'お昼、一緒にどうですか。', reading: 'おひる、いっしょにどうですか。', transliteration: 'O-hiru, issho ni dō desu ka.', meaning: 'How about lunch together?' },
			{ speaker: 'B', target: 'いいですね。何が食べたいですか。', reading: 'いいですね。なにがたべたいですか。', transliteration: 'Ii desu ne. Nani ga tabetai desu ka.', meaning: 'Sounds good. What do you feel like eating?' },
			{ speaker: 'A', target: '駅前に新しいラーメン屋ができたんです。', reading: 'えきまえにあたらしいラーメンやができたんです。', transliteration: 'Ekimae ni atarashii rāmen-ya ga dekita n desu.', meaning: 'A new ramen shop opened in front of the station.' },
			{ speaker: 'B', target: '行きましょう。混む前に出ましょうか。', reading: 'いきましょう。こむまえにでましょうか。', transliteration: 'Ikimashō. Komu mae ni demashō ka.', meaning: 'Let’s go. Shall we leave before it gets crowded?' }
		]
	},
	{
		id: 'pass-ja-traindelay',
		kind: 'conversation',
		title: '電車の遅れ — A train delay',
		level: 'N3',
		tags: ['travel', 'daily'],
		intro: 'Asking station staff about a delay.',
		lines: [
			{ speaker: 'A', target: 'すみません、電車、遅れていますか。', reading: 'すみません、でんしゃ、おくれていますか。', transliteration: 'Sumimasen, densha, okurete imasu ka.', meaning: 'Excuse me, is the train delayed?' },
			{ speaker: 'B', target: 'ええ、事故で10分ほど遅れているそうです。', reading: 'ええ、じこでじゅっぷんほどおくれているそうです。', transliteration: 'Ee, jiko de juppun hodo okurete iru sō desu.', meaning: 'Yes, it seems to be delayed about ten minutes due to an accident.' },
			{ speaker: 'A', target: 'そうですか。じゃあ、会社に連絡します。', reading: 'そうですか。じゃあ、かいしゃにれんらくします。', transliteration: 'Sō desu ka. Jā, kaisha ni renraku shimasu.', meaning: 'I see. Then I’ll contact the office.' }
		]
	},
	{
		id: 'pass-ja-konbini-text',
		kind: 'text',
		title: '日本のコンビニ — Convenience stores in Japan',
		level: 'N3',
		tags: ['society', 'daily'],
		intro: 'A non-fiction passage on what konbini do.',
		lines: [
			{ target: '日本のコンビニは、ただ買い物をする場所ではない。', reading: 'にほんのコンビニは、ただかいものをするばしょではない。', transliteration: 'Nihon no konbini wa, tada kaimono o suru basho de wa nai.', meaning: 'Convenience stores in Japan are not just places to shop.' },
			{ target: '料金の支払いや、荷物の受け取りもできる。', reading: 'りょうきんのしはらいや、にもつのうけとりもできる。', transliteration: 'Ryōkin no shiharai ya, nimotsu no uketori mo dekiru.', meaning: 'You can also pay bills and pick up packages.' },
			{ target: '24時間開いているので、とても便利だ。', reading: 'にじゅうよじかんあいているので、とてもべんりだ。', transliteration: 'Nijūyo-jikan aite iru node, totemo benri da.', meaning: 'Since they’re open 24 hours, they’re very convenient.' },
			{ target: '最近は、外国人の店員も増えている。', reading: 'さいきんは、がいこくじんのてんいんもふえている。', transliteration: 'Saikin wa, gaikokujin no ten’in mo fuete iru.', meaning: 'Recently, the number of foreign clerks is increasing too.' }
		]
	},
	{
		id: 'pass-ja-aging',
		kind: 'text',
		title: '高齢化社会 — An aging society',
		level: 'N3',
		tags: ['society', 'news'],
		intro: 'A short non-fiction passage on demographics.',
		lines: [
			{ target: '日本では、お年寄りの数が増えている。', reading: 'にほんでは、おとしよりのかずがふえている。', transliteration: 'Nihon de wa, o-toshiyori no kazu ga fuete iru.', meaning: 'In Japan, the number of elderly people is increasing.' },
			{ target: '一方で、子どもの数は減っている。', reading: 'いっぽうで、こどものかずはへっている。', transliteration: 'Ippō de, kodomo no kazu wa hette iru.', meaning: 'On the other hand, the number of children is decreasing.' },
			{ target: 'そのため、働く人が足りなくなると言われている。', reading: 'そのため、はたらくひとがたりなくなるといわれている。', transliteration: 'Sono tame, hataraku hito ga tarinaku naru to iwarete iru.', meaning: 'For that reason, it’s said there will be a shortage of workers.' },
			{ target: '政府はいろいろな対策を考えている。', reading: 'せいふはいろいろなたいさくをかんがえている。', transliteration: 'Seifu wa iroiro na taisaku o kangaete iru.', meaning: 'The government is considering various measures.' }
		]
	}
];

const HE_PASSAGES: PassageSpec[] = [
	{
		id: 'pass-he-cafe',
		kind: 'conversation',
		title: 'בְּבֵית קָפֶה — At a café',
		level: 'A2',
		tags: ['daily', 'food', 'shopping'],
		intro: 'Ordering a coffee — everyday spoken Hebrew.',
		lines: [
			{ speaker: 'לָקוֹחַ', target: 'שָׁלוֹם, אֲנִי רוֹצֶה קָפֶה, בְּבַקָּשָׁה.', reading: 'shalom, ani rotzeh kafeh, bevakasha.', meaning: 'Hello, I’d like a coffee, please.' },
			{ speaker: 'מוֹכֵר', target: 'גָּדוֹל אוֹ קָטָן?', reading: 'gadol o katan?', meaning: 'Large or small?' },
			{ speaker: 'לָקוֹחַ', target: 'גָּדוֹל, תּוֹדָה.', reading: 'gadol, todah.', meaning: 'Large, thanks.' },
			{ speaker: 'מוֹכֵר', target: 'עוֹד מַשֶּׁהוּ?', reading: 'od mashehu?', meaning: 'Anything else?' },
			{ speaker: 'לָקוֹחַ', target: 'לֹא, זֶה הַכֹּל.', reading: 'lo, ze hakol.', meaning: 'No, that’s all.' }
		]
	},
	{
		id: 'pass-he-meet',
		kind: 'conversation',
		title: 'פְּגִישָׁה עִם חָבֵר — Meeting a friend',
		level: 'A1',
		tags: ['daily', 'greeting'],
		intro: 'A casual greeting between friends.',
		lines: [
			{ speaker: 'א', target: 'הֵיי, מָה נִשְׁמָע?', reading: 'hey, ma nishma?', meaning: 'Hey, how’s it going?' },
			{ speaker: 'ב', target: 'הַכֹּל טוֹב, תּוֹדָה. וְאַתָּה?', reading: 'hakol tov, todah. ve’ata?', meaning: 'All good, thanks. And you?' },
			{ speaker: 'א', target: 'גַּם טוֹב. בָּא לְךָ לֶאֱכֹל מַשֶּׁהוּ?', reading: 'gam tov. ba lecha le’echol mashehu?', meaning: 'Good too. Feel like grabbing something to eat?' },
			{ speaker: 'ב', target: 'בְּטַח, אֲנִי רָעֵב.', reading: 'betach, ani ra’ev.', meaning: 'Sure, I’m hungry.' }
		]
	},
	{
		id: 'pass-he-telaviv',
		kind: 'text',
		title: 'הָעִיר תֵּל אָבִיב — The city of Tel Aviv',
		level: 'A2',
		tags: ['places', 'society'],
		intro: 'A short, simple descriptive text.',
		lines: [
			{ target: 'תֵּל אָבִיב הִיא עִיר גְּדוֹלָה בְּיִשְׂרָאֵל.', reading: 'tel aviv hi ir gdola be’Yisrael.', meaning: 'Tel Aviv is a big city in Israel.' },
			{ target: 'הַרְבֵּה אֲנָשִׁים גָּרִים וְעוֹבְדִים שָׁם.', reading: 'harbeh anashim garim ve’ovdim sham.', meaning: 'Many people live and work there.' },
			{ target: 'בָּעִיר יֵשׁ חוֹף יָם יָפֶה וְהַרְבֵּה בָּתֵּי קָפֶה.', reading: 'ba’ir yesh chof yam yafeh ve’harbeh batei kafeh.', meaning: 'In the city there is a beautiful beach and many cafés.' }
		]
	},
	{
		id: 'pass-he-directions',
		kind: 'conversation',
		title: 'אֵיךְ מַגִּיעִים? — Asking for directions',
		level: 'A2',
		tags: ['daily', 'travel'],
		intro: 'Asking a passer-by how to reach the station.',
		lines: [
			{ speaker: 'א', target: 'סְלִיחָה, אֵיפֹה הַתַּחֲנָה?', reading: 'slicha, eifo hatachana?', meaning: 'Excuse me, where is the station?' },
			{ speaker: 'ב', target: 'יָשָׁר וְאָז יְמִינָה.', reading: 'yashar ve’az yemina.', meaning: 'Straight, and then right.' },
			{ speaker: 'א', target: 'זֶה רָחוֹק?', reading: 'ze rachok?', meaning: 'Is it far?' },
			{ speaker: 'ב', target: 'לֹא, חָמֵשׁ דַּקּוֹת בְּרֶגֶל.', reading: 'lo, chamesh dakot beregel.', meaning: 'No, five minutes on foot.' },
			{ speaker: 'א', target: 'תּוֹדָה רַבָּה!', reading: 'todah rabah!', meaning: 'Thank you very much!' }
		]
	},
	{
		id: 'pass-he-phone',
		kind: 'conversation',
		title: 'שִׂיחַת טֶלֶפוֹן — A phone call',
		level: 'A2',
		tags: ['daily', 'plans'],
		intro: 'Friends make plans to meet up.',
		lines: [
			{ speaker: 'א', target: 'הַלּוֹ, מָה נִשְׁמָע?', reading: 'halo, ma nishma?', meaning: 'Hello, how are you?' },
			{ speaker: 'ב', target: 'בְּסֵדֶר, תּוֹדָה. אַתָּה פָּנוּי מָחָר?', reading: 'beseder, todah. ata panui machar?', meaning: 'Fine, thanks. Are you free tomorrow?' },
			{ speaker: 'א', target: 'כֵּן, בָּעֶרֶב.', reading: 'ken, ba’erev.', meaning: 'Yes, in the evening.' },
			{ speaker: 'ב', target: 'יוֹפִי, נִפָּגֵשׁ בְּשֶׁבַע.', reading: 'yofi, nipagesh besheva.', meaning: 'Great, let’s meet at seven.' },
			{ speaker: 'א', target: 'טוֹב, לְהִתְרָאוֹת!', reading: 'tov, lehitra’ot!', meaning: 'Okay, see you!' }
		]
	},
	{
		id: 'pass-he-weather',
		kind: 'text',
		title: 'מֶזֶג הָאֲוִיר — The weather',
		level: 'A2',
		tags: ['nature', 'daily'],
		intro: 'A simple text about the seasons in Israel.',
		lines: [
			{ target: 'בְּיִשְׂרָאֵל יֵשׁ קַיִץ חַם וְאָרֹךְ.', reading: 'be’Yisrael yesh kayitz cham ve’aroch.', meaning: 'In Israel there is a hot, long summer.' },
			{ target: 'בַּחֹרֶף יוֹרֵד גֶּשֶׁם, אֲבָל לֹא הַרְבֵּה.', reading: 'bachoref yored geshem, aval lo harbeh.', meaning: 'In winter it rains, but not a lot.' },
			{ target: 'הָאָבִיב נָעִים וְיָרֹק.', reading: 'ha’aviv na’im veyarok.', meaning: 'Spring is pleasant and green.' },
			{ target: 'הַרְבֵּה אֲנָשִׁים אוֹהֲבִים אֶת הַיָּם בַּקַּיִץ.', reading: 'harbeh anashim ohavim et hayam bakayitz.', meaning: 'Many people love the sea in summer.' }
		]
	},
	{
		id: 'pass-he-food',
		kind: 'text',
		title: 'הָאֹכֶל בְּיִשְׂרָאֵל — Food in Israel',
		level: 'A2',
		tags: ['food', 'culture'],
		intro: 'A short text about a beloved local food.',
		lines: [
			{ target: 'בְּיִשְׂרָאֵל אוֹהֲבִים לֶאֱכֹל חוּמוּס.', reading: 'be’Yisrael ohavim le’echol chumus.', meaning: 'In Israel people love to eat hummus.' },
			{ target: 'אֶפְשָׁר לִמְצֹא אוֹתוֹ כִּמְעַט בְּכָל מָקוֹם.', reading: 'efshar limtzo oto kim’at bechol makom.', meaning: 'You can find it almost everywhere.' },
			{ target: 'הַרְבֵּה אֲנָשִׁים אוֹכְלִים אוֹתוֹ עִם פִּיתָה.', reading: 'harbeh anashim ochlim oto im pita.', meaning: 'Many people eat it with pita.' },
			{ target: 'זֶה טָעִים, זוֹל וּבָרִיא.', reading: 'ze ta’im, zol uvari.', meaning: 'It’s tasty, cheap, and healthy.' }
		]
	}
];

const PASSAGE_SEED: Record<Language, PassageSpec[]> = { zh: ZH_PASSAGES, ja: JA_PASSAGES, he: HE_PASSAGES };

/** All seed passages as fully-formed `Passage`s with stable ids. */
export function seedPassages(now: number = Date.now()): Passage[] {
	const out: Passage[] = [];
	for (const [lang, specs] of Object.entries(PASSAGE_SEED) as [Language, PassageSpec[]][]) {
		for (const spec of specs) {
			out.push({
				id: spec.id,
				language: lang,
				kind: spec.kind,
				title: spec.title,
				level: spec.level,
				tags: spec.tags,
				intro: spec.intro,
				lines: spec.lines,
				createdAt: now,
				updatedAt: now
			});
		}
	}
	return out;
}

/** Seed passages not yet applied to a document (mirrors `seedsToApply`). */
export function passagesToApply(seededIds: Record<string, boolean> | undefined): Passage[] {
	const seeded = seededIds ?? {};
	return seedPassages().filter((p) => !seeded[p.id]);
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
