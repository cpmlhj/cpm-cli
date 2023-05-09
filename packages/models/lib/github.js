const gitServer = require('./gitServer')
const gitHubRequest = require('./gitHubRequest')

class Github extends gitServer {
	constructor() {
		super('github')
	}

	setToken(token) {
		this.token = token
		this.gitRequest = new gitHubRequest(this.token)
	}

	async getUser() {
		return this.gitRequest?.get('/user')
	}

	getOrg(username) {
		return this.gitRequest?.get(`/user/orgs`, {
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

	createRepo(name) {
		return this.gitRequest
			?.post('/user/repos', {
				name
			})
			.then((response) => {
				return this.handleResponse(response)
			})
	}

	getRemote(login, name) {
		return `git@github.com:${login}/${name}.git`
	}

	getTokenHelp() {
		return 'https://github.com/settings/tokens'
	}

	getSSHkeyHelp() {
		return 'https://github.com/settings/keys'
	}

	createOrgRepo(org, name) {
		return this.gitRequest.post(
			`/orgs/${org}repos`,
			{
				name
			},
			{
				Accept: 'application/vnd.github.v3+json'
			}
		)
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

module.exports = Github
