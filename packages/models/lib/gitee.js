const gitServer = require('./gitServer')
const giteeRequest = require('./giteeRequest')

class Gitee extends gitServer {
	constructor() {
		super('gitee')
		this.gitRequest = null
	}

	setToken(token) {
		this.token = token
		this.gitRequest = new giteeRequest(this.token)
	}

	async getUser() {
		return this.gitRequest?.get('/user')
	}

	getOrg(username) {
		return this.gitRequest?.get(`/users/${username}/orgs`, {
			page: 1,
			per_page: 100
		})
	}

	getRepo(login, name) {
		return this.gitRequest
			.get(`/repos/${login}/${name}`)
			.then((response) => {
				return this.handleResponse(response)
			})
	}

	getRemote(login, name) {
		return `git@gitee.com:${login}/${name}.git`
	}

	getTokenHelp() {
		return 'https://gitee.com/profile/sshkeys'
	}

	getSSHkeyHelp() {
		return 'https://gitee.com/help/articles/4191'
	}

	createRepo(name) {
		return this.gitRequest
			?.post('/user/repos', {
				name
			})
			.then((response) => {
				return this.handleResponse(response)
			})
	}

	createOrgRepo(org, name) {
		return this.gitRequest
			.post(
				`/orgs/${org}repos`,
				{
					name
				},
				{
					Accept: 'application/vnd.github.v3+json'
				}
			)
			.then((response) => {
				return this.handleResponse(response)
			})
	}

	isHttpResponse(response) {
		return (
			response && response.status && typeof response.status === 'number'
		)
	}

	handleResponse(response) {
		if (this.isHttpResponse(response) && response.status !== 200) {
			return null
		} else {
			return response
		}
	}
}

module.exports = Gitee
