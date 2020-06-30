const path = require('path');
const utils = require('./razzle-config-utils.js');
const projectRootPath = path.resolve('.');
const registry = new utils.AddonConfigurationRegistry(projectRootPath);

module.exports = {
  components: 'src/components/**/*.jsx',
  ignore: [
    '**/*.test.jsx',
    '**/Contents/Contents*jsx',
    '**/Tile/Tile.jsx',
    '**/AnchorPlugin/index.jsx',
    '**/theme/AppExtras/AppExtras.jsx',
    '**/Widgets/SchemaWidgetFieldset.jsx',
    '**/ObjectBrowser.jsx',
  ],
  verbose: true,
  title: 'Volto Style Guide',
  showCode: true,
  showUsage: true,
  sections: [
    //   // {
    //   //   name: 'Introduction',
    //   //   content: 'docs/source/index.md',
    //   // },
    {
      name: 'Theme',
      components: 'src/components/theme/**/*.jsx',
      content: 'styleguide/theme.md',
    },
    //   // {
    //   //   name: 'Manage',
    //   //   components: 'src/components/manage/**/*.jsx',
    //   //   content: 'docs/manage.md',
    //   // },
  ],
  webpackConfig: {
    resolve: {
      alias: {
        '@plone/volto': `${registry.voltoPath}/src`,
        'load-volto-addons': `${projectRootPath}/dummy-addons-loader.js`,
      },
    },
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          loader: 'babel-loader',
        },
        {
          test: /\.(css|woff|woff2|ttf|eot|svg|png|gif|jpg)(\?v=\d+\.\d+\.\d+)?$/,
          loader: 'url-loader',
          options: {
            limit: 10000,
          },
        },
      ],
    },
  },
};
