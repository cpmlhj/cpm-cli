const simpleGit = require('simple-git')
const path = require('path')
const userHome = require('user-home')
const { logger, utils } = require('@cpm-cli/utils')
const fse = require('fs-extra')
const inquirer = require('inquirer')
const fs = require('fs')
const { writeFile } = require('@cpm-cli/utils/lib/utils')
const REPO_OWNER_USER = 'user'
const REPO_OWNER_ORG = 'org'
const DEFAULT_HOME_PATH = '.cpm'
const GIT_ROOT_DIRECTORY = '.GIT'
const GIT_SERVER_FILE = '.gitServer'
const GIT_SERVER_TOKEN = '.gitToken'
const GIT_OWN_FILE = '.gitOwn'
const GIT_LOGIN_FILE = '.gitLogin'
const GIT_OWNER_TYPE = [
	{
		name: '个人',
		value: REPO_OWNER_USER
	},
	{
		name: '组织',
		value: REPO_OWNER_ORG
	}
]
const GIT_OWNER_TYPE_ONLY = [
	{
		name: '个人',
		value: REPO_OWNER_USER
	}
]
const GIT_SERVER_TYPE = [
	{
		name: 'github',
		value: 'github'
	},
	{
		name: 'gitee',
		value: 'gitee'
	}
]

class Git {
	constructor(
		{ name, version, dir },
		{ resetServer = false, resetToken = false }
	) {
		this.name = name
		this.version = version
		this.dir = dir
		this.git = simpleGit(this.dir)
		this.gitServer = null
		this.config = { resetServer, resetToken }
		this.homePath = null
		this.user = null //  用户信息
		this.org = null // 用户所属组织
		this.owner = null // 远程仓库类型
		this.login = null // 远程仓库登录名
		this.repo = null // 远程仓库对象
	}

	init() {
		console.log('init')
	}

	async prepare() {
		// 检测缓存的主目录
		this.checkHomePath()
		// 检测用户远程仓库类型
		await this.checkGitServer()
		// 创建gitServer实例
		await this.createGitServer()
		// 获取远程仓库token
		await this.checkGitToken()
		// 获取远程仓库组织信息 --> 区分当前仓库是组织仓库 还是个人仓库
		await this.getUserAndOrgs()
		//  确认远程仓库的类型
		await this.checkGitOwner()
		// 检测并创建远程仓库
		await this.checkRepo()
	}

	checkHomePath() {
		if (!this.homePath) {
			this.homePath = process.env.CPM_CLI_HOME_PATH
		} else {
			this.homePath = path.resolve(userHome, DEFAULT_HOME_PATH)
		}
		fse.ensureDirSync(this.homePath)
		if (!fs.existsSync(this.homePath)) {
			throw new Error('用户主目录不可用')
		}
	}

	async checkGitServer() {
		const gitFilePath = this.createPath(GIT_SERVER_FILE)
		const gitServerType = utils.readFile(gitFilePath)
		if (!gitServerType || this.config.resetServer) {
			const { serverType } = await inquirer.prompt({
				type: 'list',
				name: 'serverType',
				description: '选择初始化git类型',
				message: '选择初始化git类型',
				choices: GIT_SERVER_TYPE,
				default: 'github'
			})
			utils.writeFile(gitFilePath, serverType)
			logger.success(`git server 成功写入 ---> ${gitFilePath}`)
		} else {
			logger.success(`git server 获取成功 ---> ${gitServerType}`)
		}
		this.gitServerType = gitServerType.trim()
	}

	async checkGitToken() {
		const tokenPath = this.createPath(GIT_SERVER_TOKEN)
		let gitToken = utils.readFile(tokenPath)
		if (!gitToken || this.config.resetServer) {
			logger.warn(
				`${
					this.gitServerType
				}: token未生成,请先生成:${this.gitServer.getTokenHelp()}`
			)
			const { token } = await inquirer.prompt({
				type: 'password',
				name: 'token',
				description: '请将token复制到这里',
				message: '请将token复制到这里',
				default: ''
			})
			gitToken = token
			utils.writeFile(tokenPath, gitToken)
			logger.success(`git token 成功写入 ${gitToken} ---> ${tokenPath}`)
		} else {
			logger.success(`git token 读取成功 ---> ${tokenPath}`)
		}
		this.gitServer.setToken(gitToken)
	}

	async checkGitOwner() {
		const ownerPath = this.createPath(GIT_OWN_FILE)
		const loginPath = this.createPath(GIT_LOGIN_FILE)
		let owner = utils.readFile(ownerPath)
		let login = utils.readFile(loginPath)
		if (!owner || !login || this.config.resetServer) {
			owner = (
				await inquirer.prompt({
					type: 'list',
					name: 'owner',
					description: '请选择远程仓库类型',
					message: '请选择远程仓库类型',
					choices:
						this.orgs.length > 0
							? GIT_OWNER_TYPE
							: GIT_OWNER_TYPE_ONLY,
					default: REPO_OWNER_USER
				})
			).owner
			if (owner === REPO_OWNER_USER) {
				login = this.user.login
			} else {
				login = (
					await inquirer.prompt({
						type: 'list',
						name: 'login',
						description: '请选择',
						message: '请选择',
						choices: this.orgs.map((item) => ({
							name: item.login,
							value: item.login
						}))
					})
				).login
			}
			writeFile(ownerPath, owner)
			writeFile(loginPath, login)
		}
		logger.success(` owner 获取成功 ${owner} ---> ${ownerPath}`)
		logger.success(` login 获取成功 ${login} ---> ${loginPath}`)
		this.owner = owner
		this.login = login
	}

	async checkRepo() {
		let repo = await this.gitServer.getRepo(this.login, this.name)
		if (!repo) {
			// 远程仓库不存在， 需要创建
			console.log('创建')
			try {
				if (this.owner === REPO_OWNER_USER) {
					console.log(this.name, '===')
					repo = await this.gitServer.createRepo(this.name)
				} else {
					this.gitServer.createOrgRepo(this.name, this.login)
				}
			} catch (e) {
				logger.error(e)
			}
			if (!repo) {
				throw new Error('远程仓库创建失败')
			}
			logger.success('远程仓库创建成功')
		} else {
			logger.success('远程仓库获取成功')
		}
		this.repo = repo
	}

	async getUserAndOrgs() {
		this.user = await this.gitServer.getUser()
		if (!this.user) throw new Error('获取gitee用户信息失败')
		this.orgs = await this.gitServer.getOrg(this.user.name)
		if (!this.orgs) throw new Error('获取gitee用户组织信息失败')
	}

	async createGitServer() {
		if (!this.gitServerType) return
		this.gitServer = new (require(`./${this.gitServerType}`))()
		if (!this.gitServer) throw new Error('git server 初始化失败')
	}

	createPath(file) {
		const ROOT_DIR = path.resolve(this.homePath, GIT_ROOT_DIRECTORY)
		const filePath = path.resolve(ROOT_DIR, file)
		fse.ensureDirSync(ROOT_DIR)
		return filePath
	}
}

module.exports = Git
