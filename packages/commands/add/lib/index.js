const { Command, Package } = require('@cpm-cli/models')
const { logger, utils } = require('@cpm-cli/utils')
const path = require('path')
const userHome = require('user-home')
const inquirer = require('inquirer')
const pathEx = require('path-exists')
const fse = require('fs-extra')
const glob = require('glob')
const ejs = require('ejs')
const pkgup = require('pkg-up')
const semver = require('semver')
const { getPageTemplate, getSectionTemplate } = require('./getTemplate')

const MODE_PAGE_SECTION = 'section'
const MODE_PAGE_TEMPLATE = 'template'
const CACHE_DIR_PREFIX = '.cpm'
const TYPE_CUSTOM = 'custom'
const TYPE_NORMAL = 'normal'

const MAP_REQUEST = {
	[MODE_PAGE_SECTION]: getSectionTemplate,
	[MODE_PAGE_TEMPLATE]: getPageTemplate
}

class AddCommand extends Command {
	init() {
		// 获取参数
	}
	async exec() {
		// 获取按照路径
		this.workDir = process.cwd()
		// 选择模版类型
		this.mode = await this.chooseMode()
		if (this.mode === MODE_PAGE_SECTION) {
			this.sectionTemplate = await this.getTemplate(MODE_PAGE_SECTION)
			// 预检测 模板是否存在冲突
			await this.prepare()
			// 安装模板
			await this.downloadTemplate()

			await this.installSection()
		} else {
			// 选择页面模板
			this.pageTemplate = await this.getTemplate(MODE_PAGE_TEMPLATE)

			// 预检测 模板是否存在冲突
			await this.prepare()
			// 安装模板
			await this.downloadTemplate()
			// 合并模板依赖
			await this.installTemplate()
		}
	}
	async prepare() {
		const mode = this.mode
		let name
		if (mode === MODE_PAGE_TEMPLATE) {
			name = this.pageTemplate[`${mode}Name`]
			this.copyPath = path.resolve(this.workDir, name)
		} else if (mode === MODE_PAGE_SECTION) {
			name = this.sectionTemplate[`${mode}Name`]
			this.copyPath = path.resolve(this.workDir, 'components', name)
		}

		// 生成最终拷贝路径
		logger.verbose('最终拷贝路径:' + this.copyPath)
		if (await pathEx(this.copyPath))
			throw new Error('页面文件夹已存在,名称为：' + name)
	}

	async fetchTemplate() {
		const API = MAP_REQUEST[this.mode]
		const result = await API()
		if (result && result.data) return result.data
		throw new Error(`${this.mode} api 请求失败:， ${result.message}`)
	}
	async getTemplate(mode = MODE_PAGE_TEMPLATE) {
		const title = mode === MODE_PAGE_TEMPLATE ? '页面' : '代码片段'
		const template = await this.fetchTemplate()
		const selectedTemplate = await inquirer.prompt({
			type: 'list',
			name: mode,
			message: `请选择${title}模板`,
			choices: this.createChoices(template)
		})
		const templateInfo = template.find(
			(item) => item.npmName === selectedTemplate[mode]
		)
		if (!templateInfo) throw new Error(`${title}模板不存在`)
		const info = await inquirer.prompt({
			type: 'input',
			name: `${mode}Name`,
			message: `请输入${title}名称`,
			default: '',
			validate: function (value) {
				const done = this.async()
				if (!value) return done(`请输入${title}名称`)
				done(null, true)
			}
		})
		templateInfo[`${mode}Name`] = info[`${mode}Name`].trim()
		return templateInfo
	}

	async chooseMode() {
		const { mode } = await inquirer.prompt({
			type: 'list',
			name: 'mode',
			choices: [
				{ name: '代码片段', value: MODE_PAGE_SECTION },
				{ name: '页面模板', value: MODE_PAGE_TEMPLATE }
			],
			message: '请选择复用模板类型'
		})
		return mode
	}

	getModeTemplate() {
		switch (this.mode) {
			case MODE_PAGE_TEMPLATE:
				return this.pageTemplate
			case MODE_PAGE_SECTION:
				return this.sectionTemplate
			default:
				throw new Error('检测到额外模板类型' + this.mode)
		}
	}

