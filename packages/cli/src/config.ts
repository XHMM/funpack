import { promises as fs } from "fs";
import path from "path";
import swc from "@swc/core";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const defaultConfigFileName = `funpack.config.js`;

export interface UserFunpackConfig {
  output?: {
    dir?: string;
    /** https://webpack.js.org/configuration/devtool/#devtool */
    sourceMap?: string | false;
  };
  bundle: {
    singleFile?: boolean;
  };
}

export interface FunpackConfig {
  mode: "production" | "development";

  input: {
    cwd: string;
    dir: string;
    functionsDir: string;
  };

  output: {
    dir: string;
    sourceMap: string | false;
  };

  bundle: {
    singleFile: boolean;
  };
}
export async function getConfig(): Promise<FunpackConfig> {
  const cwd = process.cwd();
  const configFileName = defaultConfigFileName;
  const configFileFullPath = path.join(cwd, configFileName);

  const files = await fs.readdir(cwd);
  if (files.find((i) => i === configFileName)) {
    const content = await fs.readFile(configFileName, "utf-8");
    let userConfig: UserFunpackConfig;
    try {
      const transpiledCode = swc.transformSync(content, {
        module: {
          type: "commonjs",
        },
      }).code;
      userConfig = requireConfig(configFileFullPath, transpiledCode) as any;
      // userConfig = await import(configFileFullPath).then((mod) => mod.default);
    } catch (e) {
      throw new Error(`Parse config file of ${configFileFullPath} error: ${e}`);
    }
    const { valid, errMsg } = validateConfig(userConfig);
    if (valid) {
      return normalizeConfig(userConfig);
    } else {
      throw new Error(`Config not valid: ${errMsg}`);
    }
  } else {
    throw new Error(`Cannot find config file of ${configFileFullPath}`);
  }
}

function validateConfig(config: any): { valid: boolean; errMsg: string } {
  if (!config) {
    return {
      valid: false,
      errMsg: "Config was empty",
    };
  }

  return {
    valid: true,
    errMsg: "",
  };
}

function normalizeConfig(config: UserFunpackConfig): FunpackConfig {
  const isNotProdMode = process.env.NODE_ENV !== "production";

  return {
    mode: isNotProdMode ? "development" : "production",
    input: {
      dir: "src",
      functionsDir: "functions",
      cwd: process.cwd(),
    },
    output: {
      dir: config.output?.dir ?? "dist",
      sourceMap:
        config.output?.sourceMap ??
        (isNotProdMode ? "eval-source-map" : "hidden-source-map"),
    },
    bundle: {
      singleFile: config.bundle.singleFile ?? true,
    },
  };
}

function requireConfig(fileName: string, bundledCode: string): unknown {
  const resolvedFileName = require.resolve(fileName);
  const extension = path.extname(resolvedFileName);
  const originalLoader = require.extensions[extension];
  require.extensions[extension] = (
    module: NodeModule,
    requiredFileName: string
  ) => {
    if (requiredFileName === resolvedFileName) {
      (module as any)._compile(bundledCode, requiredFileName);
    } else {
      if (originalLoader) {
        originalLoader(module, requiredFileName);
      }
    }
  };
  delete require.cache[resolvedFileName];
  try {
    const config = require(fileName).default;
    require.extensions[extension] = originalLoader;
    return config;
  } catch (err: any) {
    throw err;
  }
}
