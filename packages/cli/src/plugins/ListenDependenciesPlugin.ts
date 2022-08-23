import webpack from "webpack";
import fs from "fs";
import path from "path";

export default class ListenDependenciesPlugin {
  final?: Record<string, string[]>;
  userRequest2EntryKeyMap?: Record<string, string>;

  apply(compiler: webpack.Compiler) {
    compiler.hooks.afterEmit.tap(
      ListenDependenciesPlugin.name,
      (compilation) => {
        const modules = [...compilation.modules]
          // TODO: modules may have `ConcatenatedModule`(an optimized module)，webpack not export this class, so cannot use `instanceof` to check, here use `rootModule` to get wanted module
          // @ts-ignore
          .map((i) => i.rootModule ?? i)
          .filter((i) => {
            return (
              i instanceof webpack.NormalModule ||
              i instanceof webpack.ExternalModule
            );
          }) as Array<webpack.NormalModule | webpack.ExternalModule>;

        this.collectDeps(compilation, modules);
        this.generateFiles(compilation);
      }
    );
  }

  collectDeps(
    compilation: webpack.Compilation,
    allModules: Array<webpack.NormalModule | webpack.ExternalModule>
  ) {
    this.final = undefined;
    this.userRequest2EntryKeyMap = {};

    // entry modules should always be normal module
    const entryModules: Array<webpack.NormalModule> = [];

    // get all entry modules
    // TODO: is there better way to check if module was entry module?
    [...compilation.entries.entries()].map(([key, entryData]) => {
      entryData.dependencies.map((dep) => {
        const depModule = compilation.moduleGraph.getModule(dep);
        // @ts-ignore
        const module = depModule.rootModule ?? depModule;

        entryModules.push(module);
        this.userRequest2EntryKeyMap![module.userRequest] = key;
      });
    });

    // key=normal module path, value=user module path、third-party node modules
    const normalModuleRequest2DepModulesMap: Record<string, Set<string>> = {};

    const normalModules = allModules.filter(
      (mod) => mod instanceof webpack.NormalModule
    ) as webpack.NormalModule[];

    normalModules.map((mod) => {
      normalModuleRequest2DepModulesMap[mod.userRequest] = new Set();
    });

    const thirdPartyModules: Set<string> = new Set();
    normalModules.map((mod) => {
      mod.dependencies.map((dep) => {
        if (dep.type === "harmony side effect evaluation") {
          const depModule = compilation.moduleGraph.getModule(dep);
          // @ts-ignore
          const request = (depModule?.rootModule ?? depModule).userRequest;

          const requestMod = allModules.find(
            (m: any) => m.userRequest === request
          );
          if (requestMod instanceof webpack.ExternalModule) {
            if (requestMod.externalType === "node-commonjs") {
              // node builtin module
            }
            if (requestMod.externalType === "commonjs") {
              // third-party node module
              normalModuleRequest2DepModulesMap[mod.userRequest].add(request);
              thirdPartyModules.add(request);
            }
          } else {
            normalModuleRequest2DepModulesMap[mod.userRequest].add(request);
          }
        }
      });
    });

    const entries = entryModules.map((i) => i.userRequest);
    const final: Record<string, string[]> = {};
    entries.map((entry) => {
      final[entry] = [];
      const deps: string[] = [
        ...normalModuleRequest2DepModulesMap[entry].keys(),
      ];
      deps.map((d) => {
        if (thirdPartyModules.has(d)) {
          final[entry].push(d);
        } else final[entry].push(...recursive(d));
      });
    });

    function recursive(key: string): string[] {
      const values = [...(normalModuleRequest2DepModulesMap[key] ?? new Set())];

      const result: string[] = [];
      while (values.length) {
        const item = values.pop();
        if (!item) continue;
        if (item === key) continue; // prevent circular reference
        if (thirdPartyModules.has(item)) {
          result.push(item);
        } else {
          result.push(...recursive(item));
        }
      }
      return result;
    }

    this.final = final;
  }

  generateFiles(compilation: webpack.Compilation) {
    if (!this.final || !this.userRequest2EntryKeyMap) {
      compilation.warnings.push(new webpack.WebpackError(`Data collect empty`));
      return;
    }

    let userRootPackageJson: undefined | Record<string, any>;
    try {
      userRootPackageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8")
      );
    } catch (e) {
      compilation.warnings.push(
        new webpack.WebpackError(
          `Parse ${userRootPackageJson} error: ${e}, use latest version instead`
        )
      );
    }
    const outputPath = compilation.options.output.path!;
    Object.keys(this.final).map((userRequest) => {
      const deps = this.final![userRequest];

      const name = this.userRequest2EntryKeyMap![userRequest];

      const distNodeModulesPath = path.join(outputPath, name, "node_modules");
      if (!fs.existsSync(distNodeModulesPath)) {
        fs.symlinkSync(
          path.join(process.cwd(), "node_modules"),
          path.join(outputPath, name, "node_modules"),
          "dir"
        );
      }

      fs.writeFileSync(
        path.join(outputPath, name, "package.json"),
        JSON.stringify(
          {
            name: name,
            dependencies: deps.reduce((acc: Record<string, string>, cur) => {
              acc[cur] = userRootPackageJson?.["dependencies"][cur] ?? "latest";
              return acc;
            }, {}),
          },
          null,
          2
        )
      );
    });
  }
}
