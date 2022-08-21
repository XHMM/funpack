<div align="center">
<h1>FunPack</h1>
<p>
Funpack is a bundler specifically for better writing cloud functions(aka, a project that has multi entrypoints). It allows you to share common logic between isolated functions, and have a better development experience.
  </p>
</div>


## Basic

Your project folder should follow this structure:
```
root
├── funpack.config.js
├── package.json
├── src
│   ├── functions
│   │   ├── register # your function
│   │   │   ├── config.json 
│   │   │   └── index.ts # function entry file
│   │   └── user-info # your function
│   │       ├── config.json
│   │       └── index.ts
│   ├── types.ts
│   └── utils.ts
└── tsconfig.json

```

- `funpack.config.js`: this is config file for funpack
- `src/functions`: put your functions under this folder
- `src/functions/[fnName]/index.ts`: function entry file
- `src/functions/[fnName]/[non-ts-file]`: any non-ts file will be copied to output without modify
- `src/[shardFile].ts`: put shard files outside of functions folder


## Install
Install with npm:

`npm install --save-dev @funpack/cli`

Install with yarn:

`yarn add @funpack/cli --dev`

## Templates
- [wxmini-cloud](/packages/create-funpack/template-wxmini-cloud): a template for wechat miniprogram cloud functions development

## Reference

### Command

- `funpack --watch`: Build and watch functions
- `funpack`: Build functions (Set `process.env.NODE_ENV` to 'production' if you want production build)


### funpack.config.js
```typescript
interface UserFunpackConfig {
  output?: {
    /**
     * functions will output to `projectRoot/[dir]/functions`
     * 
     * default: dist
     */
    dir?: string; 
    
    /** 
     * soucemap config, check https://webpack.js.org/configuration/devtool/#devtool for available values
     * 
     * default: NODE_ENV=='production' ? "hidden-source-map" : "eval-source-map"
     * */
    sourceMap?: string | false;
  };
  
  bundle: {
    /**
     * config output strategy
     * if true, node modules used by function will be bundled,
     * if false, package.json will be genrated under every function
     * 
     * default: true
     */
    singleFile?: boolean;
  };
}
```
