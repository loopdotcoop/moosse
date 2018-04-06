let
    vvv = false // very very verbose logging
  , vv = vvv || true // very verbose logging (always true if `vvv` is true)
const
    first = '[a-zA-Z0-9!()_`~@\'"^]' // not allowed to start with . or -
  , other = '[a-zA-Z0-9!()_`~@\'"^.-]'
  , userpassRx = new RegExp(`^${first}${other}{0,64}:${first}${other}{0,64}$`)
  , eventClients = []
  , auths = getAuths()
  , app = require('http').createServer(server)
  , port = process.env.PORT || 3000 // Heroku sets $PORT
app.listen( port, () => console.log(`App is listening on port ${port}`) )


//// Serve the proper response.
function server (req, res) {
    if ('GET'  === req.method) return serveGET(req, res)
    if ('POST' === req.method) return servePOST(req, res)
    res.writeHead(405, {'Content-Type':'text/plain'})
    res.end('METHOD NOT ALLOWED: Use GET or POST\n')
}


//// Serve a GET request.
function serveGET (req, res) {

    //// A version request.
    if ('/version' === req.url ) {
        res.writeHead(200, {'Content-Type':'text/plain'})
        res.end('Oompsh ' + require('./package.json').version + '\n')
    }

    //// A request for the example client page.
    else if ('/' === req.url || '/index.html' === req.url) {
        res.writeHead(200, {'Content-Type': 'text/html'})
        res.end( require('fs').readFileSync(__dirname + '/index.html') )
    }

    //// A request to start listening for Server-Sent Events.
    else if ( '/events' === req.url.slice(0,7) ) {
        if (! req.headers.accept || 'text/event-stream' !== req.headers.accept) {
            res.writeHead(406, {'Content-Type':'text/plain'})
            res.end('NOT ACCEPTIBLE: ‘Accept’ header not ‘text/event-stream’\n')
        } else {
            res.oompshid = (Math.random()*1e16).toString(36)
            res.on('close', onSSEClientClose.bind(res) ) // bind client to `this`
            res.on('error', onSSEClientError.bind(res) ) // bind client to `this`
            eventClients.push(res)
            beginSSE(req, res)
        }
    }

    //// Not found.
    else {
        res.writeHead(404, {'Content-Type':'text/plain'})
        res.end('NOT FOUND: See documentation at http://oompsh.loop.coop/\n')
    }

}//serveGET()


//// Serve a POST request.
function servePOST (req, res) {
    const [ action, userpass ] = req.url.slice(1).split('/')

    //// Authenticate credentials.
    if (! userpassRx.test(userpass) ) {
        res.writeHead(401, {'Content-Type':'text/plain'})
        res.end('UNAUTHORIZED: ‘username:password’ fails ' + userpassRx + '\n')
    } else if (! auths[userpass] ) {
        res.writeHead(401, {'Content-Type':'text/plain'})
        res.end('UNAUTHORIZED: username:password combination not recognised\n')
    }

    //// A hard-disconnect instruction. @TODO hard-disconnect a specific clientID
    else if ('hard-disconnect' === action) {
        let tally = 0, clientRes
        while ( clientRes = eventClients.pop() ) {
            clientRes.end(': bye!') // SSE comments begin with a colon
            tally++
        }
        res.writeHead(201, {'Content-Type':'text/plain'})
        res.end("Hard-disconnected " + tally + ' event client(s)\n')
    }

    //// A disconnect instruction. @TODO disconnect a specific clientID
    else if ('disconnect' === action) {
        let tally = 0, clientRes
        while ( clientRes = eventClients.pop() ) {
            sendSSE(clientRes, 'id here', {
                time: (new Date()).toLocaleTimeString()
              , payload: 'admin sent a disconnect instruction'
          }, 'disconnect')
            tally++
        }
        res.writeHead(201, {'Content-Type':'text/plain'})
        res.end("Broadcast 'disconnect' to " + tally + ' event client(s)\n')
    }

    //// Deal with an admin notification.
    else if ('notify' === action) {
        let data = []
        req.on( 'data', chunk => data.push(chunk) )
           .on( 'end', () => {
                data = Buffer.concat(data).toString()
                res.writeHead(201, {'Content-Type':'text/plain'})
                const tally = broadcast(data)
                res.end('Broadcast to ' + tally + ' event client(s)\n')
           })
    }

    //// Not found.
    else {
        res.writeHead(404, {'Content-Type':'text/plain'})
        res.end('NOT FOUND: See documentation at http://oompsh.loop.coop/\n')
    }

}//servePOST()




//// EVENT HANDLERS

function onSSEClientClose () { const I='onSSEClientClose'
    eventClients.forEach( (res, i) => { if (this === res) {
        eventClients.splice(i, 1)
        vvok( I,`deleted ${res.oompshid} (index ${i})`)
        vvvok(I,`counted ${eventClients.length} eventClient(s) left:`)
        if (vvv) ok('  '+eventClients.map(res => res.oompshid).join('\n  ') )
    }})
}


function onSSEClientError () {
    console.log('onSSEClientError() oompshid ' + res.oompshid + ':', res);
}




//// UTILITY

function ok (msg) { console.log(msg) }
function vvok  (fnName, msg) { if (vv)  ok(new Date()+` ${fnName}()\n  `+msg) }
function vvvok (fnName, msg) { if (vvv) ok(new Date()+` ${fnName}()\n  `+msg) }
function oops (msg) { console.error(msg) }

function getAuths () {
    const auths = {}
    for (let i=0; i<10; i++) { // OOMPSH_AUTH0 to OOMPSH_AUTH9
        const auth = process.env['OOMPSH_AUTH'+i]
        if (! auth) continue
        //@TODO valid-looking user and pass?
        auths[auth] = 'from $OOMPSH_AUTH' + i
    }
    if (! Object.keys(auths).length)
        throw Error('Try $ export OOMPSH_AUTH0=my-user:my-pass')
    return auths
}

function broadcast (payload, eventName=null) {
    let tally = 0
    eventClients.forEach( res => {
        sendSSE( res, 'broadcast', {
            time: (new Date()).toLocaleTimeString()
          , payload
        }, eventName)
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

function sendSSE(res, id, data, eventName=null) {
    res.write('id: ' + id + '\n')
    if (vvv) console.log('id: ' + id)
    if (eventName) res.write('event: ' + eventName + '\n')
    if (eventName && vvv) console.log('event: ' + eventName)
    JSON.stringify(data, 2).split('\n').forEach(
        line => {
            res.write('data: ' + line + '\n')
            if (vvv) console.log('data: ' + line)
        })
    res.write('\n')
    if (vvv) console.log('')
}
