import * as Clipboard from 'expo-clipboard';

/**
 * Puts text on the system clipboard.
 *
 * Browsers only allow this in secure contexts, so a refusal resolves to
 * false instead of throwing — the caller can say "copy blocked" rather
 * than pretending it worked.
 */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}
