import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
	type CustomerQuoteCartProductRow,
	type CustomerQuoteCartRow,
	type CustomerQuoteCartStore,
	saveSyncedCustomerQuoteCart,
} from './server'

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111'

const product: CustomerQuoteCartProductRow = {
	availability_status: 'available',
	category: 'steel',
	category_name: 'Steel Products',
	category_name_ar: 'Steel Products AR',
	id: PRODUCT_ID,
	image_urls: ['https://assets.hyperquote.test/steel.jpg'],
	is_active: true,
	name: 'Steel bar',
	name_ar: 'Steel bar AR',
	slug: 'steel-bar',
	unit_of_measure: 'piece',
	unit_of_measure_ar: 'piece AR',
}

const currentCart: CustomerQuoteCartRow = {
	global_note: 'previous',
	items: [],
	updated_at: '2026-01-01T00:00:00.000Z',
	version: 7,
}

describe('saveSyncedCustomerQuoteCart', () => {
	it('uses the raw cart version without reloading orderable products', async () => {
		let productLookups = 0
		let cartLoads = 0
		let upsertedVersion = 0

		const store: CustomerQuoteCartStore = {
			async listOrderableProducts(productIds) {
				productLookups += 1
				assert.deepEqual(productIds, [PRODUCT_ID])
				return [product]
			},
			async loadCart(customerId) {
				cartLoads += 1
				assert.equal(customerId, 'customer-1')
				return currentCart
			},
			async updateCart() {
				throw new Error('save should not purge through updateCart')
			},
			async upsertCart(customerId, snapshot, source, version) {
				assert.equal(customerId, 'customer-1')
				assert.equal(source, 'website')
				upsertedVersion = version
				return {
					global_note: snapshot.globalNote,
					items: snapshot.items,
					updated_at: '2026-01-01T00:01:00.000Z',
					version,
				}
			},
		}

		const result = await saveSyncedCustomerQuoteCart({
			customerId: 'customer-1',
			input: {
				globalNote: 'Need a morning delivery',
				items: [
					{
						name: 'Old steel label',
						productId: PRODUCT_ID,
						quantity: 3,
						unitOfMeasure: 'piece',
					},
				],
				source: 'website',
			},
			store,
		})

		assert.equal(productLookups, 1)
		assert.equal(cartLoads, 1)
		assert.equal(upsertedVersion, 8)
		assert.equal(result.version, 8)
		assert.deepEqual(
			result.items.map((item) => ({
				name: item.name,
				productId: item.productId,
				quantity: item.quantity,
			})),
			[{ name: 'Steel bar', productId: PRODUCT_ID, quantity: 3 }],
		)
	})
})
