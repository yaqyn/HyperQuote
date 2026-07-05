import { describe, expect, it } from 'vitest'
import { shouldRetryAlternateSpeechLanguage } from './useSpeechInput'

describe('speech language retry detection', () => {
	it('retries Arabic recognition for short English transliterations', () => {
		expect(shouldRetryAlternateSpeechLanguage('هاي', 'ar-EG')).toBe(true)
		expect(shouldRetryAlternateSpeechLanguage('هلو', 'ar-EG')).toBe(true)
	})

	it('retries English recognition for short Arabic transliterations', () => {
		expect(shouldRetryAlternateSpeechLanguage('marhaba', 'en-US')).toBe(true)
		expect(shouldRetryAlternateSpeechLanguage('salam', 'en-US')).toBe(true)
	})

	it('keeps normal language-matched transcripts', () => {
		expect(shouldRetryAlternateSpeechLanguage('hello', 'en-US')).toBe(false)
		expect(shouldRetryAlternateSpeechLanguage('مرحبا', 'ar-EG')).toBe(false)
		expect(shouldRetryAlternateSpeechLanguage('modern cement', 'en-US')).toBe(
			false,
		)
	})
})
