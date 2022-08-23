# Funpack 微信小程序云开发模板

## 初始化
### 新项目
1. 下载该模板，目录名修改为 `cloud` 或其他任意名，将其放在你的微信小程序项目下
2. 然后修改 `project.config.json` 的云函数目录指向:
    ```json
    {
      "cloudfunctionRoot": "cloud/dist/functions/"
    }
    ```
3. `npm install`
4. `npm run watch`


### 现有项目
1. 若要改造现有的云函数项目，首先需要按照 funpack 的目录结构进行修改
2. 若每个云函数下都有各自的 `package.json`，则将其统一提取，放在根目录的 `package.json` 下

## 云函数上传
在 wechat devtools 里，选择 `dist` 目录下的云函数右键进行上传
