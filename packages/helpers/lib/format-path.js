'use strict'

const path = require('path')

function formatPath(tar) {
    console.log(tar, '===')
    if(!tar) return;
    const sep = path.sep;
    if(sep === '/') return tar // Unix
    return tar.replace(/\\/g, '/') // win32
}

module.exports = formatPath