	async downloadTemplate() {
		// 缓存文件夹路径
		const targetPath = path.resolve(userHome, CACHE_DIR_PREFIX, 'template')
		// 真实路径
		const storeDir = path.resolve(targetPath, 'node_modules')
		const { npmName, version } = this.getModeTemplate()
		const targetPackage = new Package({
			targetPath,
			storeDir,
			packageName: npmName,
			packageVersion: version
		})
		// 页面模板是否存在
		if (!(await targetPackage.exists())) {
			// 安装
			try {
				await targetPackage.install()
			} catch (e) {
				throw e
			} finally {
				if (await targetPackage.exists()) {
					logger.success('下载模板成功')
					this.package = targetPackage
				}
			}
		} else {
			// 更新
			try {
				await targetPackage.update()
			} catch (e) {
				throw e
			} finally {
				if (await targetPackage.exists()) {
					logger.success('更新模板成功')
					this.package = targetPackage
				}
			}
		}
	}

	async installTemplate() {
		logger.verbose('pageTepmplate', this.pageTemplate)
		// 获取模板路径
		const templatePath = path.resolve(
			this.package.cacheFilePath,
			'template',
			this.pageTemplate.targetPath
		)
		if (!(await pathEx(templatePath)))
			throw new Error('页面模板不存在! -->' + templatePath)
		// 获取目标路径
		logger.verbose('templatePath', templatePath)
		logger.verbose('copyPath', this.copyPath)
		fse.ensureDirSync(templatePath)
		fse.ensureDirSync(this.copyPath)
		// 执行默认安装
		if (this.pageTemplate.type === TYPE_NORMAL) {
			await this.defaultInstallTemplate(templatePath)
		} else {
			await this.customInstallTemplate(templatePath)
		}
		logger.info('安装页面模板成功')
	}

	async installSection() {
		// 需要用户输入插入行数
		const { insertLine } = await inquirer.prompt({
			type: 'input',
			meesage: '请输入要插入的行数',
			name: 'insertLine',
			default: '',
			validate: function (value) {
				const done = this.async()
				if (!value || !value.trim()) return done(`请输入${title}名称`)
				else if (Math.floor(value) === Number(value) && value >= 0) {
					done(null, true)
				} else {
					done('插入的行数必须为正数')
				}
				done(null, true)
			}
		})
		// 选择插入模板代码的文件
		const files = fse
			.readdirSync(this.workDir, { withFileTypes: true })
			.filter((file) => file.isFile())
			.map((file) => ({ name: file.name, value: file.name }))
		if (files.length === 0) throw new Error('当前可插入模板代码的文件为空')
		const { codeFile } = await inquirer.prompt({
			type: 'list',
			message: '请选择要插入模板代码的文件',
			name: 'codeFile',
			choices: files,
			default: 0
		})
		const codeFilePath = path.resolve(this.workDir, codeFile)
		const codeContent = fse.readFileSync(codeFilePath, 'utf-8')
		const insertCode = `${this.sectionTemplate[`${this.mode}Name`]}`
		const contentArr = codeContent.split('\n')
		const importIdx = contentArr.findIndex((item) =>
			item.replace(/\s/g, '').includes('<script')
		)
		contentArr.splice(
			insertLine,
			0,
			`<${insertCode.toLocaleLowerCase()} />`
		)
		contentArr.splice(
			importIdx + 1,
			0,
			`import ${insertCode} from './components/${insertCode}.vue'`
		)
		// 修改后重新写入
		fse.writeFileSync(codeFilePath, contentArr.join('\n'), 'utf-8')
		// 创建代码模版组件目录
		fse.ensureDirSync(this.copyPath)
		// 获取模板路径
		const templatePath = path.resolve(
			this.package.cacheFilePath,
			'template',
			this.sectionTemplate.targetPath
		)
		fse.copySync(templatePath, this.copyPath)
	}

	// 默认安装模式
	async defaultInstallTemplate(templatePath) {
		fse.copySync(templatePath, this.copyPath)
		await this.ejsRender()
		await this.dependenciesMerge(templatePath)
	}

	// 自定义安装模式
	async customInstallTemplate(templatePath) {
		// 获取自定义模板入口文件
		const rootFile = this.package.getEntryFilePath()
		if (fse.existsSync(rootFile)) {
			const options = {
				templatePath,
				targetPath: this.copyPath,
				template: this.pageTemplate
			}
			const code = `require(${rootFile})(${JSON.stringify(options)})`
			await utils.execAsync('node', ['-e', code], {
				stdio: 'inherit',
				cwd: process.cwd()
			})
			logger.success('自定义模版安装成功')
		} else {
			throw new Error('自定义模板入口文件不存在！')
		}
	}

