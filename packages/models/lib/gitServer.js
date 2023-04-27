function error(methodName) {
	throw new Error(`${methodName} must be implemented`)
}

class gitServer {
	constructor(serverType, token) {
		this.serverType = serverType
		this.token = token
	}

	setToken() {
		error('setToken')
	}

	createRepo() {
		error('createRepo')
	}

	createOrgRepo() {
		error('createOrgRepo')
	}

	getRepo(login, name) {
		error('getRepo')
	}

	getRemote() {
		error('getRemote')
	}

	getOrg() {
		error('getOrg')
	}

	getUser() {
		error('getUser')
	}

	getTokenHelp() {
		error('getTokenHelp')
	}

	getSSHkeyHelp() {
		error('getSSHkeyHelp')
	}
}

module.exports = gitServer
