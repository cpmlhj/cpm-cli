const { Command, Package } = require("@cpm-cli/models");
const { logger } = require("@cpm-cli/utils");
const path = require("path");
const userHome = require("user-home");
const inquirer = require("inquirer");
const pathEx = require("path-exists");
const fse = require("fs-extra");
const glob = require("glob");
const ejs = require("ejs");

const PAGE_TEMPLATE = [
  {
    name: "vue首页模板",
    npmName: "cpm-cli-dev-template-page-vue",
    version: "1.0.0",
    targetPath: "src/views/Home",
    ignore: ["assets/**"],
  },
];

const CACHE_DIR_PREFIX = ".cpm";

// process.on("unhandledRejection", (e) => {
//   logger.verbose("有？");
//   console.error(e);
//   process.exit(-1);
// });

class AddCommand extends Command {
  init() {
    // 获取参数
  }
  async exec() {
    // 获取按照路径
    this.workDir = process.cwd();
    // 选择页面模板
    this.pageTemplate = await this.getPageTemplate();
    // 预检测 页面模板是否存在冲突
    await this.prepare();
    // 安装模板
    await this.downloadTemplate();
    // 合并模板依赖
    await this.installTemplate();
  }
  async prepare() {
    // 生成最终拷贝路径
    this.copyPath = path.resolve(this.workDir, this.pageTemplate.pageName);
    logger.verbose("最终拷贝路径:" + this.copyPath);
    if (await pathEx(this.copyPath))
      throw new Error("页面文件夹已存在,名称为：" + this.pageTemplate.pageName);
  }
  async getPageTemplate() {
    const selectedTemplate = await inquirer.prompt({
      type: "list",
      name: "pageTemplate",
      message: "请选择页面模板",
      choices: this.createChoices(),
    });
    const pageTemplate = PAGE_TEMPLATE.find(
      (item) => item.npmName === selectedTemplate.pageTemplate
    );
    if (!pageTemplate) throw new Error("页面模板不存在");
    const { pageName } = await inquirer.prompt({
      type: "input",
      name: "pageName",
      message: "请输入页面名称",
      default: "",
      validate: function (value) {
        const done = this.async();
        if (!value) return done("请输入页面名称");
        done(null, true);
      },
    });
    pageTemplate.pageName = pageName.trim();
    return pageTemplate;
  }

  async downloadTemplate() {
    // 缓存文件夹路径
    const targetPath = path.resolve(userHome, CACHE_DIR_PREFIX, "template");
    // 真实路径
    const storeDir = path.resolve(targetPath, "node_modules");
    const { npmName, version } = this.pageTemplate;
    const targetPackage = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });
    // 页面模板是否存在
    if (!(await targetPackage.exists())) {
      // 安装
      try {
        await targetPackage.install();
      } catch (e) {
        throw e;
      } finally {
        if (await targetPackage.exists()) {
          logger.success("下载页面模板成功");
          this.package = targetPackage;
        }
      }
    } else {
      // 更新
      try {
        await targetPackage.update();
      } catch (e) {
        throw e;
      } finally {
        if (await targetPackage.exists()) {
          logger.success("更新页面模板成功");
          this.package = targetPackage;
        }
      }
    }
  }

  async installTemplate() {
    logger.verbose("pageTepmplate", this.pageTemplate);
    // 获取模板路径
    const templatePath = path.resolve(
      this.package.cacheFilePath,
      "template",
      this.pageTemplate.targetPath
    );
    if (!(await pathEx(templatePath)))
      throw new Error("页面模板不存在! -->" + templatePath);
    // 获取目标路径
    logger.verbose("templatePath", templatePath);
    logger.verbose("copyPath", this.copyPath);
    fse.ensureDirSync(templatePath);
    fse.ensureDirSync(this.copyPath);
    fse.copySync(templatePath, this.copyPath);
    await this.ejsRender();
  }
  async ejsRender() {
    const pageTemplate = this.pageTemplate;
    const copyPath = this.copyPath;
    return new Promise((resolve, reject) => {
      glob(
        "**",
        {
          cwd: copyPath,
          nodir: true,
          ignore: pageTemplate.ignore,
        },
        function (err, files) {
          if (err) {
            reject(err);
          } else {
            Promise.all(
              files.map((file) => {
                // 真实路径
                const filePath = path.resolve(copyPath, file);
                return new Promise((resolve, reject) => {
                  ejs.renderFile(
                    filePath,
                    {
                      name: pageTemplate.pageName,
                    },
                    {},
                    (err, result) => {
                      if (err) reject(err);
                      // 重写文件信息
                      fse.writeFileSync(filePath, result);
                      resolve(result);
                    }
                  );
                });
              })
            )
              .then(resolve)
              .catch((e) => reject(e));
          }
        }
      );
    });
  }
  createChoices() {
    return PAGE_TEMPLATE.map((item) => ({
      name: item.name,
      value: item.npmName,
    }));
  }
}

function init(argv) {
  logger.verbose(argv, "add argv");
  return new AddCommand(argv);
}

module.exports = init;
