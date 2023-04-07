'use strict'

const axios = require('axios')
const semver = require('semver')

/*
 * 获取npm包信息
 * param {string} npmName 包名称
 * param {string} npmRegistry 远程库地址
 */
async function getNpmInfo(npmName, registry) {
	if (!npmName) throw new Error('获取npm包信息:缺少关键参数 npmName')
	const npmRegistry = registry || getDetaultNpmRegistry(true)
	try {
		const response = await axios.get(`${npmRegistry}/${npmName}`)
		if (response.status === 200) return response.data
		return null
	} catch (e) {
		return Promise.reject(e)
	}
}

/*
 * 获取npm包版本信息
 * param {string} npmName 包名称
 * param {string} npmRegistry 远程库地址
 */
async function getNpmVersion(npmName, registry) {
	const npmInfo = await getNpmInfo(npmName, registry)
	if (!npmInfo) return []
	return Object.keys(npmInfo.versions)
}

/*
 * 获取大于当前npm包的版本号
 * param {string} npmName 包名称
 * param {string} npmRegistry 远程库地址
 * param {string} targetVersion 当前包名称
 */
async function getNpmSemverVersion({ npmName, registry, targetVersion }) {
	const versions = await getNpmVersion(npmName, registry)
	if (!versions || versions.length === 0) return []
	const semverVersions = getSemverVersion(targetVersion, versions, '^')
	return (
		(semverVersions && semverVersions.length > 0 && semverVersions[0]) ||
		null
	)
}

async function getLatestNpmVersion({ npmName, registry }) {
	const versions = await getNpmVersion(npmName, registry)
	if (versions) {
		versions.sort((a, b) => (semver.gt(b, a) ? 1 : -1))
		return versions[0]
	}
	return null
}

function getSemverVersion(base, vers, matchText) {
	return vers
		.filter((ve) => semver.satisfies(ve, `${matchText}${base}`))
		.sort((a, b) => (semver.gt(b, a) ? 1 : -1))
}

function getDetaultNpmRegistry(isOrigin = false) {
	return (
		(isOrigin && 'https://registry.npmjs.org') ||
		'https://registry.npm.taobao.org'
	)
}

module.exports = {
	getNpmInfo,
	getNpmSemverVersion,
	getLatestNpmVersion,
	getDetaultNpmRegistry
}
