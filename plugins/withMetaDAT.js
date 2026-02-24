/**
 * Expo config plugin that configures Info.plist for the Meta Wearables DAT SDK.
 *
 * Required entries:
 * - URL scheme for Meta AI OAuth callback
 * - MWDAT config (AppLinkURLScheme, MetaAppID, ClientToken, TeamID, analytics opt-out)
 * - Background modes (bluetooth-peripheral, external-accessory)
 * - External accessory protocols (com.meta.ar.wearable)
 * - Bluetooth usage description
 */
const { withInfoPlist } = require('@expo/config-plugins');

const URL_SCHEME = 'worksuitevoice';
const APPLE_TEAM_ID = 'W8KD69X9P8';

/**
 * Configure all DAT SDK Info.plist entries.
 */
function withMetaDATInfoPlist(config) {
  return withInfoPlist(config, (config) => {
    // ─── URL Scheme for Meta AI callback ──────────────────────────
    if (!config.modResults.CFBundleURLTypes) {
      config.modResults.CFBundleURLTypes = [];
    }

    const hasScheme = config.modResults.CFBundleURLTypes.some(
      (entry) => entry.CFBundleURLSchemes && entry.CFBundleURLSchemes.includes(URL_SCHEME),
    );

    if (!hasScheme) {
      config.modResults.CFBundleURLTypes.push({
        CFBundleTypeRole: 'Editor',
        CFBundleURLName: 'com.silverfern.worksuitevoice',
        CFBundleURLSchemes: [URL_SCHEME],
      });
    }

    // ─── MWDAT SDK Configuration ──────────────────────────────────
    config.modResults.MWDAT = {
      // URL scheme with :// suffix — DAT SDK uses this to redirect back from Meta AI
      AppLinkURLScheme: `${URL_SCHEME}://`,
      // MetaAppID and ClientToken from Wearables Developer Center
      // In Developer Mode these can be empty strings, but must be present
      MetaAppID: process.env.META_APP_ID || '',
      ClientToken: process.env.META_CLIENT_TOKEN || '',
      // Apple Developer Team ID
      TeamID: APPLE_TEAM_ID,
      // Opt out of DAT analytics
      Analytics: {
        OptOut: true,
      },
    };

    // ─── Background Modes ─────────────────────────────────────────
    if (!config.modResults.UIBackgroundModes) {
      config.modResults.UIBackgroundModes = [];
    }
    const requiredModes = ['bluetooth-peripheral', 'external-accessory'];
    for (const mode of requiredModes) {
      if (!config.modResults.UIBackgroundModes.includes(mode)) {
        config.modResults.UIBackgroundModes.push(mode);
      }
    }

    // ─── External Accessory Protocols ─────────────────────────────
    config.modResults.UISupportedExternalAccessoryProtocols = ['com.meta.ar.wearable'];

    // ─── Bluetooth Permission ─────────────────────────────────────
    if (!config.modResults.NSBluetoothAlwaysUsageDescription) {
      config.modResults.NSBluetoothAlwaysUsageDescription =
        'Needed to connect to Meta AI Glasses for hands-free WorkSuite operations.';
    }

    return config;
  });
}

/**
 * Main plugin entry point.
 */
function withMetaDAT(config) {
  config = withMetaDATInfoPlist(config);
  return config;
}

module.exports = withMetaDAT;
