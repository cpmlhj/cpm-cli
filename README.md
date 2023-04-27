# cpm-cli
# pm研发脚手架

## About


## Getting Started

### 安装：

```bash
npm install -g @cpm-cli/core
```

### 创建项目

项目/组件初始化

```bash
cpm-cli init 
```

强制清空当前文件夹

```bash
cpm-cli init --force
```

### 发布项目

发布项目/组件

```bash
cpm-cli publish
```

强制更新所有缓存

```bash
cpm-cli publish --resetServer
```




## More

DEBUG 模式：

```bash
cpmli --debug
```

调试本地包：

```bash
cpm-cli  --targetPath <本地开发地址> 譬如 /Users/JUN/工程化/lhj-construct/PosterEditor/cpm-cli/packages/commands/add
```
