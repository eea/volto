/* eslint import/no-extraneous-dependencies: 0 */
/* eslint import/no-dynamic-require: 0 */
/* eslint global-require: 0 */
/* eslint no-console: 0 */
/* eslint no-param-reassign: 0 */
/* eslint no-unused-vars: 0 */

const logger = require('razzle-dev-utils/logger');
const path = require('path');
const autoprefixer = require('autoprefixer');
const makeLoaderFinder = require('razzle-dev-utils/makeLoaderFinder');
const nodeExternals = require('webpack-node-externals');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const LoadablePlugin = require('@loadable/webpack-plugin');
const LodashModuleReplacementPlugin = require('lodash-webpack-plugin');
const fs = require('fs');
const { map, has } = require('lodash');
const glob = require('glob').sync;
const RootResolverPlugin = require('./webpack-root-resolver');
const createAddonsLoader = require('./create-addons-loader');

const fileLoaderFinder = makeLoaderFinder('file-loader');
const eslintLoaderFinder = makeLoaderFinder('eslint-loader');

const projectRootPath = path.resolve('.');

const packageJson = require(path.join(projectRootPath, 'package.json'));
const languages = require('./src/constants/Languages');

let voltoPath = `${projectRootPath}`;
if (packageJson.name !== '@plone/volto') {
  voltoPath = `${projectRootPath}/node_modules/@plone/volto`;
}

// Get the real disk path for all development packages (Volto addons)
const jsconfigPaths = {};
if (fs.existsSync(`${projectRootPath}/jsconfig.json`)) {
  const jsConfig = require(`${projectRootPath}/jsconfig`).compilerOptions;
  const pathsConfig = jsConfig.paths;
  Object.keys(pathsConfig).forEach((packageName) => {
    const packagePath = `${projectRootPath}/${jsConfig.baseUrl}/${pathsConfig[packageName][0]}`;
    jsconfigPaths[packageName] = packagePath;
    if (packageName === '@plone/volto') {
      voltoPath = packagePath;
    }
  });
}

// For npm released addons, treat them as development by aliasing their 'src'
// folder
const addonsAliases = {};
if (packageJson.addons) {
  const addons = packageJson.addons;
  addons.forEach((addon) => {
    const addonName = addon.split(':')[0];
    if (!(addonName in jsconfigPaths)) {
      const addonPath = `${projectRootPath}/node_modules/${addonName}/src`;
      addonsAliases[addonName] = addonPath;
    }
  });
}

// Now we have:
//  - development addons in jsconfigPath
//  - npm released addons in addonsAliases
const addonPaths = {
  ...jsconfigPaths,
  ...addonsAliases,
};

// Allow addons to provide razzle.config extenders. These extenders modules
// need to provide two functions: plugins(defaultPlugins) => plugins and
// modify(...) => config
const addonExtenders = [];
(packageJson.addons || []).forEach((name) => {
  const addonPath = addonPaths[name];
  const razzlePath = path.resolve(`${addonPath}/../razzle.config.js`);
  if (fs.existsSync(razzlePath)) {
    const razzle = require(razzlePath);
    addonExtenders.push(razzle);
  }
});

// TODO: apply "customize Volto by addon", "customize addon by project" logic
const customizations = {};
let { customizationPaths } = packageJson;
if (!customizationPaths) {
  customizationPaths = ['src/customizations/'];
}
customizationPaths.forEach((customizationPath) => {
  map(
    glob(`${customizationPath}**/*.*(svg|png|jpg|jpeg|gif|ico|less|js|jsx)`),
    (filename) => {
      const targetPath = filename.replace(
        customizationPath,
        `${voltoPath}/src/`,
      );
      if (fs.existsSync(targetPath)) {
        customizations[
          filename
            .replace(customizationPath, '@plone/volto/')
            .replace(/\.(js|jsx)$/, '')
        ] = path.resolve(filename);
      } else {
        console.log(
          `The file ${filename} doesn't exist in the volto package (${targetPath}), unable to customize.`,
        );
      }
    },
  );
});

