const { Command } = require("@cpm-cli/models");
const { logger } = require("@cpm-cli/utils");

const PAGE_TEMPLATE = [
  {
    name: "vue首页模板",
    npmName: "cpm-cli-dev-template-page-vue",
    version: "1.0.0",
    targetPath: "src/views/Home",
  },
];

class AddCommand extends Command {
  init() {
    // 获取参数
  }
  exec() {
    // 获取按照路径
    const dir = process.cwd();
    // 选择页面模板
    // 安装模板
    // 合并模板依赖
  }
}

function init(argv) {
  logger.verbose(argv, "add argv");
  return new AddCommand(argv);
}

module.exports = init;
