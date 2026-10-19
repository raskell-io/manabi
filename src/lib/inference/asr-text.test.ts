import { describe, expect, it } from 'vitest';
import { cleanTranscript, maxTokensFor } from './asr-text';

describe('cleanTranscript', () => {
	it('drops stock hallucinations', () => {
		for (const t of ['谢谢观看', ' 請不吝點贊 訂閱 轉發 打賞支持明鏡與點點欄目', 'ご視聴ありがとうございました', '시청해 주셔서 감사합니다', 'Thank you for watching!']) {
			expect(cleanTranscript(t)).toBe('');
		}
	});
	it('keeps real speech', () => {
		expect(cleanTranscript(' 谢谢 ')).toBe('谢谢');
		expect(cleanTranscript('ありがとうございます')).toBe('ありがとうございます');
		expect(cleanTranscript('감사합니다')).toBe('감사합니다');
		expect(cleanTranscript('תודה רבה')).toBe('תודה רבה');
	});
});

describe('maxTokensFor', () => {
	it('scales with the clip and stays bounded', () => {
		expect(maxTokensFor(0.5)).toBe(11);
		expect(maxTokensFor(3)).toBe(26);
		expect(maxTokensFor(60)).toBe(96);
	});
});
