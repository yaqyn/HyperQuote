import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ChatMarkdown } from './ChatMarkdown'

describe('ChatMarkdown', () => {
	it('renders markdown tables as mobile cards and desktop tables', () => {
		const markup = renderToStaticMarkup(
			<ChatMarkdown
				content={[
					'| Order | Driver | Place |',
					'| --- | --- | --- |',
					'| ORD-2026-00001 | Driver | in Al Farik Kamal Amer Axis, Egypt Bank Towers, Been Al-Sarayat, Giza |',
				].join('\n')}
				isArabic={false}
			/>,
		)

		expect(markup).toContain('sm:hidden')
		expect(markup).toContain('<dl')
		expect(markup).toContain('sm:block')
		expect(markup).toContain('min-w-[560px]')
		expect(markup).toContain('Place')
	})
})
