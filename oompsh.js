const eventClients = []
const app = require('http').createServer(server)
const port = process.env.PORT || 3000 // Heroku sets $PORT
app.listen( port, () => console.log(`App is listening on port ${port}`) )


//// from www.html5rocks.com/en/tutorials/eventsource/basics/#toc-server-code
function server (req, res) {

    //// Deal with a version request.
    if ('/version' === req.url && 'GET' === req.method) {
        res.writeHead(200, {'Content-Type': 'text/plain'})
        res.end('Oompsh ' + require('./package.json').version + '\n')
    }

    //// Deal with a request to listen for SSEs.
    else if ('/events' === req.url && 'GET' === req.method) {
        if (req.headers.accept && 'text/event-stream' === req.headers.accept) {
            eventClients.push({ req, res })
            beginSSE(req, res)
        } else {
            res.writeHead(404, {'Content-Type': 'text/html'})
            res.end('Error: ‘accept’ header is not ‘text/event-stream’\n')
        }
    }

    //// Deal with a request for the example client page.
    else if ( ('/' === req.url || '/index.html' === req.url) && 'GET' === req.method) {
        res.writeHead(200, {'Content-Type': 'text/html'})
        res.end( require('fs').readFileSync(__dirname + '/index.html') )
    }

    //// Deal with a notification on the private channel.
    else if ('/notify' === req.url && 'POST' === req.method) {
        let data = []
        req.on( 'data', chunk => data.push(chunk) )
           .on( 'end', () => {
                data = Buffer.concat(data).toString()
                // console.log('@TODO deal with notify', data);
                res.writeHead(200, {'Content-Type': 'text/plain'})
                const tally = broadcast(data)
                res.end('Broadcast to ' + tally + ' event client(s)\n')
           })
    }

    //// Not found.
    else {
        res.writeHead(404, {'Content-Type': 'text/html'})
        res.end('Not found\n')
    }

}

function broadcast (payload) {
    let tally = 0
    eventClients.forEach( client => {
        sendSSE( client.res, 'broadcast', {
            time: (new Date()).toLocaleTimeString()
          , payload
        })
        tally++
    })
    return tally
}

function beginSSE (req, res) {
    res.writeHead(200, {
        'Content-Type':  'text/event-stream'
      , 'Cache-Control': 'no-cache'
      , 'Connection':    'keep-alive'
    })

    //// Send an SSE every eight seconds on a single connection.
    // setInterval(function() {
    //     sendSSE( res, id, { time:(new Date()).toLocaleTimeString(), payload } )
    // }, 8000)

    sendSSE( res, 'begin', {
        time: (new Date()).toLocaleTimeString()
      , payload: 'begun'
    })
}

function sendSSE(res, id, data) {
    res.write('id: ' + id + '\n')
    JSON.stringify(data, 2).split('\n').forEach(
        line => res.write('data: ' + line + '\n') )
    res.write('\n')
}
