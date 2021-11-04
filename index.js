const express = require('express')
const axios = require('axios')
const bodyParser = require('body-parser')

const app = express()
const port = process.env.PORT || 3030
const lambdaProxy = process.env.LAMBDA_PROXY || 'http://localhost:9000/2015-03-31/functions/function/invocations'

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.all('*', (req, res) => {

  // #   resource: '/',
  // #   path: '/',
  // #   httpMethod: 'GET',
  // #   headers: null,
  // #   multiValueHeaders: null,
  // #   queryStringParameters: { w: '20', h: '10' },
  // #   multiValueQueryStringParameters: { w: [ '20' ], h: [ '10' ] },
  // #   headers: {...}
  // #   body: {...}
  // # }

  const request = {
    method: 'POST',
    url: lambdaProxy,
    data: {
      httpMethod: req.method,
      resource: req.path,
      path: req.path,
      headers: req.headers,
      queryStringParameters: req.query,
      body: req.body
    }
  }

  axios(request)
  .then(response => {
    const {statusCode, body, headers} = response.data
    if(headers) {
      Object.keys(headers).forEach(key => {
        res.set(key, headers[key])
      })
    }
    res.status(statusCode)
    res.send(body)
  })
  .catch(error => {
    res.status(500).send(error.message)
  })
})

app.listen(port, () => {
  console.log(`Listening on port ${port} lambda:${lambdaProxy}`)
})