'use strci'

const logger = require('npmlog')
logger.level = process.env.CPM_CLI_LOG_LEVEL || 'info'
logger.addLevel('success', 2000, { fg: 'green', blod: true })
logger.heading = 'cpm-cli'

module.exports = logger
