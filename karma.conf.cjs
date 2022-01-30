// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

const path = require('path');
const webpack = require('webpack');

module.exports = config => {
  config.set({
    basePath: 'lib',
    frameworks: [
      'mocha'
    ],
    files: [
      {pattern: 'test/browser/*.spec.ts'}
    ],
    preprocessors: {
      '**/*.ts': 'webpack'
    },

    webpack: {
      mode: 'development',
      resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        fallback: {'buffer': require.resolve('buffer/')}
      },
      // Ensure buffer is available
      plugins: [
        new webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer']
        })
      ],
      devtool: 'inline-source-map',
      module: {
        rules: [
          {
            test: /\.ts$/,
            use: 'ts-loader'
          },
          {
            test: /\.ts$/,
            use: {loader: 'istanbul-instrumenter-loader'},
            enforce: 'post',
            exclude: /\.spec\.ts$/
          }

        ]
      }
    },
    webpackMiddleware: {
      noInfo: true
    },

    reporters: ['dots', 'coverage-istanbul'],
    // https://www.npmjs.com/package/karma-coverage-istanbul-reporter
    coverageIstanbulReporter: {
      dir: path.join(__dirname, 'coverage'),
      reports: ['text-summary', 'lcovonly'],
      fixWebpackSourcePaths: true,
      'report-config': {
        html: {
          // outputs the report in ./coverage/html
          subdir: 'html'
        }
      },
      combineBrowserReports: true // Combines coverage information from multiple browsers into one report
    },

    mocha: {
      timeout: 20000 // 20 seconds
    },

    //autoWatch: true,
    browsers: ['Chrome'],
    colors: true
  });
};
