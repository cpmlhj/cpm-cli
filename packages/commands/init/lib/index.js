'use strict';

const {Command, Package} = require('@cpm-cli/models')
const {logger} = require('@cpm-cli/utils')

const inquirer = require('inquirer')
const fse = require('fs-extra')
const fs = require('fs')
const semver = require('semver')
const path = require('path')
const userHome = require('user-home')

const getTemplate = require('./getTemplate')

const INIT_PROJECT_TYPE = {
    TYPE_PROJECT: 'TYPE_PROJECT',
    TYPE_COMPONENT: 'TYPE_COMPONENT'
}

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
           }
       } catch(e) {
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
       // 初始化项目信息
       if(proejectType === INIT_PROJECT_TYPE.TYPE_PROJECT) {
           const projectInfo = await inquirer.prompt([
               {
                   type: 'input',
                   message: "请输入项目名称",
                   default: this.projecName,
                   name: 'projectName',
                   validate: v => {
                       // 通过正则限制 项目名称 首字母必须为英文，尾字母为英文/数字，特殊字符只允许_/-
                       return project_name_match.test(v)
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
                   message: '请选择项目模板',
                   name: 'templateName',
                   choices: this.getTemplateListName()
               }
           ])
           project = projectInfo
       }
       return project
   }

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