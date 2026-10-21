/**
 * Expo config: everything lives in app.json, except the web base URL.
 *
 * GitHub Pages serves a project site from /<repo>/, and the web build is
 * published under /<repo>/app/, so the static export has to prefix every asset
 * and router link. `scripts/build-site.mjs` sets EXPO_BASE_URL before exporting;
 * plain `npx expo start` leaves it empty and keeps the app at the domain root.
 */
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL?.trim();

  return {
    ...config,
    experiments: {
      ...config.experiments,
      ...(baseUrl ? { baseUrl } : {}),
    },
  };
};
