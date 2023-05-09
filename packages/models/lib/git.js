const simpleGit = require('simple-git')
const path = require('path')
const userHome = require('user-home')
const { logger, utils } = require('@cpm-cli/utils')
const fse = require('fs-extra')
const semver = require('semver')
const inquirer = require('inquirer')
const fs = require('fs')
const REPO_OWNER_USER = 'user'
const REPO_OWNER_ORG = 'org'
const DEFAULT_HOME_PATH = '.cpm'
const GIT_ROOT_DIRECTORY = '.GIT'
const GIT_SERVER_FILE = '.gitServer'
const GIT_SERVER_TOKEN = '.gitToken'
const GIT_OWN_FILE = '.gitOwn'
const GIT_LOGIN_FILE = '.gitLogin'
const GIT_IGNORE = '.gitignore'
const VERSION_RELEASE = 'release'
const VERSION_DEVELOP = 'dev'
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
		this.git = simpleGit({
			baseDir: this.dir,
			binary: 'git'
		})
		this.gitServer = null
		this.config = { resetServer, resetToken }
		this.homePath = null
		this.user = null //  用户信息
		this.org = null // 用户所属组织
		this.owner = null // 远程仓库类型
		this.login = null // 远程仓库登录名
		this.repo = null // 远程仓库对象
		this.branch = null // 本地开发分支
	}

	async init() {
		/**
		 * 初始化本地仓库
		 */
		if (!(await this.getRemote())) {
			await this.initAndRemote()
			await this.initCommit()
		}
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
		// 检测gitIgnore文件
		await this.checkGitIgnore()
		// 执行本地git 初始化流程
		await this.init()
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
			utils.writeFile(ownerPath, owner)
			utils.writeFile(loginPath, login)
		}
		logger.success(` owner 获取成功 ${owner} ---> ${ownerPath}`)
		logger.success(` login 获取成功 ${login} ---> ${loginPath}`)
		this.owner = owner
		this.login = login
	}

	async checkRepo() {
		let repo = await this.gitServer.getRepo(this.login, this.name)
		logger.verbose('当前获取的仓库为:' + repo)
		if (!repo) {
			// 远程仓库不存在， 需要创建
			try {
				if (this.owner === REPO_OWNER_USER) {
					repo = await this.gitServer.createRepo(this.name)
				} else {
					repo = await this.gitServer.createOrgRepo(
						this.name,
						this.login
					)
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

	async checkGitIgnore() {
		const filePath = path.resolve(this.dir, GIT_IGNORE)
		if (!fs.existsSync(filePath)) {
			utils.writeFile(
				filePath,
				`
.DS_Store
node_modules
/dist


# local env files
.env.local
.env.*.local

# Log files
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Editor directories and files
.idea
.vscode
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
			`
			)
			logger.success(`自动写入${GIT_IGNORE}文件成功`)
		}
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

	async getRemote() {
		const gitPath = path.resolve(this.dir, GIT_ROOT_DIRECTORY)
		this.remote = await this.gitServer.getRemote(this.login, this.name)
		if (fs.existsSync(gitPath)) {
			logger.success('git初始化完成')
			return true
		}
	}

	async initAndRemote() {
		logger.notice('git 初始化')
		await this.git.init()
		const remote = await this.git.getRemotes()
		if (!remote || !remote.find((item) => item.name === 'origin')) {
			await this.git.addRemote('origin', this.remote)
		}
	}

	createPath(file) {
		const ROOT_DIR = path.resolve(this.homePath, GIT_ROOT_DIRECTORY)
		const filePath = path.resolve(ROOT_DIR, file)
		fse.ensureDirSync(ROOT_DIR)
		return filePath
	}

	async initCommit() {
		// 检测代码冲突
		await this.checkConflicted()
		// 检测是否存在文件未commit
		await this.checkNotCommited()
		// 检测远程仓库master
		if (await this.checkRemoteMaster()) {
			// 拉取最新的master代码 并再次提交
			await this.pullRemoteRepo('master', {
				'--allow-unrelated-histories': null
			})
		} else {
			// 不存在master
			const { current: currentBranch } = await this.git.status()
			// 适配 git2.28之后 默认分支为main
			if (currentBranch === 'main') {
				await this.pushRemoteRepo('main')
				// 切换到master
				await this.git.checkoutBranch('master', 'main')
			}
			await this.pushRemoteRepo('master')
		}
	}

	async checkConflicted() {
		logger.info('代码冲突检测')
		const gitStatus = await this.git.status()
		if (gitStatus.conflicted.length > 0)
			throw new Error('当前代码存在冲突，请手动处理合并后再试')
	}

	async checkNotCommited() {
		const gitStatus = await this.git.status()
		if (
			gitStatus.not_added.length > 0 ||
			gitStatus.created.length > 0 ||
			gitStatus.deleted.length > 0 ||
			gitStatus.modified.length > 0 ||
			gitStatus.renamed.length > 0
		) {
			await this.git.add(gitStatus.not_added)
			await this.git.add(gitStatus.created)
			await this.git.add(gitStatus.deleted)
			await this.git.add(gitStatus.modified)
			await this.git.add(gitStatus.renamed)
			let message
			while (!message) {
				message = (
					await inquirer.prompt({
						type: 'text',
						name: 'message',
						message: '请输入提交信息'
					})
				).message
			}
			await this.git.commit(message)
			logger.success('本次commit提交成功')
		}
	}

	async checkRemoteMaster() {
		const listRemote = await this.git.listRemote(['--refs'])
		return listRemote && listRemote.indexOf('refs/heads/master') >= 0
	}

	async pushRemoteRepo(branchName) {
		logger.info(`推送提交至${branchName}分支`)
		await this.git.push(['-u', 'origin', `${branchName}`])
		logger.success(`推送成功`)
	}

	async pullRemoteRepo(branchName, options = {}) {
		logger.info(`同步远程${branchName}代码`)
		await this.git
			.pull('origin', branchName, options)
			.catch((err) => logger.error(err.message))
	}

	// 自动化提价
	async commit() {
		/**
		 * ① 生成开发分支
		 * ② 在开发分支上提交代码
		 * ③ 合并远程开发分支
		 * ④ 提送开发分支
		 */
		await this.setCorrectVersion()
	}

	async setCorrectVersion() {
		// 获取远程发布分支
		// 规范: release/x.y.z, dve/x.y.z
		// 版本号递增规范 major/minor/patch
		logger.info('获取代码分支')
		const remoteList = await this.getRemoteBranchList(VERSION_RELEASE)
		let latestVersion
		if (remoteList && remoteList.length > 0) {
			latestVersion = remoteList[0]
		}
		logger.verbose('线上最新版本号', latestVersion)
		// 生成本地开发分支
		const devVersion = this.version
		if (!latestVersion) {
			this.branch = `${VERSION_DEVELOP}/${devVersion}`
		} else if (semver.gt(this.version, latestVersion)) {
			logger.info(
				'当前版本大于线上最新版本',
				`${devVersion} >= ${latestVersion}`
			)
			this.branch = `${VERSION_DEVELOP}/${devVersion}`
		} else {
			logger.info(
				'当前版本线上版本大于本地版本',
				`${latestVersion} >= ${devVersion}`
			)
			const incType = (
				await inquirer.prompt({
					type: 'list',
					name: 'incType',
					choices: [
						{
							name: `小版本 ${latestVersion} -> ${semver.inc(
								latestVersion,
								'patch'
							)}`,
							value: 'patch'
						},
						{
							name: `中版本 ${latestVersion} -> ${semver.inc(
								latestVersion,
								'minor'
							)}`,
							value: 'minor'
						},
						{
							name: `大版本 ${latestVersion} -> ${semver.inc(
								latestVersion,
								'major'
							)}`,
							value: 'major'
						}
					],
					message: '自动升级版本，请选择版本类型',
					default: 'patch'
				})
			).incType
			const nextVersion = semver.inc(latestVersion, incType)
			this.branch = `${VERSION_DEVELOP}/${nextVersion}`
			this.version = nextVersion
			this.syncVersionToPackageJson()
		}
	}

	async getRemoteBranchList(type) {
		const remoteList = await this.git.listRemote(['--refs'])
		let reg
		if (type === VERSION_RELEASE) {
			reg = /.+?refs\/tags\/release\/(\d+\.\d+\.\d+)/g
		} else {
			//
		}
		return remoteList
			.split('\n')
			.map((remote) => {
				const match = reg.exec(remote)
				reg.lastIndex = 0
				if (match && semver.valid(match[1])) return match[1]
			})
			.filter((item) => !!item)
			.sort((a, b) => {
				if (semver.lte(b, a)) {
					if (a === b) return 0
					return -1
				}
				return 1
			})
	}

	/**
	 * 将最新版本号同步到项目package.json
	 */
	syncVersionToPackageJson() {
		const pkg = fse.readJsonSync(`${this.dir}/package.json`)
		if (pkg && pkg.version !== this.version) {
			pkg.version = this.version
			fse.writeJsonSync(`${this.dir}/pacjage.json`, pkg, { spaces: 2 })
		}
	}
}

module.exports = Git
