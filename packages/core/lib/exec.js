/*
 * 执行命令
 * 1:
 *   1.1 是否存在本地路径 存在本地路径->寻找本地路径代码的入口->入口文件存在->执行代码
 *   1.2 不存在本地路径 获取缓存目录->初始化package->是否存在package->存在->寻找本地路径代码的入口->入口文件存在->执行代码
 * 2: 使用子进程执行代码->是否有异常
 */

const path = require("path");

const { Package } = require("@cpm-cli/models");
const { logger, utils } = require("@cpm-cli/utils");
const colors = require("colors");

const CACHE_DIR = "dependencies";
const VERSION = "latest";
const SETTINGS = {
  init: "@cpm-cli/init",
  add: "@cpm-cli/add",
};

async function exec() {
  let targetPath = process.env.CPM_CLI_TAG_PATH;
  let storeDir = "";
  let pkg;
  const commandObj = arguments[arguments.length - 1];
  const packageName = SETTINGS[commandObj.name()];
  const HOME_PATH = process.env.CPM_CLI_HOME_PATH;
  console.log(targetPath, "=====");
  try {
    if (!targetPath) {
      targetPath = path.resolve(HOME_PATH, CACHE_DIR);
      storeDir = path.resolve(targetPath, "node_modules");
      pkg = new Package({
        targetPath,
        storeDir,
        packageName,
        packageVersion: VERSION,
      });
      if (await pkg.exists()) {
        await pkg.update();
      } else {
        await pkg.install();
      }
    } else {
      pkg = new Package({
        targetPath,
        packageName,
        packageVersion: VERSION,
      });
    }
    // 获取包入口文件
    const entryFile = pkg.getEntryFilePath();
    logger.info(entryFile);
    if (entryFile) {
      const params = Array.from(arguments).slice(0, arguments.length - 1);
      const code = `require('${entryFile}').call(null, ${JSON.stringify(
        params
      )})`;
      const child = await utils.execSync("node", ["-e", code], {
        cwd: process.cwd(),
        stdio: "inherit",
      });
      if (child >= 0) {
        logger.success("创建项目成功");
        process.exit(child);
      }
    }
  } catch (e) {
    logger.error(colors.red(e.message));
  }
}
module.exports = exec;
