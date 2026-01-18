import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

/**
 * Calculate SHA-256 hash of a string
 * @param content - String to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Calculate SHA-256 hash of a Buffer
 * @param buffer - Buffer to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function sha256Buffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Calculate SHA-256 hash of a file
 * @param filePath - Path to file
 * @returns Promise resolving to hex-encoded SHA-256 hash
 */
export async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Verify that content matches expected checksum
 * @param content - String to verify
 * @param expectedChecksum - Expected SHA-256 hash (hex-encoded)
 * @returns true if checksum matches
 */
export function verifyChecksum(content: string, expectedChecksum: string): boolean {
  const actualChecksum = sha256(content);
  return actualChecksum.toLowerCase() === expectedChecksum.toLowerCase();
}

/**
 * Verify that a file matches expected checksum
 * @param filePath - Path to file
 * @param expectedChecksum - Expected SHA-256 hash (hex-encoded)
 * @returns Promise resolving to true if checksum matches
 */
export async function verifyFileChecksum(
  filePath: string,
  expectedChecksum: string
): Promise<boolean> {
  const actualChecksum = await sha256File(filePath);
  return actualChecksum.toLowerCase() === expectedChecksum.toLowerCase();
}

/**
 * Generate a checksum for an audit entry
 * Creates a deterministic hash of entry fields for integrity verification
 * @param entry - Object containing entry fields
 * @returns SHA-256 hash of serialized entry
 */
export function checksumEntry(entry: Record<string, unknown>): string {
  // Create a copy without the checksum field
  const { checksum: _, ...fields } = entry;

  // Sort keys for deterministic serialization
  const sortedKeys = Object.keys(fields).sort();
  const parts = sortedKeys.map((key) => `${key}:${JSON.stringify(fields[key])}`);

  return sha256(parts.join('|'));
}

/**
 * Verify integrity of an audit entry
 * @param entry - Entry object containing a checksum field
 * @returns true if entry checksum is valid
 */
export function verifyEntryChecksum(
  entry: Record<string, unknown> & { checksum: string }
): boolean {
  const expectedChecksum = checksumEntry(entry);
  return expectedChecksum === entry.checksum;
}

/**
 * Generate a short checksum (first 8 characters)
 * Useful for display purposes
 * @param content - String to hash
 * @returns First 8 characters of SHA-256 hash
 */
export function shortChecksum(content: string): string {
  return sha256(content).substring(0, 8);
}
