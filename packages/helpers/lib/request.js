'use strict'

const axios = require('axios')
const BASE_URL = process.env.CPM_CLI_BASE_DIR || 'http://127.0.0.1:7001'
const request = axios.create({
    baseURL: BASE_URL,
    timeout: 6000
})

request.interceptors.response.use(
        response => {
            if(response.status === 200)
                return response.data
        },
        error => Promise.reject(error)
)

module.exports = request