	async ejsRender() {
		const pageTemplate = this.pageTemplate
		const copyPath = this.copyPath
		return new Promise((resolve, reject) => {
			glob(
				'**',
				{
					cwd: copyPath,
					nodir: true,
					ignore: pageTemplate.ignore
				},
				function (err, files) {
					if (err) {
						reject(err)
					} else {
						Promise.all(
							files.map((file) => {
								// 真实路径
								const filePath = path.resolve(copyPath, file)
								return new Promise((resolve, reject) => {
									ejs.renderFile(
										filePath,
										{
											name: pageTemplate.pageName
										},
										{},
										(err, result) => {
											if (err) reject(err)
											// 重写文件信息
											fse.writeFileSync(filePath, result)
											resolve(result)
										}
									)
								})
							})
						)
							.then(resolve)
							.catch((e) => reject(e))
					}
				}
			)
		})
	}
	async dependenciesMerge(templatePath) {
		function objectToArray(obj) {
			return Object.keys(obj).map((key) => ({
				key,
				value: obj[key]
			}))
		}

		function ArryToObject(array) {
			const emptyObj = Object.create({})
			array.forEach((item) => {
				emptyObj[item.key] = item.value
			})
			return emptyObj
		}

		function depDiff(sourceDepArr, targetDepArr) {
			let finalDep = [...targetDepArr]
			sourceDepArr.forEach((sourceDep) => {
				const duplicateDep = targetDepArr.find(
					(targetdep) => sourceDep.key === targetdep.key
				)
				if (duplicateDep) {
					// 根据依赖版本有效范围判断是否需要显示冲突
					logger.info('查询到重复依赖')
					const sourceDepVersionRange = semver
						.validRange(sourceDep.value)
						.split('<')[1]
					const duplicateDepVersionRange = semver
						.validRange(duplicateDep.value)
						.split('<')[1]
					if (sourceDepVersionRange !== duplicateDepVersionRange) {
						logger.warn(
							`${sourceDep.key}冲突，页面模板版本号为:${sourceDep.value} => ${duplicateDep.value}`
						)
					}
				} else {
					// 新增
					finalDep.push(sourceDep)
				}
			})
			return finalDep
		}
		/**
		 * 处理依赖合并问题
		 * ①: 模板中存在依赖，项目中不存在
		 * ②: 模板中存在依赖，项目也存在，（可能存在冲突， 不拷贝依赖，脚手架给出提示， 开发者酌情处理）
		 */
		const copyPathPkgPath = pkgup.sync({ cwd: this.copyPath })
		const templatePkgPath = pkgup.sync({ cwd: templatePath })
		const templatePkg = fse.readJSONSync(templatePkgPath)
		const copyPathPkg = fse.readJSONSync(copyPathPkgPath)
		const copyPathPkgPathDependencis = copyPathPkg.dependencies || {}
		const templatePkgDependencis = templatePkg.dependencies || {}
		const copyPathPkgPathDependencisArr = objectToArray(
			copyPathPkgPathDependencis
		)
		const templatePkgDependencisArr = objectToArray(templatePkgDependencis)
		// 依赖differ
		const finalDep = depDiff(
			templatePkgDependencisArr,
			copyPathPkgPathDependencisArr
		)
		logger.verbose(JSON.stringify(finalDep), 'finalDep')
		copyPathPkg.dependencies = ArryToObject(finalDep)
		fse.writeFileSync(copyPathPkgPath, JSON.stringify(copyPathPkg), {
			spaces: 2
		})
		// 安装依赖
		await this.execCommand('npm install', path.dirname(copyPathPkgPath))
	}

	async execCommand(command, cwd) {
		let ret
		if (command) {
			const cmdArray = command.split(' ')
			const args = cmdArray.slice(1)
			ret = await utils.execAsync(cmdArray[0], args, {
				stdio: 'inherit',
				cwd
			})
		}
		if (ret !== 0) throw new Error(`${command}命令执行失败`)
		return ret
	}

	createChoices(choices) {
		return choices.map((item) => ({
			name: item.name,
			value: item.npmName
		}))
	}
}

function init(argv) {
	logger.verbose(argv, 'add argv')
	return new AddCommand(argv)
}

module.exports = init
