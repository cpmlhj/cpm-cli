const { request } = require('@cpm-cli/helpers')

const getPageTemplate = function () {
	return request({
		url: '/page/template'
	})
}

const getSectionTemplate = function () {
	return request({
		url: '/section/template'
	})
}

module.exports = { getPageTemplate, getSectionTemplate }
