import {
	BarcodeFormat,
	BarcodeScanner,
} from '@capacitor-mlkit/barcode-scanning'

/**
 * Check/request camera permission for barcode scanning.
 */
export async function checkScanPermission(): Promise<boolean> {
	const { camera } = await BarcodeScanner.checkPermissions()
	if (camera === 'granted') return true
	if (camera === 'denied') return false
	const result = await BarcodeScanner.requestPermissions()
	return result.camera === 'granted'
}

/**
 * Open ML Kit scanner overlay and scan QR/Code128/Code39/EAN13/EAN8.
 * Returns the raw barcode value or null if no barcode detected.
 */
export async function scanBarcode(): Promise<string | null> {
	const granted = await checkScanPermission()
	if (!granted) return null

	const { barcodes } = await BarcodeScanner.scan({
		formats: [
			BarcodeFormat.QrCode,
			BarcodeFormat.Code128,
			BarcodeFormat.Code39,
			BarcodeFormat.Ean13,
			BarcodeFormat.Ean8,
		],
	})

	return barcodes.length > 0 ? (barcodes[0].rawValue ?? null) : null
}
