#! /usr/bin/env node

const importLocal = require('import-local')

console.log('init cli', __filename, importLocal(__filename))