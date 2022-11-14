'use strict'

const cp = require('child_process')

function isObject(tar) {
    return Object.prototype.toString.call(tar) === '[object Object]'
}

function execSync(cmd, code, opt) {
    return new Promise((resolve, reject) => {
        const child = Spawn(cmd,code, opt)
        child.on('error', e => {
            reject(e)
        })
        child.on('exit', c => {
            resolve(c)
        })
    })
}

function Spawn(cmd, args, opt) {
    const win32 = process.platform === 'win32'
    const command = win32 ? 'cmd': cmd
    const cmdArgs = win32 ? ['/c'].concat(cmd, args) : args
    return cp.spawn(command, cmdArgs, opt || {})
}

module.exports = {
    isObject,
    execSync
}