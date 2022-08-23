import webpack, { web } from "webpack";
import path from "path";
import { promises as fs } from "fs";
import url from "url";
import { createRequire } from "module";
import CopyWebpackPlugin from "copy-webpack-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import nodeExternals from "webpack-node-externals";

import { getConfig } from "./config.js";
import ListenDependenciesPlugin from "./plugins/ListenDependenciesPlugin.js";
import { logError, logSuccess, logUnimportant } from "./logger.js";

const require = createRequire(import.meta.url);

process.on("unhandledRejection", (reason, promise) => {
  logError(`Unhandled Rejection:`, { promise, reason });
});

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function run(watch: boolean = false) {
  try {
    const config = await getConfig();
    const functionsSourceDir = path.join(
      config.input.cwd,
      config.input.dir,
      config.input.functionsDir
    );
    const functionNames = await fs.readdir(functionsSourceDir);

    const functionsOutputDir = path.join(
      config.input.cwd,
      config.output.dir,
      config.input.functionsDir
    );

    const webpackConfig: webpack.Configuration = {
      entry: functionNames.reduce((acc: any, cur) => {
        acc[cur] = `${path.join(functionsSourceDir, cur)}/index.ts`;
        return acc;
      }, {}),
      mode: config.mode,
      devtool: config.output.sourceMap,
      output: {
        filename: "[name]/index.js",
        path: functionsOutputDir,
        iife: false,
        library: {
          type: "commonjs-static",
        },
      },
      resolve: {
        extensions: [".js", ".ts", ".json"],
      },

      target: "node12",
      module: {
        rules: [
          {
            test: /\.(js|ts)$/,
            exclude: /(node_modules)/,
            // use: {
            //   loader: require.resolve("babel-loader"),
            //   options: {
            //     presets: [require("@babel/preset-typescript")],
            //   },
            // },
            use: {
              loader: require.resolve("swc-loader"),
              options: {
                jsc: {
                  target: "es2015",
                  parser: {
                    syntax: "typescript",
                  },
                },
              },
            },
          },
        ],
      },
      plugins: [
        new CopyWebpackPlugin({
          patterns: [
            {
              from: `${functionsSourceDir}/**/*`,
              to({ context, absoluteFilename }) {
                return Promise.resolve(
                  `${functionsOutputDir}/${path.relative(
                    functionsSourceDir,
                    absoluteFilename!
                  )}`
                );
              },
              globOptions: {
                ignore: ["**/*.ts", "**/node_modules/**"],
              },
            },
          ],
        }),
        new CleanWebpackPlugin(),
      ],
    };
    // if output not single file, will stop bundling node modules and listen to generate package.json
    if (!config.bundle.singleFile) {
      webpackConfig.externals = [nodeExternals()];
      webpackConfig.plugins!.push(new ListenDependenciesPlugin());
    }

    const compiler = webpack(webpackConfig);

    const compileCallback = (err?: null | Error, stats?: webpack.Stats) => {
      if (err) {
        logError(`Webpack error:`, err);
        return;
      }
      if (stats?.hasErrors()) {
        const info = stats?.toJson();
        logError(`Compile error:`, info?.errors);
        return;
      }

      logSuccess(`Compiled success`);
    };

    if (watch) {
      compiler.watch({}, compileCallback);
      logUnimportant(`Watching...`);
    } else {
      compiler.run(async (err, stats) => {
        compileCallback(err, stats);
        compiler.close(() => {
          logSuccess(`Build success`);
        });
      });
    }
  } catch (e: any) {
    logError(`Something error:`, e);
  }
}
