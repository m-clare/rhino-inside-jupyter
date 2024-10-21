const path = require('path');
const webpack = require('webpack');
const version = require('./package.json').version;
const nodePolyfillPlugin = require('node-polyfill-webpack-plugin');

// Custom webpack rules
const rules = [
  { test: /\.ts$/, loader: 'ts-loader' },
  { test: /\.js$/, loader: 'source-map-loader' },
  { test: /\.css$/, use: ['style-loader', 'css-loader'] },
  {
    test: /rhino3dm(\.module)?(\.min)?\.js$/,
    use: [
      {
        loader: 'string-replace-loader',
        options: {
          multiple: [
            {
              search: 'var ENVIRONMENT_IS_NODE =',
              replace:
                'console.log("Compilation: Evaluating ENVIRONMENT_IS_NODE"); var ENVIRONMENT_IS_NODE =',
            },
            {
              search: 'var ENVIRONMENT_IS_WEB =',
              replace:
                'console.log("Compilation: Evaluating ENVIRONMENT_IS_WEB"); var ENVIRONMENT_IS_WEB =',
            },
            {
              search: 'var ENVIRONMENT_IS_WORKER =',
              replace:
                'console.log("Compilation: Evaluating ENVIRONMENT_IS_WORKER"); var ENVIRONMENT_IS_WORKER =',
            },
            {
              search: 'if (ENVIRONMENT_IS_NODE) {',
              replace:
                'console.log("Compilation: ENVIRONMENT_IS_NODE =", ENVIRONMENT_IS_NODE); if (ENVIRONMENT_IS_NODE) {',
            },
            {
              search: 'if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {',
              replace:
                'console.log("Compilation: ENVIRONMENT_IS_WEB =", ENVIRONMENT_IS_WEB, "ENVIRONMENT_IS_WORKER =", ENVIRONMENT_IS_WORKER); if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {',
            },
          ],
        },
      },
    ],
  },
];

// Packages that shouldn't be bundled but loaded at runtime
const externals = ['@jupyter-widgets/base'];

const resolve = {
  // Add '.ts' and '.tsx' as resolvable extensions.
  extensions: ['.webpack.js', '.web.js', '.ts', '.js'],
  alias: {
    fs: 'browserify-fs',
  },
  fallback: {
    fs: require.resolve('browserify-fs'),
    path: require.resolve('path-browserify'),
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer/'),
    util: require.resolve('util/'),
    assert: require.resolve('assert/'),
  },
};

const plugins = [
  new nodePolyfillPlugin(),
  new webpack.ProvidePlugin({
    process: 'process/browser',
    Buffer: ['buffer', 'Buffer'],
  }),
  new webpack.NormalModuleReplacementPlugin(
    /node:crypto/,
    require.resolve('crypto-browserify')
  ),
];

const commonConfig = {
  devtool: 'source-map',
  module: { rules },
  externals,
  resolve,
  plugins,
};

module.exports = [
  /**
   * Notebook extension
   *
   * This bundle only contains the part of the JavaScript that is run on load of
   * the notebook.
   */
  {
    entry: './src/extension.ts',
    output: {
      filename: 'index.js',
      path: path.resolve(__dirname, 'rhino_inside_jupyter', 'nbextension'),
      libraryTarget: 'amd',
      publicPath: '',
    },
    ...commonConfig,
  },

  /**
   * Embeddable rhino-inside-jupyter bundle
   *
   * This bundle is almost identical to the notebook extension bundle. The only
   * difference is in the configuration of the webpack public path for the
   * static assets.
   *
   * The target bundle is always `dist/index.js`, which is the path required by
   * the custom widget embedder.
   */
  {
    entry: './src/index.ts',
    output: {
      filename: 'index.js',
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'amd',
      library: 'rhino-inside-jupyter',
      publicPath:
        'https://unpkg.com/rhino-inside-jupyter@' + version + '/dist/',
    },
    ...commonConfig,
  },

  /**
   * Documentation widget bundle
   *
   * This bundle is used to embed widgets in the package documentation.
   */
  {
    entry: './src/index.ts',
    output: {
      filename: 'embed-bundle.js',
      path: path.resolve(__dirname, 'docs', 'source', '_static'),
      library: 'rhino-inside-jupyter',
      libraryTarget: 'amd',
    },
    ...commonConfig,
  },
];
