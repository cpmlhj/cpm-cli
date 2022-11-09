const {request} = require('@cpm-cli/helpers')

module.exports = function () {
    return request({
        url: '/project/template'
    })
}