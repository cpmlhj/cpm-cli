'use strict';

const {Command, Package} = require('@cpm-cli/models')
const {logger, utils} = require('@cpm-cli/utils')

const inquirer = require('inquirer')
const fse = require('fs-extra')
const fs = require('fs')
const semver = require('semver')
const path = require('path')
const userHome = require('user-home')
const ejs = require('ejs')
const glob = require('glob')

const getTemplate = require('./getTemplate')

const IGNORE_GLOB_PATH = [
    'node_modules/**',
    "public/**",
    "src/**"
]

const INIT_PROJECT_TYPE = {
    TYPE_PROJECT: 'TYPE_PROJECT',
    TYPE_COMPONENT: 'TYPE_COMPONENT'
}

const INIT_PROJECT_TYPE_NAME = {
    [INIT_PROJECT_TYPE.TYPE_COMPONENT]: '组件',
    [INIT_PROJECT_TYPE.TYPE_PROJECT]: '项目'
}

const WHITE_COMMAND = ['cnpm', 'npm', 'pnpm', 'yarn']

const CACHE_DIR_PREFIX = '.cpm'

const project_name_match = /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])$/

class InitCommand extends Command {
   init() {
       this.projecName = this._argv.args[0] || 'cpm-project'
       this.force = this._argv.options.force
       logger.verbose('projecName', this.projecName)
   }
   async exec() {
       try {
           // 1 准备阶段，使用inquirer 获取模板信息
           const project = await this.prepare()
           this.project = project
           if(project) {
               // 2 创建项目并下载所选模版到缓存目录
               await this.downloadTemplate()
               // 3 安装模板到所在项目
               await this.installTemplate()
           }
       } catch(e) {
           if(process.env.CPM_CLI_LOG_LEVEL === 'verbose') console.error(e)
           logger.error(e.message)
       }
   }
    async prepare() {
       // 获取模板列表
        const tempaltes = await getTemplate()
        if(!tempaltes || tempaltes.length === 0) throw new Error('模板不存在')
       this.tempaltes = tempaltes
       // 检测当前目录是否为空目录
       const localDir = process.cwd()
       if(!this.checkDirifEmpty(localDir)) {
           let ifContinue = this.force
           if(!this.force) {
               const answer = await inquirer.prompt({
                   type: 'confirm',
                   name: 'ifContinue',
                   default: false,
                   message: '当前文件夹不为空，是否继续创建项目'
               })
               ifContinue = answer.ifContinue
           }
           if(!ifContinue) return ifContinue
           // 再次确认是否清空当前目录
           const {confirmDelete} = await inquirer.prompt({
               type: 'confirm',
               name: 'confirmDelete',
               default: false,
               message: '是否清空当前目录'
           })
           if(confirmDelete) {
               fse.emptyDirSync(localDir)
           } else {
               return confirmDelete
           }
       }
        // 获取项目信息
        return await this.getProjectInfo()
   }
   async getProjectInfo() {
       let project = {}
       const {proejectType} = await inquirer.prompt({
           type: 'list',
           name: 'proejectType',
           message: '请选择初始化类型',
           default: INIT_PROJECT_TYPE.TYPE_PROJECT,
           choices: [
               { name: '项目', value: INIT_PROJECT_TYPE.TYPE_PROJECT},
               { name: '组件', value: INIT_PROJECT_TYPE.TYPE_COMPONENT}
           ]
       })
       const project_title = INIT_PROJECT_TYPE_NAME[proejectType]
       const initPrompt = [
           {
               type: 'input',
               message: `请输入${project_title}名称`,
               default: this.projecName,
               name: 'projectName',
               validate: function(v) {
                   const done = this.async()
                   setTimeout(() => {
                       // 通过正则限制 项目名称 首字母必须为英文，尾字母为英文/数字，特殊字符只允许_/-
                       if(!project_name_match.test(v)) return done('请输入正确的名称')
                       done(null, true)
                   }, 0)
               }
           },
           {
               type: 'input',
               message: "请输入版本号",
               default: '1.0.0',
               name: 'projectVersion',
               validate: v => !!semver.valid(v)
           },
           {
               type: 'list',
               message: `请选择${project_title}模板`,
               name: 'templateName',
               choices: this.getTemplateListName()
           }
       ]
       // 初始化项目信息
       if(proejectType === INIT_PROJECT_TYPE.TYPE_PROJECT) {
           project =  await inquirer.prompt(initPrompt)
       } else if (proejectType === INIT_PROJECT_TYPE.TYPE_PROJECT) {
           initPrompt.push({
            type: 'input',
            name: 'compoentDescription',
            message: '请输入组件描述信息',
            default: '',
            validate: function(v) {
                const done = this.async()
                setTimeout(() => {
                    if(!v) return done('描述信息不能为空')
                    done(null, true)
                    }, 0)
            }
           })
           project = await inquirer.prompt(initPrompt)
       }
       if(project.projectName) {
           project.className = require('kebab-case')(project.projectName).replace(/^-/, '');
           project.version = project.projectVersion
           project.description = project.compoentDescription
       }
       return project
   }

