const axios = require('axios')
const BASE_URL = 'https://gitee.com/api/v5'

class GiteeRequest {
	constructor(token) {
		this.token = token
		this.service = axios.create({
			baseURL: BASE_URL,
			timeout: 10000
		})
		this.service.interceptors.response.use(
			(response) => {
				return response.data
			},
			(error) => {
				if (error.response && error.response.data) return error.response
				else return Promise.reject(error)
			}
		)
	}

	get(url, params, headers) {
		return this.service({
			url,
			params: { ...params, access_token: this.token },
			method: 'GET'
		})
	}

	post(url, data, headers) {
		return this.service({
			url,
			params: { access_token: this.token },
			data: {
				...data,
				access_token: this.token
			},
			method: 'POST'
		})
	}
}

module.exports = GiteeRequest
