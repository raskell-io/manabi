// Hebrew roots (שׁוֹרָשִׁים) — hand-curated, A1–B1 everyday vocabulary.
//
// Each root lists its consonants (regular letter forms, no final forms, no
// shin/sin dot) and a handful of vowelled words built on it. Verbs are given
// in the present tense, masculine singular, like the seed ("write (m.)").
// A word that is also a seed item must use the seed's exact spelling (the
// roots test enforces this), so adding it from here never makes a duplicate.
//
// eslint-disable
/* prettier-ignore */
import type { HebrewRoot } from './roots';

export const ROOT_LIST: HebrewRoot[] = [
	{ id: 'ktv', letters: 'כתב', meaning: 'writing', words: [
		{ t: 'כּוֹתֵב', r: 'kotev', m: 'write (m.)', pos: 'verb' },
		{ t: 'מִכְתָּב', r: 'michtav', m: 'letter (mail)', pos: 'noun' },
		{ t: 'כְּתֹבֶת', r: 'ktovet', m: 'address', pos: 'noun' },
		{ t: 'כָּתוּב', r: 'katuv', m: 'written', pos: 'adj' },
		{ t: 'כַּתָּב', r: 'katav', m: 'reporter', pos: 'noun' }
	] },
	{ id: 'lmd', letters: 'למד', meaning: 'learning', words: [
		{ t: 'לוֹמֵד', r: 'lomed', m: 'study / learn (m.)', pos: 'verb' },
		{ t: 'מְלַמֵּד', r: 'melamed', m: 'teach (m.)', pos: 'verb' },
		{ t: 'תַּלְמִיד', r: 'talmid', m: 'pupil, student', pos: 'noun' },
		{ t: 'לִמּוּדִים', r: 'limudim', m: 'studies', pos: 'noun' },
		{ t: 'תַּלְמוּד', r: 'talmud', m: 'the Talmud (lit. “study”)', pos: 'noun' }
	] },
	{ id: 'spr', letters: 'ספר', meaning: 'counting · telling', note: 'Books, numbers and stories all come from one root: to count is to recount.', words: [
		{ t: 'סֵפֶר', r: 'sefer', m: 'book', pos: 'noun' },
		{ t: 'סִפְרִיָּה', r: 'sifriya', m: 'library', pos: 'noun' },
		{ t: 'סִפּוּר', r: 'sipur', m: 'story', pos: 'noun' },
		{ t: 'מְסַפֵּר', r: 'mesaper', m: 'tell (m.)', pos: 'verb' },
		{ t: 'מִסְפָּר', r: 'mispar', m: 'number', pos: 'noun' },
		{ t: 'סוֹפֵר', r: 'sofer', m: 'writer, author', pos: 'noun' },
		{ t: 'סַפָּר', r: 'sapar', m: 'barber', pos: 'noun' }
	] },
	{ id: 'dbr', letters: 'דבר', meaning: 'speaking', words: [
		{ t: 'מְדַבֵּר', r: 'medaber', m: 'speak (m.)', pos: 'verb' },
		{ t: 'דָּבָר', r: 'davar', m: 'thing; word', pos: 'noun' },
		{ t: 'דִּבּוּר', r: 'dibur', m: 'speech', pos: 'noun' },
		{ t: 'דּוֹבֵר', r: 'dover', m: 'spokesperson', pos: 'noun' }
	] },
	{ id: 'akl', letters: 'אכל', meaning: 'eating', words: [
		{ t: 'אוֹכֵל', r: 'ochel', m: 'eat (m.)', pos: 'verb' },
		{ t: 'אֹכֶל', r: 'ochel', m: 'food', pos: 'noun' },
		{ t: 'מַאֲכָל', r: 'ma’achal', m: 'dish, food', pos: 'noun' },
		{ t: 'אֲכִילָה', r: 'achila', m: 'eating', pos: 'noun' },
		{ t: 'מַאֲכִיל', r: 'ma’achil', m: 'feed (m.)', pos: 'verb' }
	] },
	{ id: 'avd', letters: 'עבד', meaning: 'working', words: [
		{ t: 'עוֹבֵד', r: 'oved', m: 'work (m.)', pos: 'verb' },
		{ t: 'עֲבוֹדָה', r: 'avoda', m: 'work, job', pos: 'noun' },
		{ t: 'מַעְבָּדָה', r: 'ma’abada', m: 'laboratory', pos: 'noun' },
		{ t: 'עִבּוּד', r: 'ibud', m: 'processing; adaptation', pos: 'noun' }
	] },
	{ id: 'hlch', letters: 'הלכ', meaning: 'walking', words: [
		{ t: 'הוֹלֵךְ', r: 'holech', m: 'go / walk (m.)', pos: 'verb' },
		{ t: 'הֲלִיכָה', r: 'halicha', m: 'walk, walking', pos: 'noun' },
		{ t: 'תַּהֲלִיךְ', r: 'tahalich', m: 'process', pos: 'noun' },
		{ t: 'מַהֲלָךְ', r: 'mahalach', m: 'move; course', pos: 'noun' }
	] },
	{ id: 'sth', letters: 'שתה', meaning: 'drinking', words: [
		{ t: 'שׁוֹתֶה', r: 'shoteh', m: 'drink (m.)', pos: 'verb' },
		{ t: 'שְׁתִיָּה', r: 'shtiya', m: 'drinking; a drink', pos: 'noun' },
		{ t: 'מִשְׁתֶּה', r: 'mishteh', m: 'feast, banquet', pos: 'noun' }
	] },
	{ id: 'kra', letters: 'קרא', meaning: 'reading · calling', words: [
		{ t: 'קוֹרֵא', r: 'kore', m: 'read (m.)', pos: 'verb' },
		{ t: 'קְרִיאָה', r: 'kri’a', m: 'reading', pos: 'noun' },
		{ t: 'נִקְרָא', r: 'nikra', m: 'is called (m.)', pos: 'verb' },
		{ t: 'מִקְרָא', r: 'mikra', m: 'scripture (lit. “what is read”)', pos: 'noun' }
	] },
	{ id: 'chbr', letters: 'חבר', meaning: 'joining', words: [
		{ t: 'חָבֵר', r: 'chaver', m: 'friend', pos: 'noun' },
		{ t: 'חֲבֵרָה', r: 'chavera', m: 'friend (f.); girlfriend', pos: 'noun' },
		{ t: 'חֶבְרָה', r: 'chevra', m: 'company; society', pos: 'noun' },
		{ t: 'מַחְבֶּרֶת', r: 'machberet', m: 'notebook', pos: 'noun' },
		{ t: 'חִבּוּר', r: 'chibur', m: 'connection; essay', pos: 'noun' },
		{ t: 'מְחֻבָּר', r: 'mechubar', m: 'connected', pos: 'adj' }
	] },
	{ id: 'yld', letters: 'ילד', meaning: 'birth · children', words: [
		{ t: 'יֶלֶד', r: 'yeled', m: 'boy / child', pos: 'noun' },
		{ t: 'יַלְדָּה', r: 'yalda', m: 'girl', pos: 'noun' },
		{ t: 'יְלָדִים', r: 'yeladim', m: 'children', pos: 'noun' },
		{ t: 'יַלְדוּת', r: 'yaldut', m: 'childhood', pos: 'noun' },
		{ t: 'מוֹלֶדֶת', r: 'moledet', m: 'homeland', pos: 'noun' },
		{ t: 'יוֹם הֻלֶּדֶת', r: 'yom huledet', m: 'birthday', pos: 'phrase' }
	] },
	{ id: 'rtzh', letters: 'רצה', meaning: 'wanting', words: [
		{ t: 'רוֹצֶה', r: 'rotzeh', m: 'want (m.)', pos: 'verb' },
		{ t: 'רָצוֹן', r: 'ratzon', m: 'will, wish', pos: 'noun' },
		{ t: 'רָצוּי', r: 'ratzuy', m: 'desirable', pos: 'adj' }
	] },
	{ id: 'gdl', letters: 'גדל', meaning: 'growing · big', words: [
		{ t: 'גָּדוֹל', r: 'gadol', m: 'big (m.)', pos: 'adj' },
		{ t: 'גָּדֵל', r: 'gadel', m: 'grow (m.)', pos: 'verb' },
		{ t: 'מְגַדֵּל', r: 'megadel', m: 'raise, grow (m.)', pos: 'verb' },
		{ t: 'מִגְדָּל', r: 'migdal', m: 'tower', pos: 'noun' },
		{ t: 'גֹּדֶל', r: 'godel', m: 'size', pos: 'noun' }
	] },
	{ id: 'chdsh', letters: 'חדש', meaning: 'new', note: 'A month is a “renewal” — of the moon.', words: [
		{ t: 'חָדָשׁ', r: 'chadash', m: 'new (m.)', pos: 'adj' },
		{ t: 'חֹדֶשׁ', r: 'chodesh', m: 'month', pos: 'noun' },
		{ t: 'חֲדָשׁוֹת', r: 'chadashot', m: 'news', pos: 'noun' },
		{ t: 'חִדּוּשׁ', r: 'chidush', m: 'innovation', pos: 'noun' },
		{ t: 'מְחַדֵּשׁ', r: 'mechadesh', m: 'renew (m.)', pos: 'verb' }
	] },
	{ id: 'shlm', letters: 'שלמ', meaning: 'whole · peace', note: 'Peace is wholeness; paying makes things whole again.', words: [
		{ t: 'שָׁלוֹם', r: 'shalom', m: 'hello / peace', pos: 'noun' },
		{ t: 'שָׁלֵם', r: 'shalem', m: 'whole, complete', pos: 'adj' },
		{ t: 'מְשַׁלֵּם', r: 'meshalem', m: 'pay (m.)', pos: 'verb' },
		{ t: 'תַּשְׁלוּם', r: 'tashlum', m: 'payment', pos: 'noun' }
	] },
	{ id: 'ydh', letters: 'ידה', meaning: 'thanking · admitting', note: 'The first letter י often shows up as ו: תּוֹדָה, מוֹדֶה.', words: [
		{ t: 'תּוֹדָה', r: 'todah', m: 'thank you', pos: 'noun' },
		{ t: 'מוֹדֶה', r: 'mode', m: 'thank; admit (m.)', pos: 'verb' },
		{ t: 'הוֹדָיָה', r: 'hodaya', m: 'thanksgiving', pos: 'noun' }
	] },
	{ id: 'slch', letters: 'סלח', meaning: 'forgiving', words: [
		{ t: 'סְלִיחָה', r: 'slicha', m: 'excuse me / sorry', pos: 'noun' },
		{ t: 'סוֹלֵחַ', r: 'sole’ach', m: 'forgive (m.)', pos: 'verb' },
		{ t: 'סַלְחָן', r: 'salchan', m: 'forgiving (person)', pos: 'adj' }
	] },
	{ id: 'bksh', letters: 'בקש', meaning: 'asking for', words: [
		{ t: 'בְּבַקָּשָׁה', r: 'bevakasha', m: 'please / you’re welcome', pos: 'phrase' },
		{ t: 'בַּקָּשָׁה', r: 'bakasha', m: 'request', pos: 'noun' },
		{ t: 'מְבַקֵּשׁ', r: 'mevakesh', m: 'ask for (m.)', pos: 'verb' },
		{ t: 'מְבֻקָּשׁ', r: 'mevukash', m: 'in demand; wanted', pos: 'adj' }
	] },
	{ id: 'yshv', letters: 'ישב', meaning: 'sitting · settling', words: [
		{ t: 'יוֹשֵׁב', r: 'yoshev', m: 'sit (m.)', pos: 'verb' },
		{ t: 'יְשִׁיבָה', r: 'yeshiva', m: 'meeting; yeshiva', pos: 'noun' },
		{ t: 'מוֹשָׁב', r: 'moshav', m: 'seat; moshav (village)', pos: 'noun' },
		{ t: 'תּוֹשָׁב', r: 'toshav', m: 'resident', pos: 'noun' },
		{ t: 'יִשּׁוּב', r: 'yishuv', m: 'settlement', pos: 'noun' }
	] },
	{ id: 'ahv', letters: 'אהב', meaning: 'love', words: [
		{ t: 'אוֹהֵב', r: 'ohev', m: 'love, like (m.)', pos: 'verb' },
		{ t: 'אַהֲבָה', r: 'ahava', m: 'love', pos: 'noun' },
		{ t: 'אָהוּב', r: 'ahuv', m: 'beloved', pos: 'adj' },
		{ t: 'מְאֹהָב', r: 'me’ohav', m: 'in love (m.)', pos: 'adj' }
	] },
	{ id: 'shma', letters: 'שמע', meaning: 'hearing', words: [
		{ t: 'שׁוֹמֵעַ', r: 'shome’a', m: 'hear (m.)', pos: 'verb' },
		{ t: 'שְׁמוּעָה', r: 'shmu’a', m: 'rumor', pos: 'noun' },
		{ t: 'מַשְׁמָעוּת', r: 'mashma’ut', m: 'meaning', pos: 'noun' },
		{ t: 'מִשְׁמַעַת', r: 'mishma’at', m: 'discipline', pos: 'noun' }
	] },
	{ id: 'rah', letters: 'ראה', meaning: 'seeing', words: [
		{ t: 'רוֹאֶה', r: 'ro’eh', m: 'see (m.)', pos: 'verb' },
		{ t: 'מַרְאֶה', r: 'mar’eh', m: 'sight; appearance', pos: 'noun' },
		{ t: 'מַרְאָה', r: 'mar’a', m: 'mirror', pos: 'noun' },
		{ t: 'רֵאָיוֹן', r: 're’ayon', m: 'interview', pos: 'noun' }
	] },
	{ id: 'ash', letters: 'עשה', meaning: 'doing · making', words: [
		{ t: 'עוֹשֶׂה', r: 'oseh', m: 'do, make (m.)', pos: 'verb' },
		{ t: 'מַעֲשֶׂה', r: 'ma’aseh', m: 'deed; tale', pos: 'noun' },
		{ t: 'מַעֲשִׂי', r: 'ma’asi', m: 'practical', pos: 'adj' },
		{ t: 'עֲשִׂיָּה', r: 'asiya', m: 'doing, making', pos: 'noun' }
	] },
	{ id: 'nsa', letters: 'נסע', meaning: 'travelling', note: 'The first נ drops out when it meets another letter: מַסָּע.', words: [
		{ t: 'נוֹסֵעַ', r: 'nose’a', m: 'travel, ride (m.); passenger', pos: 'verb' },
		{ t: 'נְסִיעָה', r: 'nesi’a', m: 'trip, ride', pos: 'noun' },
		{ t: 'מַסָּע', r: 'masa', m: 'journey', pos: 'noun' }
	] },
	{ id: 'bwa', letters: 'בוא', meaning: 'coming', note: 'A “hollow” root: the middle ו often disappears, as in בָּא.', words: [
		{ t: 'בָּא', r: 'ba', m: 'come (m.)', pos: 'verb' },
		{ t: 'הַבָּא', r: 'haba', m: 'next (lit. “the coming”)', pos: 'adj' },
		{ t: 'מָבוֹא', r: 'mavo', m: 'introduction; entrance', pos: 'noun' },
		{ t: 'תְּבוּאָה', r: 'tvu’a', m: 'crop, yield', pos: 'noun' }
	] },
	{ id: 'kwm', letters: 'קומ', meaning: 'rising · standing', note: 'A hollow root: getting up, a place you stand, a floor of a building.', words: [
		{ t: 'קָם', r: 'kam', m: 'get up (m.)', pos: 'verb' },
		{ t: 'מָקוֹם', r: 'makom', m: 'place', pos: 'noun' },
		{ t: 'קוֹמָה', r: 'koma', m: 'floor, storey', pos: 'noun' },
		{ t: 'מְקוֹמִי', r: 'mekomi', m: 'local', pos: 'adj' },
		{ t: 'קִיּוּם', r: 'kiyum', m: 'existence', pos: 'noun' }
	] },
	{ id: 'shyr', letters: 'שיר', meaning: 'singing', words: [
		{ t: 'שָׁר', r: 'shar', m: 'sing (m.)', pos: 'verb' },
		{ t: 'שִׁיר', r: 'shir', m: 'song, poem', pos: 'noun' },
		{ t: 'שִׁירָה', r: 'shira', m: 'poetry; singing', pos: 'noun' },
		{ t: 'מְשׁוֹרֵר', r: 'meshorer', m: 'poet', pos: 'noun' }
	] },
	{ id: 'bshl', letters: 'בשל', meaning: 'cooking · ripening', words: [
		{ t: 'מְבַשֵּׁל', r: 'mevashel', m: 'cook (m.)', pos: 'verb' },
		{ t: 'בִּשּׁוּל', r: 'bishul', m: 'cooking', pos: 'noun' },
		{ t: 'תַּבְשִׁיל', r: 'tavshil', m: 'dish, stew', pos: 'noun' },
		{ t: 'בָּשֵׁל', r: 'bashel', m: 'ripe', pos: 'adj' }
	] },
	{ id: 'chshv', letters: 'חשב', meaning: 'thinking · counting', words: [
		{ t: 'חוֹשֵׁב', r: 'choshev', m: 'think (m.)', pos: 'verb' },
		{ t: 'מַחְשָׁבָה', r: 'machshava', m: 'thought', pos: 'noun' },
		{ t: 'מַחְשֵׁב', r: 'machshev', m: 'computer', pos: 'noun' },
		{ t: 'חָשׁוּב', r: 'chashuv', m: 'important', pos: 'adj' },
		{ t: 'חֶשְׁבּוֹן', r: 'cheshbon', m: 'bill; account', pos: 'noun' }
	] },
	{ id: 'zchr', letters: 'זכר', meaning: 'remembering', words: [
		{ t: 'זוֹכֵר', r: 'zocher', m: 'remember (m.)', pos: 'verb' },
		{ t: 'זִכָּרוֹן', r: 'zikaron', m: 'memory', pos: 'noun' },
		{ t: 'מַזְכִּיר', r: 'mazkir', m: 'secretary', pos: 'noun' },
		{ t: 'מַזְכֶּרֶת', r: 'mazkeret', m: 'souvenir', pos: 'noun' }
	] },
	{ id: 'shal', letters: 'שאל', meaning: 'asking', words: [
		{ t: 'שׁוֹאֵל', r: 'sho’el', m: 'ask (m.)', pos: 'verb' },
		{ t: 'שְׁאֵלָה', r: 'she’ela', m: 'question', pos: 'noun' },
		{ t: 'שְׁאֵלוֹן', r: 'she’elon', m: 'questionnaire', pos: 'noun' },
		{ t: 'מִשְׁאָל', r: 'mish’al', m: 'poll', pos: 'noun' }
	] },
	{ id: 'shwv', letters: 'שוב', meaning: 'returning', note: 'An answer is a “return”; so is repentance.', words: [
		{ t: 'שָׁב', r: 'shav', m: 'return (m.)', pos: 'verb' },
		{ t: 'תְּשׁוּבָה', r: 'tshuva', m: 'answer; repentance', pos: 'noun' },
		{ t: 'מֵשִׁיב', r: 'meshiv', m: 'reply (m.)', pos: 'verb' },
		{ t: 'שׁוּב', r: 'shuv', m: 'again', pos: 'other' }
	] },
	{ id: 'azr', letters: 'עזר', meaning: 'helping', words: [
		{ t: 'עוֹזֵר', r: 'ozer', m: 'help (m.)', pos: 'verb' },
		{ t: 'עֶזְרָה', r: 'ezra', m: 'help', pos: 'noun' },
		{ t: 'עוֹזֶרֶת', r: 'ozeret', m: 'assistant (f.)', pos: 'noun' }
	] },
	{ id: 'ptch', letters: 'פתח', meaning: 'opening', words: [
		{ t: 'פּוֹתֵחַ', r: 'pote’ach', m: 'open (m.)', pos: 'verb' },
		{ t: 'פָּתוּחַ', r: 'patu’ach', m: 'open (adj.)', pos: 'adj' },
		{ t: 'מַפְתֵּחַ', r: 'mafte’ach', m: 'key', pos: 'noun' },
		{ t: 'פֶּתַח', r: 'petach', m: 'opening', pos: 'noun' },
		{ t: 'פִּתּוּחַ', r: 'pitu’ach', m: 'development', pos: 'noun' }
	] },
	{ id: 'sgr', letters: 'סגר', meaning: 'closing', words: [
		{ t: 'סוֹגֵר', r: 'soger', m: 'close (m.)', pos: 'verb' },
		{ t: 'סָגוּר', r: 'sagur', m: 'closed', pos: 'adj' },
		{ t: 'מִסְגֶּרֶת', r: 'misgeret', m: 'frame', pos: 'noun' },
		{ t: 'סֶגֶר', r: 'seger', m: 'lockdown', pos: 'noun' }
	] },
	{ id: 'knh', letters: 'קנה', meaning: 'buying', words: [
		{ t: 'קוֹנֶה', r: 'koneh', m: 'buy (m.)', pos: 'verb' },
		{ t: 'קְנִיָּה', r: 'kniya', m: 'purchase', pos: 'noun' },
		{ t: 'קַנְיוֹן', r: 'kanyon', m: 'shopping mall', pos: 'noun' }
	] },
	{ id: 'avr', letters: 'עבר', meaning: 'crossing · past', note: 'Traditionally, the Hebrews were “the ones from across” (the river).', words: [
		{ t: 'עוֹבֵר', r: 'over', m: 'pass, cross (m.)', pos: 'verb' },
		{ t: 'עָבָר', r: 'avar', m: 'the past', pos: 'noun' },
		{ t: 'מַעֲבָר', r: 'ma’avar', m: 'passage; transition', pos: 'noun' },
		{ t: 'עִבְרִית', r: 'ivrit', m: 'Hebrew (language)', pos: 'noun' },
		{ t: 'עִבְרִי', r: 'ivri', m: 'Hebrew (person)', pos: 'noun' }
	] },
	{ id: 'shmr', letters: 'שמר', meaning: 'guarding · keeping', words: [
		{ t: 'שׁוֹמֵר', r: 'shomer', m: 'guard, keep (m.)', pos: 'verb' },
		{ t: 'שְׁמִירָה', r: 'shmira', m: 'guarding', pos: 'noun' },
		{ t: 'מִשְׁמֶרֶת', r: 'mishmeret', m: 'shift (at work)', pos: 'noun' },
		{ t: 'שָׁמוּר', r: 'shamur', m: 'reserved', pos: 'adj' }
	] },
	{ id: 'ntn', letters: 'נתנ', meaning: 'giving', note: 'The first נ drops out: תֵּן “give!”, and hides in the doubled ת of מַתָּנָה.', words: [
		{ t: 'נוֹתֵן', r: 'noten', m: 'give (m.)', pos: 'verb' },
		{ t: 'מַתָּנָה', r: 'matana', m: 'gift', pos: 'noun' },
		{ t: 'נְתוּנִים', r: 'netunim', m: 'data', pos: 'noun' },
		{ t: 'תֵּן', r: 'ten', m: 'give! (m.)', pos: 'verb' }
	] },
	{ id: 'lvsh', letters: 'לבש', meaning: 'clothing', words: [
		{ t: 'לוֹבֵשׁ', r: 'lovesh', m: 'wear (m.)', pos: 'verb' },
		{ t: 'לְבוּשׁ', r: 'levush', m: 'clothing, attire', pos: 'noun' },
		{ t: 'מִתְלַבֵּשׁ', r: 'mitlabesh', m: 'get dressed (m.)', pos: 'verb' },
		{ t: 'תִּלְבֹּשֶׁת', r: 'tilboshet', m: 'costume', pos: 'noun' }
	] },
	{ id: 'shva', letters: 'שבע', meaning: 'seven', note: 'A week is a “seven” of days.', words: [
		{ t: 'שָׁבוּעַ', r: 'shavua', m: 'week', pos: 'noun' },
		{ t: 'שֶׁבַע', r: 'sheva', m: 'seven (f.)', pos: 'other' },
		{ t: 'שִׁבְעָה', r: 'shiv’a', m: 'seven (m.); shiva', pos: 'other' },
		{ t: 'שְׁבוּעָה', r: 'shvu’a', m: 'oath', pos: 'noun' }
	] },
	{ id: 'lchm', letters: 'לחמ', meaning: 'bread · fighting', words: [
		{ t: 'לֶחֶם', r: 'lechem', m: 'bread', pos: 'noun' },
		{ t: 'לַחְמָנִיָּה', r: 'lachmaniya', m: 'bread roll', pos: 'noun' },
		{ t: 'מִלְחָמָה', r: 'milchama', m: 'war', pos: 'noun' },
		{ t: 'לוֹחֵם', r: 'lochem', m: 'fighter', pos: 'noun' }
	] },
	{ id: 'chlv', letters: 'חלב', meaning: 'milk', words: [
		{ t: 'חָלָב', r: 'chalav', m: 'milk', pos: 'noun' },
		{ t: 'חָלָבִי', r: 'chalavi', m: 'dairy', pos: 'adj' },
		{ t: 'חֶלְבּוֹן', r: 'chelbon', m: 'protein; egg white', pos: 'noun' }
	] },
	{ id: 'tzva', letters: 'צבע', meaning: 'colour', words: [
		{ t: 'צֶבַע', r: 'tseva', m: 'color', pos: 'noun' },
		{ t: 'צוֹבֵעַ', r: 'tsove’a', m: 'paint, dye (m.)', pos: 'verb' },
		{ t: 'צִבְעוֹנִי', r: 'tsiv’oni', m: 'colorful', pos: 'adj' },
		{ t: 'צַבָּע', r: 'tsaba', m: 'painter (houses)', pos: 'noun' }
	] },
	{ id: 'adm', letters: 'אדמ', meaning: 'red · earth', note: 'Adam, the first human, was formed from the (red) earth.', words: [
		{ t: 'אָדֹם', r: 'adom', m: 'red (m.)', pos: 'adj' },
		{ t: 'אָדָם', r: 'adam', m: 'person, human', pos: 'noun' },
		{ t: 'אֲדָמָה', r: 'adama', m: 'earth, soil', pos: 'noun' }
	] },
	{ id: 'rsh', letters: 'ראש', meaning: 'head · first', words: [
		{ t: 'רֹאשׁ', r: 'rosh', m: 'head', pos: 'noun' },
		{ t: 'רִאשׁוֹן', r: 'rishon', m: 'first', pos: 'adj' },
		{ t: 'רָאשִׁי', r: 'rashi', m: 'main', pos: 'adj' },
		{ t: 'רֵאשִׁית', r: 'reshit', m: 'beginning', pos: 'noun' },
		{ t: 'רֹאשׁ הַשָּׁנָה', r: 'rosh hashana', m: 'Jewish New Year', pos: 'phrase' }
	] },
	{ id: 'tam', letters: 'טעמ', meaning: 'tasting', words: [
		{ t: 'טָעִים', r: 'ta’im', m: 'tasty', pos: 'adj' },
		{ t: 'טַעַם', r: 'ta’am', m: 'taste; reason', pos: 'noun' },
		{ t: 'טוֹעֵם', r: 'to’em', m: 'taste (m.)', pos: 'verb' }
	] },
	{ id: 'shlch', letters: 'שלח', meaning: 'sending', words: [
		{ t: 'שׁוֹלֵחַ', r: 'shole’ach', m: 'send (m.)', pos: 'verb' },
		{ t: 'שָׁלִיחַ', r: 'shali’ach', m: 'messenger, courier', pos: 'noun' },
		{ t: 'מִשְׁלוֹחַ', r: 'mishlo’ach', m: 'delivery', pos: 'noun' },
		{ t: 'שֻׁלְחָן', r: 'shulchan', m: 'table', pos: 'noun' }
	] },
	{ id: 'tyl', letters: 'טיל', meaning: 'outings', words: [
		{ t: 'מְטַיֵּל', r: 'metayel', m: 'hike, travel (m.)', pos: 'verb' },
		{ t: 'טִיּוּל', r: 'tiyul', m: 'trip, outing', pos: 'noun' },
		{ t: 'טַיֶּלֶת', r: 'tayelet', m: 'promenade', pos: 'noun' }
	] },
	{ id: 'yph', letters: 'יפה', meaning: 'beauty', words: [
		{ t: 'יָפֶה', r: 'yafe', m: 'beautiful (m.)', pos: 'adj' },
		{ t: 'יָפָה', r: 'yafa', m: 'beautiful (f.)', pos: 'adj' },
		{ t: 'יֹפִי', r: 'yofi', m: 'beauty; “great!”', pos: 'noun' }
	] }
];
