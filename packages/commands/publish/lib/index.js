'use strict'
const { Command, Git } = require('@cpm-cli/models')
const { logger } = require('@cpm-cli/utils')
const path = require('path')
const fse = require('fs-extra')

class PublishCommand extends Command {
	init() {
		console.log(this._argv, 'publis')
		this.options = this._argv.options
	}

	async exec() {
		try {
			/*
             * 1.初始化检查
               2.gitFlow自动化
               3.云构建和云发布
             */
			const startTime = new Date().getTime()
			const endTime = new Date().getTime()
			logger.info(
				'本次发布耗时:',
				Math.floor(endTime - startTime) / 1000 + '秒'
			)
			await this.prepare()
			const git = new Git(this.projectInfo, this.options)
			await git.prepare()
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
}

function initCommand(args) {
	return new PublishCommand(args)
}

module.exports = initCommand
