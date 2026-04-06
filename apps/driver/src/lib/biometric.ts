import { NativeBiometric } from '@capgo/capacitor-native-biometric'

const SERVER_KEY = 'hyperquote-driver'

/**
 * Check if biometric authentication is available on this device.
 * Returns availability and type (fingerprint, face, etc).
 */
export async function isBiometricAvailable(): Promise<{
  isAvailable: boolean
  biometryType: number
}> {
  try {
    const result = await NativeBiometric.isAvailable({ useFallback: false })
    return { isAvailable: result.isAvailable, biometryType: result.biometryType }
  } catch {
    return { isAvailable: false, biometryType: 0 }
  }
}

/**
 * Enroll biometric credentials. Stores phone + pinHash in secure keychain.
 */
export async function enrollBiometric(
  phone: string,
  pinHash: string,
): Promise<boolean> {
  try {
    await NativeBiometric.setCredentials({
      username: phone,
      password: pinHash,
      server: SERVER_KEY,
    })
    return true
  } catch {
    return false
  }
}

/**
 * Verify biometric identity and retrieve stored credentials.
 * Returns { username (phone), password (pinHash) } or null on failure.
 */
export async function verifyBiometric(): Promise<{
  username: string
  password: string
} | null> {
  try {
    await NativeBiometric.verifyIdentity({
      reason: 'Verify your identity',
      title: 'HyperQuote Driver',
      useFallback: true,
    })
    const credentials = await NativeBiometric.getCredentials({
      server: SERVER_KEY,
    })
    return credentials
  } catch {
    return null
  }
}

/**
 * Remove stored biometric credentials.
 */
export async function deleteBiometric(): Promise<void> {
  try {
    await NativeBiometric.deleteCredentials({ server: SERVER_KEY })
  } catch {
    // Ignore -- may not exist
  }
}
