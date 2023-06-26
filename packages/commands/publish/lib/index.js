'use strict'
const { Command, Git, cloudBuild } = require('@cpm-cli/models')
const { logger } = require('@cpm-cli/utils')
const path = require('path')
const fse = require('fs-extra')

const WHITE_COMMAND = ['npm', 'cnpm', 'pnpm']

class PublishCommand extends Command {
	init() {
		this.options = this._argv.options
	}

	async exec() {
		try {
			/*
			 * 1.初始化检查
			 * 2.gitFlow自动化
			 * 3.云构建和云发布
			 */
			const startTime = new Date().getTime()
			const endTime = new Date().getTime()
			logger.info(
				'本次发布耗时:',
				Math.floor(endTime - startTime) / 1000 + '秒'
			)
			await this.prepare()
			const git = new Git(this.projectInfo, this.options)
			await git.prepare() // 自动化提交准备以及仓库初始化
			await git.commit() // 代码自动化提交
			await this.prepareBuild(git)
		} catch (err) {
			logger.error(err.message)
			if (process.env.LOG_LEVEL === 'verbose') console.log(err)
		}
	}

	async prepare() {
		// 1.确认项目是否为npm项目
		const projectPath = process.cwd()
		const pkgPath = path.resolve(projectPath, 'package.json')
		if (!(await fse.exists(pkgPath))) {
			throw new Error('package.json 不存在')
		}
		// 2.确认是否包含build命令
		const pkg = fse.readJsonSync(pkgPath)
		const { name, scripts, version } = pkg
		logger.verbose('package.json', name, scripts, version)
		if (!name || !version || !scripts || !scripts.build)
			throw new Error(
				`package.json 信息不全,请检查是否存在name、version和scripts(需提供build命令)`
			)
		this.projectInfo = { name, scripts, version, dir: projectPath }
	}

	async prepareBuild(git) {
		let { buildCmd } = this.options
		if (buildCmd) {
			this.checkCommand(buildCmd)
		} else {
			buildCmd = 'npm run build'
		}
		this.cloud_build = new cloudBuild({ git, config: { cmd: buildCmd } })
		await this.cloud_build.init()
		await this.cloud_build.build()
	}

	checkCommand(cmd) {
		const splitCmd = cmd.split(' ')
		const execCmd = splitCmd[0]
		if (WHITE_COMMAND.includes(execCmd)) return true
		throw new Error(`${execCmd} 不是有效的可执行命令`)
	}
}

function initCommand(args) {
	return new PublishCommand(args)
}

module.exports = initCommand
