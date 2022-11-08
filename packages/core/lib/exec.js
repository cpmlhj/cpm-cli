/*
 * 执行命令
 * 1:
 *   1.1 是否存在本地路径 存在本地路径->寻找本地路径代码的入口->入口文件存在->执行代码
 *   1.2 不存在本地路径 获取缓存目录->初始化package->是否存在package->存在->寻找本地路径代码的入口->入口文件存在->执行代码
 * 2: 使用子进程执行代码->是否有异常
 */

const path = require('path')
const cp = require('child_process')

const {Package} = require('@cpm-cli/models')
const {logger} = require('@cpm-cli/utils')
const colors = require('colors')

const CACHE_DIR = 'dependencies'
const VERSION = 'latest'
const SETTINGS = {
    'init': "@imooc-cli/init"
}

async function exec() {
    let targetPath = process.env.CPM_CLI_TAG_PATH;
    let storeDir = '';
    let pkg;
    const commandObj = arguments[arguments.length - 1]
    const packageName = SETTINGS[commandObj.name()]
    const HOME_PATH = process.env.CPM_CLI_HOME_PATH
    try {
        if(!targetPath) {
            targetPath = path.resolve(HOME_PATH, CACHE_DIR)
            storeDir = path.resolve(targetPath, 'node_modules')
            pkg = new Package({
                targetPath,
                storeDir,
                packageName,
                packageVersion: VERSION
            })
            if(await pkg.exists()) {
                  await pkg.update()
            } else {
                await pkg.install()
            }
        } else {
            pkg = new Package({
                targetPath,
                packageName,
                packageVersion: VERSION
            })
        }
        const entryFile = pkg.getEntryFilePath()
        logger.info(entryFile)
        if(entryFile) {
           const code = `require('${entryFile}').call(null, ${JSON.stringify(commandObj.opts())})`
           const child = Spawn('node', ['-e', code], {
               cwd: process.cwd(),
               stdio: 'inherit'
           })
            child.on('error', e => {
                logger.error(e.message)
                process.exit(-1)
            })
            child.on('exit', e=> {
                logger.info('执行成功')
                process.exit(e)
            })
        }
    } catch(e) {
        logger.error(colors.red(e.message))
    }
}

function Spawn(cmd, args, opt) {
    const win32 = process.platform === 'win32'
    const command = win32 ? 'cmd': cmd
    const cmdArgs = win32 ? ['/c'].concat(cmd, args) : args
    return cp.spawn(command, cmdArgs, opt || {})
}

module.exports = exec