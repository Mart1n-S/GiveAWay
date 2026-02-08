const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

// 1. Définir les chemins : le projet mobile ET la racine du monorepo
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

// 2. Récupérer la config par défaut d'Expo
const config = getDefaultConfig(projectRoot);

// =================================================================
// 3. CONFIGURATION SVG
// =================================================================
const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  // Utilise react-native-svg-transformer pour convertir les SVG en composants
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

config.resolver = {
  ...resolver,
  // Exclut les .svg des fichiers "assets" (comme les images png/jpg)
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  // Ajoute les .svg aux fichiers "source" (comme le code js/ts)
  sourceExts: [...resolver.sourceExts, "svg"],
};

// =================================================================
// 4. CONFIGURATION MONOREPO
// =================================================================

// Dire à Metro de surveiller aussi le dossier racine (packages/)
config.watchFolders = [workspaceRoot];

// Aider Metro à trouver les node_modules (locaux + racine)
// Note: On ajoute cela à l'objet 'resolver' que nous venons de modifier plus haut
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Force la résolution unique des paquets (évite les doublons de React)
config.resolver.disableHierarchicalLookup = true;
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = [
    'require',
    'react-native',
    'default',
]
// =================================================================
// 5. EXPORT AVEC NATIVEWIND
// =================================================================
module.exports = withNativeWind(config, { input: "./global.css" });
