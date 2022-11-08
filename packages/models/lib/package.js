'use strict'

const {utils, logger} = require('@cpm-cli/utils')
const {getLatestNpmVersion, formatPath, getDetaultNpmRegistry} = require('@cpm-cli/helpers')

const path = require('path')
const pathEx= require('path-exists')
const fse = require('fs-extra')
const pkgDir = require('pkg-dir').sync
const npminstall = require('npminstall')

/**
 * npmPackge模型
 * attr: targetPath 目标目录
 *       storeDir   缓存目录
 *       pcakgeName 包名称
 */
class Package {
  constructor(opts) {
      if(!opts || !utils.isObject(opts)) {
          throw new Error('npmPackge 缺失初始化属性 opts')
      }
      // package路径
      this.targetPath = opts.targetPath
      // 缓存路径
      this.storeDir = opts.storeDir
      // 包名称
      this.packageName = opts.packageName
      // 缓存包前缀
      this.npmCacheFilePrefix = this.packageName.replace('/', '_')
      // 包版本
      this.packageVersion = opts.packageVersion
  }
   get cacheFilePath() {
      return path.resolve(
              this.storeDir,
              `_${this.npmCacheFilePrefix}@${this.packageVersion}@${this.packageName}`
      )
  }
    specialCacheFilePath(version) {
      return path.resolve(
              this.storeDir,
              `_${this.npmCacheFilePrefix}@${version}@${this.packageName}`
              )
  }

   async prepare() {
      if(this.storeDir && !pathEx(this.storeDir)) {
          fse.mkdirpSync(this.storeDir)
      }
       if(this.packageVersion === 'latest') {
           this.packageVersion = await getLatestNpmVersion({npmName: this.packageName})
       }
  }

    // 判断是否存在package
   async exists() {
      if(this.storeDir) {
          await this.prepare()
          logger.verbose(this.cacheFilePath, '==========')
          return pathEx(this.cacheFilePath)
      } else {
          return pathEx(this.targetPath)
      }
  }

   // 安装npm包
   async install(version) {
      return npminstall({
          root: this.targetPath,
          storeDir: this.storeDir,
          registry: getDetaultNpmRegistry(),
          pkgs: [
              {name: this.packageName, version: version || this.packageVersion}
          ]
      })
  }

    // 更新包
   async update() {
      // 获取最新版本号
       const latestVersion = await getLatestNpmVersion({npmName: this.packageName})
       const filePath = this.specialCacheFilePath(latestVersion)
       if(!pathEx(filePath)) {
           await this.install(latestVersion)
           this.packageVersion = latestVersion
       }
       return
  }

    getEntryFilePath() {
      function _getEntryFile(tarPath) {
          // 获取包packjson所在目录
          const Dir = pkgDir(tarPath)
          if(Dir) {
              // 获取package.json
              const pkg = require(path.resolve(Dir, 'package.json'))
              if(pkg && pkg.main) {
                  // 格式化入口文件路径 适配win32
                  return formatPath(path.resolve(Dir, pkg.main))
              }
          }
      }
      if(this.storeDir) {
          return _getEntryFile(this.cacheFilePath)
      } else {
          return _getEntryFile(this.targetPath)
      }
  }
}

module.exports = Package