const defaultPlugins = ['bundle-analyzer'];
const defaultModify = (config, { target, dev }, webpack) => {
  const BASE_CSS_LOADER = {
    loader: 'css-loader',
    options: {
      importLoaders: 2,
      sourceMap: true,
    },
  };
  const POST_CSS_LOADER = {
    loader: require.resolve('postcss-loader'),
    options: {
      sourceMap: true,
      // Necessary for external CSS imports to work
      // https://github.com/facebookincubator/create-react-app/issues/2677
      ident: 'postcss',
      plugins: () => [
        require('postcss-flexbugs-fixes'),
        autoprefixer({
          flexbox: 'no-2009',
        }),
      ],
    },
  };

  const LESSLOADER = {
    test: /\.less$/,
    include: [
      path.resolve('./theme'),
      /node_modules\/@plone\/volto\/theme/,
      /plone\.volto\/theme/,
      /node_modules\/semantic-ui-less/,
    ],
    use: dev
      ? [
          {
            loader: 'style-loader',
          },
          BASE_CSS_LOADER,
          POST_CSS_LOADER,
          {
            loader: 'less-loader',
            options: {
              sourceMap: true,
            },
          },
        ]
      : [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 2,
              sourceMap: true,
            },
          },
          POST_CSS_LOADER,
          {
            loader: 'less-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
  };

  const SVGLOADER = {
    test: /icons\/.*\.svg$/,
    use: [
      {
        loader: 'svg-loader',
      },
      {
        loader: 'svgo-loader',
        options: {
          plugins: [
            { removeTitle: true },
            { convertPathData: false },
            { removeUselessStrokeAndFill: true },
            { removeViewBox: false },
          ],
        },
      },
    ],
  };

  if (dev) {
    config.plugins.unshift(
      new webpack.DefinePlugin({
        __DEVELOPMENT__: true,
      }),
    );
  } else {
    config.plugins.unshift(
      new webpack.DefinePlugin({
        __DEVELOPMENT__: false,
      }),
    );
  }

  if (target === 'web') {
    config.plugins.unshift(
      new webpack.DefinePlugin({
        __CLIENT__: true,
        __SERVER__: false,
      }),
    );

    config.plugins.push(
      new LoadablePlugin({
        outputAsset: false,
        writeToDisk: { filename: path.resolve(`${projectRootPath}/build`) },
      }),
    );

    config.output.filename = dev
      ? 'static/js/[name].js'
      : 'static/js/[name].[chunkhash:8].js';

    config.optimization = Object.assign({}, config.optimization, {
      runtimeChunk: true,
      splitChunks: {
        chunks: 'all',
        name: dev,
      },
    });

    config.plugins.unshift(
      // restrict moment.js locales to en/de
      // see https://github.com/jmblog/how-to-optimize-momentjs-with-webpack for details
      new webpack.ContextReplacementPlugin(
        /moment[/\\]locale$/,
        new RegExp(Object.keys(languages).join('|')),
      ),
      new LodashModuleReplacementPlugin({
        shorthands: true,
        cloning: true,
        currying: true,
        caching: true,
        collections: true,
        exotics: true,
        guards: true,
        metadata: true,
        deburring: true,
        unicode: true,
        chaining: true,
        memoizing: true,
        coercions: true,
        flattening: true,
        paths: true,
        placeholders: true,
      }),
    );
  }

  if (target === 'node') {
    config.plugins.unshift(
      new webpack.DefinePlugin({
        __CLIENT__: false,
        __SERVER__: true,
      }),
    );
  }

  config.module.rules.push(LESSLOADER);
  config.module.rules.push(SVGLOADER);

  // Don't load config|variables|overrides) files with file-loader
  // Don't load SVGs from ./src/icons with file-loader
  const fileLoader = config.module.rules.find(fileLoaderFinder);
  fileLoader.exclude = [
    /\.(config|variables|overrides)$/,
    /icons\/.*\.svg$/,
    ...fileLoader.exclude,
  ];

  // Disabling the ESlint pre loader
  config.module.rules.splice(0, 1);

  const addonsLoaderPath = createAddonsLoader(packageJson.addons || []);

  config.resolve.plugins = [new RootResolverPlugin()];

  config.resolve.alias = {
    ...customizations,
    ...config.resolve.alias,
    '../../theme.config$': `${projectRootPath}/theme/theme.config`,
    'load-volto-addons': addonsLoaderPath,
    ...addonsAliases,
    ...jsconfigPaths,
    '@plone/volto': `${voltoPath}/src`,
    // to be able to reference path uncustomized by webpack
    '@plone/volto-original': `${voltoPath}/src`,
    // be able to reference current package from customized package
    '@package': `${projectRootPath}/src`,
  };

  config.performance = {
    maxAssetSize: 10000000,
    maxEntrypointSize: 10000000,
  };

  const babelRuleIndex = config.module.rules.findIndex(
    (rule) =>
      rule.use &&
      rule.use[0].loader &&
      rule.use[0].loader.includes('babel-loader'),
  );
  const { include } = config.module.rules[babelRuleIndex];
  if (packageJson.name !== '@plone/volto') {
    include.push(fs.realpathSync(`${voltoPath}/src`));
  }
  // Add babel support external (ie. node_modules npm published packages)
  if (packageJson.addons) {
    packageJson.addons.forEach((addon) =>
      include.push(
        fs.realpathSync(`${projectRootPath}/node_modules/${addon}/src`),
      ),
    );
  }

  config.module.rules[babelRuleIndex] = Object.assign(
    config.module.rules[babelRuleIndex],
    {
      include,
    },
  );

  let addonsAsExternals = [];
  if (packageJson.addons) {
    addonsAsExternals = packageJson.addons.map((addon) => new RegExp(addon));
  }

  config.externals =
    target === 'node'
      ? [
          nodeExternals({
            whitelist: [
              dev ? 'webpack/hot/poll?300' : null,
              /\.(eot|woff|woff2|ttf|otf)$/,
              /\.(svg|png|jpg|jpeg|gif|ico)$/,
              /\.(mp4|mp3|ogg|swf|webp)$/,
              /\.(css|scss|sass|sss|less)$/,
              // Add support for whitelist external (ie. node_modules npm published packages)
              ...addonsAsExternals,
              /^@plone\/volto/,
            ].filter(Boolean),
          }),
        ]
      : [];

  return config;
};

const plugins = addonExtenders.reduce(
  (acc, extender) => extender.plugins(acc),
  defaultPlugins,
);

module.exports = {
  plugins: plugins,
  modify: (config, { target, dev }, webpack) => {
    const defaultConfig = defaultModify(config, { target, dev }, webpack);
    const res = addonExtenders.reduce(
      (acc, extender) => extender.modify(acc, { target, dev }, webpack),
      defaultConfig,
    );
    // logger.debug('config', res);
    return defaultConfig;
  },
};
