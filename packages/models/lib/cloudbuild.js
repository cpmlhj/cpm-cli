const socketio = require('socket.io-client')
const { logger } = require('@cpm-cli/utils')
const TIME_OUT = 5 * 60 * 1000
const WS_SERVER = 'http://devops.socketIo.com:7001'
const CLIENT_CONNECT_OUT = 5 * 1000

function parseSocketMsg(data) {
	const {
		action,
		payload: { message }
	} = data
	return {
		action,
		message
	}
}

class CloudBuild {
	constructor(props) {
		const { config, git } = props
		this.buildCmd = config.cmd
		this.timout = TIME_OUT
		this.git = git
		this.io = null
		this.timer = null
	}

	init() {
		return new Promise((resolve, reject) => {
			const socket = socketio(`${WS_SERVER}/events`, {
				query: {
					repo: this.git.remote,
					name: this.git.name,
					branch: this.git.branch,
					version: this.git.version,
					buildCmd: this.buildCmd
				}
			})
			this.io = socket
			socket.on('connect', () => {
				clearTimeout(this.timer)
				socket.emit(
					'events_connect',
					{ a: 1, b: 2, c: 3 },
					(response) => {
						const { action, message } = parseSocketMsg(
							response.data
						)
						logger.success(action, message)
						resolve()
					}
				)
			})
			socket.on('disconnect', () => {
				logger.info('云构建服务链接已断开')
			})
			socket.on('error', (err) => {
				logger.error('error', '云构建出错', err)
				this.disConnectSocket()
				reject()
			})
			this.timer = setTimeout(() => {
				logger.error(`${WS_SERVER} ---- io链接超时`)
				this.disConnectSocket()
			}, CLIENT_CONNECT_OUT)
		})
	}

	build() {
		return new Promise((resolve, reject) => {
			this.io.emit('build_flow', (response) => {
				console.log(response, '000')
			})
			this.io.emit('building', (response) => {})
			this.disConnectSocket()
		})
	}
	disConnectSocket() {
		clearTimeout(this.timer)
		this.io.disconnect()
		this.io.close()
	}
}
module.exports = CloudBuild
