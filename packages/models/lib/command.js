"use strict";
const { logger, utils } = require("@cpm-cli/utils");
const colors = require("colors");
const semver = require("semver");

const LOWEST_NODE_VERSION = "12.0.0";

/**
 * command模型
 */
class Command {
  constructor(args) {
    logger.verbose(`Command类参数: ${args}`);
    if (!args || !Array.isArray(args))
      throw new Error("命令参数异常！，参数必须为数组");
    if (args.length < 1) throw new Error("命令参数异常！，参数不能为空");
    this._argv = args;
    this.runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      chain = chain.then(() => this.checkNodeVersion());
      chain = chain.then(() => this.initArgs());
      chain = chain.then(() => this.init());
      chain = chain.then(() => this.exec());
      chain.catch((err) => {
        logger.error(colors.red(err.message));
        // TODO: 承接上文抛出的异常，直接exit 1
        process.exit(1);
      });
    });
  }
  checkNodeVersion() {
    const currentVersion = process.version;
    if (!semver.gte(currentVersion, LOWEST_NODE_VERSION)) {
      throw new Error(
        colors.red(`cpm-cli 需要安装# ${LOWEST_NODE_VERSION} 以上版本的Node.js`)
      );
    }
  }
  initArgs() {
    const options = {};
    const args = [];
    this._argv.forEach((item) => {
      if (utils.isObject(item)) {
        const [key] = Object.keys(item);
        options[key] = item[key];
      } else {
        args.push(item);
      }
    });
    this._argv = {
      args,
      options,
    };
  }
  init() {
    throw new Error("Command类  init方法 必须实现");
  }

  exec() {
    throw new Error("Command类 exec方法 必须实现");
  }
}

module.exports = Command;
