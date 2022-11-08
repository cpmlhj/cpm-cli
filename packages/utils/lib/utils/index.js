'use strict'

function isObject(tar) {
    return Object.prototype.toString.call(tar) === '[object Object]'
}

module.exports = {
    isObject
}