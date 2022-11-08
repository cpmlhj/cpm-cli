'use strict'

const {utils, logger} = require('@cpm-cli/utils')
const {getLatestNpmVersion} = require('@cpm-cli/helpers')

const path = require('path')
const pathEx= require('path-exists')
const fse = require('fs-extra')
const pkgDir = require('pkg-dir')

/**
 * npmPackge模型
 * attr: targetPath 目标目录
 *       storeDir   缓存目录
 *       pcakgeName 包名称
 */
class Package {
  constructor(opts) {
      console.log(opts, '=sd')
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
   async install() {}

    // 更新包
   async update() {}

    getEntryFilePath() {
      function _getEntryFile(tarPath) {
          const Dir = pkgDir(tarPath)
          console.log(Dir, 'Dir')
      }
      if(this.storeDir) {
          return this._getEntryFile(this.cacheFilePath)
      } else {
          return this._getEntryFile(this.targetPath)
      }
  }
}

module.exports = Package