#! /usr/bin/env node

const importLocal = require('import-local')
const {logger} = require('@cpm-cli/utils')

if (importLocal(__filename)) {
    logger.info('使用本地路径包~')
} else {
    logger.info('running')
    require('../lib')()
}