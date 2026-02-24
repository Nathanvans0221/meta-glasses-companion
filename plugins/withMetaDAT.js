/**
 * Expo config plugin that configures the URL scheme for Meta AI app OAuth
 * callbacks and sets up Info.plist entries for DAT SDK.
 *
 * NOTE: The actual DAT SDK binary (MWDATCore, MWDATCamera) is not injected
 * via this plugin because SPM packages can't be imported by CocoaPods pods.
 * The Swift module uses #if canImport() for conditional compilation.
 * When the SDK binaries are vendored into the module, the imports will
 * resolve automatically.
 */
const { withInfoPlist } = require('@expo/config-plugins');

const URL_SCHEME = 'worksuitevoice';

/**
 * Add URL scheme for Meta AI callback + analytics opt-out.
 */
function withMetaDATInfoPlist(config) {
  return withInfoPlist(config, (config) => {
    // Add URL scheme for Meta AI OAuth callback
    if (!config.modResults.CFBundleURLTypes) {
      config.modResults.CFBundleURLTypes = [];
    }

    const hasScheme = config.modResults.CFBundleURLTypes.some(
      (entry) => entry.CFBundleURLSchemes && entry.CFBundleURLSchemes.includes(URL_SCHEME),
    );

    if (!hasScheme) {
      config.modResults.CFBundleURLTypes.push({
        CFBundleURLName: 'com.silverfern.worksuitevoice',
        CFBundleURLSchemes: [URL_SCHEME],
      });
    }

    // Opt out of DAT analytics
    config.modResults.MWDAT = {
      Analytics: {
        OptOut: true,
      },
    };

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