    // 下载模板到缓存目录
    async downloadTemplate() {
        const {templateName} = this.project
        const templateInfo = this.tempaltes.find(tem => tem.npmName === templateName)
        // 获取模板缓存目录
        const targetPath = path.resolve(userHome, CACHE_DIR_PREFIX, 'template')
        const storeDirPath = path.resolve(targetPath, 'node_modules')
        const pkg = new Package({
            packageName: templateInfo.npmName,
            packageVersion:templateInfo.version,
            targetPath,
            storeDir:storeDirPath
        })
        if(!await pkg.exists()) {
            try {
                await pkg.install()
            } catch(e) {
                throw e
            }
        } else {
             await pkg.update()
        }
        this.npmPkgInfo = pkg
        this.templateInfo = templateInfo
   }
    // 安装模板到本地目录
    async installTemplate() {
       try {
           if(this.templateInfo) {
               const cacheFilePath = path.resolve(this.npmPkgInfo.cacheFilePath, 'template')
               const targetPath = process.cwd()
               fse.ensureDirSync(cacheFilePath)
               fse.ensureDirSync(targetPath)
               fse.copySync(cacheFilePath, targetPath)
               // 替换项目信息到本地packjson
               await this.ejsRender()
               // 执行模板预设命令
               await this.execTemplateCommand()
           } else {
               throw new Error('模式信息不存在')
           }
       } catch (e) {
           throw e
       }
   }

    async execTemplateCommand() {
       const {install, start } = this.templateInfo
        if(install) {
            const {code, args} = this.getTemplateCmd(install)
            const res = await utils.execSync(code, args, {
                cwd: process.cwd(),
                stdio: 'inherit'
            })
            if(res !== 0) throw new Error('依赖安装失败')
            if(start) {
                const {code: startCode , args: startArgs}  =this.getTemplateCmd(start)
                const res = await utils.execSync(startCode, startArgs, {
                    cwd: process.cwd(),
                    stdio: 'inherit'
                })
            }
        }
   }

   getTemplateCmd(cmds) {
       const cmd = cmds.split(' ')
       const code = cmd[0]
       // 检测可执行命令
       this.checkCommand(code)
       const args = cmd.slice(1)
       return {
           code,
           args
       }
   }

    checkCommand(code) {
       if(!code) throw new Error(`npm包<${name}>: 没有可执行的命令`)
       if (WHITE_COMMAND.includes(code)) return
        const {name} = this.templateInfo
        throw new Error(`npm包<${name}>: 执行的命令${code}为非法命令，不在可执行的白名单中`)
   }

    // 使用ejs动态渲染项目信息
    async ejsRender() {
       const cwd = process.cwd()
       const project = this.project
       return new Promise((resolve, reject) => {
           glob('**', {
               cwd,
               ignore: IGNORE_GLOB_PATH,
               nodir: true
           }, (err, files) => {
                if(err) reject(err)
               Promise.all(files.map(file => ejs.renderFile(path.join(cwd, file), project, {}, (err ,f) => {
                    if(err) {reject(err)}
                   fse.writeFileSync(path.join(cwd, file), f)
                    return Promise.resolve(true)
               })))
               .then(() => resolve(true))
               .catch(err => reject(err))
           })
       })
   }

    getTemplateListName() {
       const list = []
        this.tempaltes.forEach(template => {
           list.push({
               name: template.name,
               value: template.npmName
           })
       })
        return list
   }
    // 检测目录是否为空目录 -- (*.)开头与node_modules 文件不算
    checkDirifEmpty(path) {
       const fileList = fs.readdirSync(path)
       let isEmpty = true
        for (let file of fileList) {
            if(!file.startsWith('.') && ['node_modules'].indexOf(file) < 0) {
                isEmpty = false
                break;
            }
        }
        return isEmpty
   }
}

function init(argv) {
    return new InitCommand(argv)
}


module.exports = init;