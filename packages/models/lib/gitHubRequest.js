const axios = require('axios')
const BASE_URL = 'https://api.github.com'

class GitHubRequest {
	constructor(token) {
		this.token = token
		this.service = axios.create({
			baseURL: BASE_URL,
			timeout: 5000
		})
		this.service.interceptors.request.use(
			(config) => {
				config.headers['Authorization'] = `token ${this.token}`
				return config
			},
			(error) => {
				return Promise.reject(error)
			}
		)
		this.service.interceptors.response.use(
			(response) => {
				return response.data
			},
			(error) => {
				if (error.response && error.response.data)
					return error.response.data
				else return Promise.reject(error)
			}
		)
	}

	get(url, params) {
		return this.service({
			url,
			params: { ...params },
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

module.exports = GitHubRequest
