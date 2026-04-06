import { vi } from 'vitest'

// Mock @capacitor/camera
vi.mock('@capacitor/camera', () => ({
  Camera: {
    getPhoto: vi.fn().mockResolvedValue({
      webPath: 'mock://photo.jpg',
      format: 'jpeg',
    }),
    checkPermissions: vi.fn().mockResolvedValue({ camera: 'granted', photos: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ camera: 'granted', photos: 'granted' }),
  },
  CameraResultType: { Uri: 'uri', Base64: 'base64', DataUrl: 'dataUrl' },
  CameraSource: { Prompt: 'PROMPT', Camera: 'CAMERA', Photos: 'PHOTOS' },
}))

// Mock @capacitor/geolocation
vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    checkPermissions: vi.fn().mockResolvedValue({ location: 'granted', coarseLocation: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ location: 'granted', coarseLocation: 'granted' }),
    getCurrentPosition: vi.fn().mockResolvedValue({
      coords: {
        latitude: 30.0444,
        longitude: 31.2357,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    }),
    watchPosition: vi.fn().mockReturnValue('watch-id-1'),
    clearWatch: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock @capgo/capacitor-native-biometric
vi.mock('@capgo/capacitor-native-biometric', () => ({
  NativeBiometric: {
    isAvailable: vi.fn().mockResolvedValue({ isAvailable: true, biometryType: 1 }),
    verifyIdentity: vi.fn().mockResolvedValue(undefined),
    getCredentials: vi.fn().mockResolvedValue({ username: 'test', password: 'test' }),
    setCredentials: vi.fn().mockResolvedValue(undefined),
    deleteCredentials: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock @capacitor/preferences with in-memory store
const preferencesStore = new Map<string, string>()

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockImplementation(({ key }: { key: string }) =>
      Promise.resolve({ value: preferencesStore.get(key) ?? null }),
    ),
    set: vi.fn().mockImplementation(({ key, value }: { key: string; value: string }) => {
      preferencesStore.set(key, value)
      return Promise.resolve()
    }),
    remove: vi.fn().mockImplementation(({ key }: { key: string }) => {
      preferencesStore.delete(key)
      return Promise.resolve()
    }),
    clear: vi.fn().mockImplementation(() => {
      preferencesStore.clear()
      return Promise.resolve()
    }),
    keys: vi.fn().mockImplementation(() =>
      Promise.resolve({ keys: Array.from(preferencesStore.keys()) }),
    ),
  },
}))

// Mock @capacitor/app
vi.mock('@capacitor/app', () => ({
  App: {
    getInfo: vi.fn().mockResolvedValue({
      name: 'HyperQuote Driver',
      id: 'net.hyperquote.driver',
      build: '1',
      version: '1.0.0',
    }),
    getLaunchUrl: vi.fn().mockResolvedValue({ url: '' }),
    getState: vi.fn().mockResolvedValue({ isActive: true }),
    addListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
    removeAllListeners: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock @capacitor/haptics
vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
    vibrate: vi.fn().mockResolvedValue(undefined),
    selectionStart: vi.fn().mockResolvedValue(undefined),
    selectionChanged: vi.fn().mockResolvedValue(undefined),
    selectionEnd: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: { Heavy: 'HEAVY', Medium: 'MEDIUM', Light: 'LIGHT' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}))

// Mock @capacitor/status-bar
vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setStyle: vi.fn().mockResolvedValue(undefined),
    setBackgroundColor: vi.fn().mockResolvedValue(undefined),
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
    getInfo: vi.fn().mockResolvedValue({ visible: true, style: 'DEFAULT' }),
    setOverlaysWebView: vi.fn().mockResolvedValue(undefined),
  },
  Style: { Dark: 'DARK', Light: 'LIGHT', Default: 'DEFAULT' },
}))

// Mock @capacitor/splash-screen
vi.mock('@capacitor/splash-screen', () => ({
  SplashScreen: {
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
  },
}))
