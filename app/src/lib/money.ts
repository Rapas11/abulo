/**
 * Money helpers. All amounts in the app are kobo (integers) until display.
 */

/** Format kobo as naira text, e.g. 119000 -> "₦1,190". */
export function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  const hasKobo = Math.round(kobo) % 100 !== 0;
  return `₦${naira.toLocaleString('en-NG', {
    minimumFractionDigits: hasKobo ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}
