# Minecraft-Pack-Builder

> 本项目是一个用于构建Minecraft资源包/数据包的工具，凭借此工具，你可以轻松的创建一个多模块的资源包/数据包，并允许用户按照自己的意愿自由选择所需的模块

## 开始使用

> 本系统基于 `GitHub API` 实现，由于未登录用户访问限制每小时仅能发起 `60` 个 请求，请先在
> [`GitHub`](https://github.com/settings/tokens/new)
> 上创建一个 `Personal Access Token` ，并于右上角登录， 需勾选的权限为： `public_repo` 与 `read:project`

> 本系统没有后端，`Personal Access Token` 在本地存储

* 在页面顶端的`仓库地址`处填写资源包/数据包所在的仓库地址，或者直接访问由作者提供的链接，它们通常已经包含了需要的仓库地址
* 点击`加载`以加载资源包/数据包配置文件
* 选择你需要的`模块`或者使用作者所预设的模块`合集`
* 选择你需要的`目标版本`
* 选择构建类型，选择`全部`即为将资源包、数据包打包成一个压缩包并下载
* 点击`构建`并耐心等待一段时间，构建完成后将自动启动下载

## 创建项目

1. 使用[项目模板](https://github.com/XeKr-Dev/minecraft-pack-template)创建项目，你应该会得到以下路径结构
    * sets/ `模块合集路径`
        * set_01.set.config.json  `模块合集配置`
        * set_02.set.config.json  `模块合集配置`
        * set_03.set.config.json  `模块合集配置`
    * src/
        * add_1/  `模块路径`
            * assets/
            * data/
            * module.config.json  `模块配置`
        * add_2/  `模块路径`
            * assets/
            * data/
            * module.config.json  `模块配置`
        * add_3/  `模块路径`
            * assets/
            * data/
            * module.config.json  `模块配置`
        * add_4/  `模块路径`
            * assets/
            * data/
            * module.config.json  `模块配置`
        * main/  `主模块路径`
            * assets/
            * data/
        * version_add_1/  `版本模块路径`
            * assets/
            * data/
    * icon.png  `图标`
    * config.json  `主配置`

## 配置文件字段解释

### `config.json`

```json
{
  "pack_name": "minecraft-pack-template",
  "author": "XeKr-Dev",
  "description": "minecraft-pack-template",
  "version": "1.0.0",
  "base_path": "./src",
  "sets_path": "./sets",
  "icon": "./icon.png",
  "main_module": "main",
  "version_modules": {
    "1.21.1": {
      "module": "version_add_1",
      "strict": false
    }
  }
}
```

| 字段                | 类型                              | 描述                 |
|-------------------|---------------------------------|--------------------|
| pack_name         | string                          | 名称                 |
| author            | string                          | 作者                 |
| description       | string                          | 描述                 |
| version           | string                          | 版本                 |
| base_path         | string                          | 资源路径               |
| sets_path         | string?                         | 集合路径               |
| icon              | string?                         | 图标                 |
| type              | "resource"/"data"/undefined     | 类型                 |
| suggested_version | string?                         | 建议的 `Minecraft` 版本 |
| main_module       | string                          | 主模块                |
| version_modules   | {[key: string]: VersionModule}? | 版本模块               |

#### `VersionModule`

| 字段     | 类型      | 描述       |
|--------|---------|----------|
| module | string  | 模块路径名称   |
| strict | boolean | 是否严格匹配版本 |

### `module.config.json`

```json
{
  "module_name": "minecraft-pack-template-module",
  "description": "测试用",
  "support_version": "*",
  "weight": 0,
  "breaks": [
    "add_3"
  ]
}
```

| 字段              | 类型      | 描述     |
|-----------------|---------|--------|
| module_name     | string  | 模块名称   |
| description     | string? | 模块描述   |
| support_version | string  | 支持的版本  |
| weight          | number  | 模块权重   |
| breaks          | array   | 不兼容的模块 |

### `*.set.config.json`

```json
{
  "set_name": "minecraft-pack-template-set-01",
  "description": "测试用01",
  "modules": [
    "add_1",
    "add_2",
    "add_3"
  ]
}
```

| 字段          | 类型      | 描述   |
|-------------|---------|------|
| set_name    | string  | 合集名称 |
| description | string? | 合集描述 |
| modules     | array   | 模块列表 |
