'use strict'

const cp = require('child_process')
const fs = require('fs')

function isObject(tar) {
	return Object.prototype.toString.call(tar) === '[object Object]'
}

function readFile(path, options = {}) {
	if (!fs.existsSync(path)) return null
	const buffer = fs.readFileSync(path)
	if (buffer) {
		if (options.toJSON) {
			return buffer.toJSON()
		} else {
			return buffer.toString()
		}
	}
}

function writeFile(path, data, options = { rewrite: true }) {
	if (fs.existsSync(path)) {
		if (options.rewrite) {
			fs.writeFileSync(path, data)
			return true
		} else {
			return false
		}
	} else {
		fs.writeFileSync(path, data)
		return true
	}
}

function execAsync(cmd, code, opt) {
	return new Promise((resolve, reject) => {
		const child = Spawn(cmd, code, opt)
		child.on('error', (e) => {
			reject(e)
		})
		child.on('exit', (c) => {
			resolve(c)
		})
	})
}

function Spawn(cmd, args, opt) {
	const win32 = process.platform === 'win32'
	const command = win32 ? 'cmd' : cmd
	const cmdArgs = win32 ? ['/c'].concat(cmd, args) : args
	return cp.spawn(command, cmdArgs, opt || {})
}

module.exports = {
	isObject,
	execAsync,
	readFile,
	writeFile
}
