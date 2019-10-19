// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

const path = require('path');

module.exports = config => {
  config.set({
    basePath: '.',
    frameworks: [
      'jasmine'
    ],
    files: [
      {pattern: 'lib/**/*.spec.ts'}
    ],
    preprocessors: {
      '**/*.ts': 'webpack',
    },

    webpack: {
      mode: 'development',
      entry: './lib/streaming-http-token-reader.spec.ts',
      resolve: {
        extensions: ['.tsx', '.ts', '.js']
      },
      devtool: 'inline-source-map',
      module: {
        rules: [
          {
            test: /\.ts$/,
            use: 'ts-loader',
            include: path.resolve('lib')
          },
          {
            test: /\.ts$/,
            use: {loader: 'istanbul-instrumenter-loader'},
            enforce: 'post',
            include: path.resolve('lib'),
            exclude: /\.spec\.ts$/
          }

        ]
      },
    },
    webpackMiddleware: {
      noInfo: true
    },

    reporters: ['progress', 'kjhtml', 'coverage-istanbul', 'spec'],
    // https://www.npmjs.com/package/karma-coverage-istanbul-reporter
    coverageIstanbulReporter: {
      dir: path.join(__dirname, 'coverage'),
      reports: ['text-summary'],
      fixWebpackSourcePaths: true
    },
    //autoWatch: true,
    browsers: ['Chrome'],
    colors: true,
    singleRun: false
  })
};
