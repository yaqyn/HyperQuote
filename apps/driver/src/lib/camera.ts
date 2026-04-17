import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

export type CameraError = {
	code: 'PERMISSION_DENIED' | 'CANCELLED' | 'UNKNOWN'
	message: string
}

function toCameraError(err: unknown): CameraError {
	const message = err instanceof Error ? err.message : String(err)

	if (message.includes('cancelled') || message.includes('canceled')) {
		return { code: 'CANCELLED', message }
	}
	if (message.includes('permission') || message.includes('denied')) {
		return { code: 'PERMISSION_DENIED', message }
	}
	return { code: 'UNKNOWN', message }
}

/**
 * Capture a photo from the device camera.
 * Compresses to 1920px max dimension, JPEG quality 0.7 (70).
 * Returns the webPath URI string, or null if cancelled/errored.
 */
export async function capturePhoto(): Promise<string | null> {
	try {
		const photo = await Camera.getPhoto({
			quality: 70,
			allowEditing: false,
			resultType: CameraResultType.Uri,
			source: CameraSource.Camera,
			width: 1920,
			height: 1920,
		})
		return photo.webPath ?? null
	} catch (err) {
		const cameraErr = toCameraError(err)
		if (cameraErr.code === 'CANCELLED') return null
		throw cameraErr
	}
}

/**
 * Select a photo from the device gallery.
 * Same compression settings as capturePhoto.
 */
export async function capturePhotoFromGallery(): Promise<string | null> {
	try {
		const photo = await Camera.getPhoto({
			quality: 70,
			allowEditing: false,
			resultType: CameraResultType.Uri,
			source: CameraSource.Photos,
			width: 1920,
			height: 1920,
		})
		return photo.webPath ?? null
	} catch (err) {
		const cameraErr = toCameraError(err)
		if (cameraErr.code === 'CANCELLED') return null
		throw cameraErr
	}
}

/**
 * Check if camera permission is currently granted.
 */
export async function checkCameraPermission(): Promise<boolean> {
	try {
		const status = await Camera.checkPermissions()
		return status.camera === 'granted'
	} catch {
		return false
	}
}

/**
 * Request camera permission from the user.
 * Returns true if granted.
 */
export async function requestCameraPermission(): Promise<boolean> {
	try {
		const status = await Camera.requestPermissions()
		return status.camera === 'granted'
	} catch {
		return false
	}
}
