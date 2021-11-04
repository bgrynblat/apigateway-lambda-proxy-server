const express = require('express')
const axios = require('axios')
const bodyParser = require('body-parser')

const app = express()
const port = process.env.PORT || 3030

const lambdaProtocol = process.env.LAMBDA_PROTOCOL || 'http'
const lambdaPort = process.env.LAMBDA_PORT || '9000'
const lambdaHost = process.env.LAMBDA_HOST || 'localhost'
const lambdaEndpoint = process.env.LAMBDA_ENDPOINT || "/2015-03-31/functions/function/invocations"

const lambdaProxy = process.env.LAMBDA_PROXY || `${lambdaProtocol}://${lambdaHost}${lambdaPort.length ? `:${lambdaPort}` : ""}${lambdaEndpoint}`

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

const server = app.listen(port, () => {
  console.log(`Listening on port ${port} lambda:${lambdaProxy}`)
})


process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

let connections = [];

server.on('connection', connection => {
    connections.push(connection);
    connection.on('close', () => connections = connections.filter(curr => curr !== connection));
});

function shutDown() {
    console.log('Received kill signal, shutting down gracefully');
    server.close(() => {
        console.log('Closed out remaining connections');
        process.exit(0);
    });

    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);

    connections.forEach(curr => curr.end());
    setTimeout(() => connections.forEach(curr => curr.destroy()), 5000);
}