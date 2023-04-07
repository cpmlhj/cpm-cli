import path from 'path'
import fs from 'fs'
import {Plugin} from 'vite'

const root = path.resolve(__dirname)
const targetHtmlPath = path.resolve(root, './index.html')

const CpmCliSectionPlguin = function ():Plugin {
	return {
		name: 'pm:section-plugin',
		resolveId(id) {
			return id
		},
		config(config, env) {
			return {
				...config,
				server: {
					fs: {
						strict: false
					}
				},
				resolve: {
					alias: {
						'@section': `${process.cwd()}`
					}
				}
			}
		},
		transformIndexHtml(html) {
			const replaceHtml = fs.readFileSync(targetHtmlPath, 'utf-8')
			return {
				html: replaceHtml,
				tags: [
					{
						tag: 'script',
						attrs: {
							type: 'module',
							src: `/@fs/${path.resolve(__dirname)}/main.js`
						},
						injectTo: 'body'
					}
				]
			}
		}
	}
}

export default CpmCliSectionPlguin
