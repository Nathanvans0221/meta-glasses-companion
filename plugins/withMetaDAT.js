/**
 * Expo config plugin that adds Meta Wearables DAT SDK (Swift Package Manager)
 * and configures the URL scheme for Meta AI app OAuth callbacks.
 */
const {
  withXcodeProject,
  withInfoPlist,
} = require('@expo/config-plugins');

const DAT_REPO_URL = 'https://github.com/facebook/meta-wearables-dat-ios';
const DAT_VERSION = '0.4.0';
const URL_SCHEME = 'worksuitevoice';

/**
 * Add Swift Package Manager dependency for Meta DAT SDK.
 */
function withMetaDATPackage(config) {
  return withXcodeProject(config, async (config) => {
    const project = config.modResults;

    // Find the PBXProject object (defensive — works across xcode lib versions)
    const pbxProjectSection = project.hash.project.objects.PBXProject || {};
    let pbxProject;
    for (const key of Object.keys(pbxProjectSection)) {
      if (key.endsWith('_comment')) continue;
      if (typeof pbxProjectSection[key] === 'object') {
        pbxProject = pbxProjectSection[key];
        break;
      }
    }

    if (!pbxProject) {
      console.warn('[withMetaDAT] Could not find PBXProject — skipping SPM package injection');
      return config;
    }

    // Ensure packageReferences array exists
    if (!pbxProject.packageReferences) {
      pbxProject.packageReferences = [];
    }

    // Check if already added
    const existing = Object.values(project.hash.project.objects.XCRemoteSwiftPackageReference || {})
      .find((ref) => typeof ref === 'object' && ref.repositoryURL === `"${DAT_REPO_URL}"`);

    if (existing) {
      return config;
    }

    // Add remote package reference
    const packageRefUuid = project.generateUuid();
    if (!project.hash.project.objects.XCRemoteSwiftPackageReference) {
      project.hash.project.objects.XCRemoteSwiftPackageReference = {};
    }
    project.hash.project.objects.XCRemoteSwiftPackageReference[packageRefUuid] = {
      isa: 'XCRemoteSwiftPackageReference',
      repositoryURL: `"${DAT_REPO_URL}"`,
      requirement: {
        kind: 'upToNextMajorVersion',
        minimumVersion: DAT_VERSION,
      },
    };
    project.hash.project.objects.XCRemoteSwiftPackageReference[`${packageRefUuid}_comment`] =
      'meta-wearables-dat-ios';

    pbxProject.packageReferences.push({ value: packageRefUuid, comment: 'meta-wearables-dat-ios' });

    // Add package product dependencies to main target
    const firstTarget = project.getFirstTarget();
    if (!firstTarget) {
      console.warn('[withMetaDAT] Could not find first target — skipping product dependencies');
      return config;
    }
    const targetUuid = firstTarget.uuid;
    const target = project.hash.project.objects.PBXNativeTarget[targetUuid];

    if (!target) {
      console.warn('[withMetaDAT] Could not find PBXNativeTarget — skipping product dependencies');
      return config;
    }

    if (!target.packageProductDependencies) {
      target.packageProductDependencies = [];
    }

    if (!project.hash.project.objects.XCSwiftPackageProductDependency) {
      project.hash.project.objects.XCSwiftPackageProductDependency = {};
    }

    const products = ['MWDATCore', 'MWDATCamera'];
    for (const productName of products) {
      const depUuid = project.generateUuid();
      project.hash.project.objects.XCSwiftPackageProductDependency[depUuid] = {
        isa: 'XCSwiftPackageProductDependency',
        package: packageRefUuid,
        productName,
      };
      project.hash.project.objects.XCSwiftPackageProductDependency[`${depUuid}_comment`] = productName;
      target.packageProductDependencies.push({ value: depUuid, comment: productName });
    }

    return config;
  });
}

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
  config = withMetaDATPackage(config);
  config = withMetaDATInfoPlist(config);
  return config;
}

module.exports = withMetaDAT;
