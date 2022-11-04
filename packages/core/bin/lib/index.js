'use strict';

const pkg = require('../../package.json')
const userHome = require('user-home')
const pathEx = require('path-exists')
const path = require('path')
const semver = require('semver')
const colors = require('colors')

const {logger} = require('@cpm-cli/utils')
const {getNpmSemverVersion} = require('@cpm-cli/helpers')

const {DEFAULT__CLI_HOME} = require('./constant')

async function core(...args) {
    try {
        logger.verbose(args)
        await prepare()
    } catch (e) {
        logger.error(e.message)
        logger.verbose(e)
    }
}

/*
 * 核心流程：准备工作
 * 1. 检查当前脚手架版本
 * 2. 检查当前的用户主目录(缓存资源时用到)
 * 3. 检查当前环境变量
 * 4. 检查脚手架是否需要更新
*/
async function prepare() {
    // step one
    checkVersion()
    // step two
    checkUserHome()
    // step three
    checkEnv()
    // step four
    checkUpdate()
}

function checkVersion() {
    logger.info(`当前使用的版本:${pkg.version}`)
}

function checkUserHome() {
    if (!userHome || !pathEx(userHome)) {
        throw new Error('当前登录的用户主目录不存在')
    }
}

function checkEnv() {
    const dotenv = require('dotenv')
    const pathEnv = path.resolve(userHome, '.env')
    if (pathEx(pathEnv)) {
        dotenv.config({
            path: pathEnv
        })
    }
    createDefaultEnv()
}

function createDefaultEnv() {
    const cli_config = {
        home: userHome
    }
    if (!process.env.CPM_CLI_HOME) {
        cli_config['cli_home'] = path.resolve(userHome, DEFAULT__CLI_HOME)
    } else {
        cli_config['cli_home'] = path.resolve(userHome, CPM_CLI_HOME)
    }
    process.env.CPM_CLI_HOME_PATH = cli_config['cli_home']
}

async function checkUpdate() {
    const {version, name} = pkg
    // 获取当前最大的版本
    const lastVersion = await getNpmSemverVersion({
        npmName: name,
        registry: null,
        targetVersion: version
    })
    // 对比当前版本，若要更新 提示
    if (lastVersion && semver.gt(lastVersion, version)) {
        logger.warn(
            '更新提示',
            colors.yellow(
                    `请手动更新${name}, 当前版本:${version}, 最新版本${lastVersion}

                    更新命令： npm install -g ${name}
                        `
            )
        )
    }
}

module.exports = core;
