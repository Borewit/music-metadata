const path = require("path");
const nodeExternals = require("webpack-node-externals");

module.exports = {
  mode: "development",
  target: "node",
  externals: [
    nodeExternals({
      modulesFromFile: {
        exclude: ["dependencies"],
        include: ["devDependencies"],
      },
    }),
  ],
  entry: path.resolve(__dirname, "./doc-gen/gen.ts"),
  output: {
    filename: "gen.js",
    path: path.resolve(__dirname, "doc-gen"),
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
      },
    ],
  },
  resolve: {
    extensions: [".ts"],
    modules: ["node_modules"],
  },
};
