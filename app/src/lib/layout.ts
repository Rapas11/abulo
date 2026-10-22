import { useWindowDimensions } from 'react-native';

/**
 * Width cap for screen content.
 *
 * Phones are always narrower than the old 480 dp cap, so the app keeps its
 * phone layout there. On the web the content fills the whole browser window
 * instead of being stuck in a narrow column with empty space on both sides.
 */
export function useContentMaxWidth(): number {
  return useWindowDimensions().width;
}
