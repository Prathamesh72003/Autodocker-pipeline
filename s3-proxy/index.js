const express = require('express')
const httpProxy = require('http-proxy')
require('dotenv').config()

const app = express()
const PORT = 8000
const BASE_ADDRESS = 'https://autodocker.s3.ap-south-1.amazonaws.com/__outputs/'

const proxy = httpProxy.createProxy();

app.use((req,res) => {
    const subdomain = req.hostname.split('.')[0]

    const resolveTo = `${BASE_ADDRESS}/${subdomain}`

    proxy.web(req,res, {target: resolveTo, changeOrigin: true})
})

proxy.on('proxyReq', (proxyReq, req, res) => {
    const url = req.url

    if (url == '/') {
        proxyReq.path += 'index.html'
    }
})

app.listen(PORT, () => {
    console.log("Reverse Proxy Server Running on port " + PORT);
})