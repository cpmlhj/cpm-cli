# pm

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
pm init 
```

强制清空当前文件夹

```bash
pm init --force
```

### 发布项目

发布项目/组件

```bash
pm publish
```

强制更新所有缓存

```bash
pm publish --resetServer
```

## More

DEBUG 模式：

```bash
pm add --debug
```

调试本地包：

```bash
pm add --targetPath <本地开发地址> 譬如 /Users/JUN/工程化/lhj-construct/PosterEditor/pm/packages/commands/add
```
