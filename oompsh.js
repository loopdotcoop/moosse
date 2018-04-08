let
    vvv = false // very very verbose logging
  , vv = vvv || true // very verbose logging (always true if `vvv` is true)
const
    VERSION = '0.1.4' // the major part of this is also the API version, `apiv`
  , APIV = 'v' + VERSION.split('.')[0]
  , first = '[a-zA-Z0-9!()_`~@\'"^]' // not allowed to start with . or -
  , other = '[a-zA-Z0-9!()_`~@\'"^.-]'
  , credentialsRx = new RegExp(`^${first}${other}{0,64}:${first}${other}{0,64}$`)
  , eventClients = []
  , adminCredentials = getAdminCredentials()
  , app = require('http').createServer(server)
  , port = process.env.PORT || 3000 // Heroku sets $PORT
app.listen( port, () => console.log(`App is listening on port ${port}`) )


//// Send a ‘heartbeat’ to all SSE clients, once every 10 seconds.
setInterval ( () => {
    eventClients.forEach( res => res.write(':tick\n') )
}, 10000)


//// Serve the proper response.
function server (req, res) {

    //// Any GET request to a URL not beginning '/v123/' is a static file.
    if ('GET' === req.method && ! /^\/v\d+\/|^\/v\d+$/.test(req.url) )
        return serveFile(req, res)

    //// Set default headers. Note that 'Content-Type' will be overridden for
    //// an SSE connection or an OPTIONS request.
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-cache') // anything might change any time
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept') //@TODO cull this list to the minimum

    //// Parse the four standard parts of the URL.
    const
        parts  = req.url.slice(1,'/'===req.url.slice(-1)?-1:Infinity).split('/')
      , apiv   = /^v\d+$/.test(parts[0])      ? parts[0] : null // mandatory 1st
      , creds  = credentialsRx.test(parts[1]) ? parts[1] : null // optional 2nd
      , action = creds ? parts[2] : parts[1] // mandatory, 2nd or 3rd
      , target = creds ? parts[3] : parts[2] // optional, 3rd or 4th
    //// Make sure the request API version matches this script’s API version.
    if (apiv !== APIV) {
        res.writeHead(501)
        return res.end('{ "error":"NOT IMPLEMENTED: Wrong API version" }\n')
    }

    //// Deal with the request depending on its method.
    if ('OPTIONS' === req.method) return serveOPTIONS(req, res, creds, action, target) //@TODO remove this, if it doesn’t help CORS
    if ('GET'     === req.method) return     serveGET(req, res, creds, action, target)
    if ('POST'    === req.method) return    servePOST(req, res, creds, action, target)
    res.writeHead(405)
    res.end('{ "error":"METHOD NOT ALLOWED: Use GET or POST" }\n')
}


//// Serve a top-level file.
function serveFile (req, res) {

    //// A request for the example client page.
    if ('/' === req.url || '/index.html' === req.url) {
        res.writeHead(200, {'Content-Type': 'text/html'})
        res.end( require('fs').readFileSync(__dirname + '/index.html') )
    }

    //// Not found.
    else {
        res.writeHead(404, {'Content-Type': 'text/plain'})
        res.end('NOT FOUND: See docs, http://oompsh.loop.coop/\n')
    }

}

//// Serve an OPTIONS request.
function serveOPTIONS (req, res, credentials, action, target) {
    res.writeHead(200, {'Content-Type': 'text/html'})
    res.end('You’re probably a CORS preflight\n')
}

//// Serve a GET request.
function serveGET (req, res, credentials, action, target) {

    //// A version request.
    if ('version' === action) {
        res.writeHead(200)
        res.end('{ "ok":"Oompsh ' + VERSION + '" }\n')
    }

    //// A request to start listening for Server-Sent Events.
    else if ('connect' === action) {
        if (! req.headers.accept || 'text/event-stream' !== req.headers.accept) {
            res.writeHead(406)
            res.end('{ "error":"NOT ACCEPTIBLE: Needs ‘Accept: text/event-stream’" }\n')
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
        res.writeHead(404)
        res.end('{ "error":"NOT FOUND: See docs, http://oompsh.loop.coop/" }\n')
    }

}//serveGET()


//// Serve a POST request.
function servePOST (req, res, credentials, action, target) {

    //// Authenticate credentials.
    if (! credentials) {
        res.writeHead(401)
        res.end('{ "error":"UNAUTHORIZED: Needs username:password" }\n')
    } else if (! credentialsRx.test(credentials) ) {
        res.writeHead(401)
        res.end('{ "error":"UNAUTHORIZED: Invalid username:password" }\n')
    } else if (! adminCredentials[credentials] ) {
        res.writeHead(401)
        res.end('{ "error":"UNAUTHORIZED: Unrecognised username:password" }\n')
    }

    //// A hard-disconnect instruction. @TODO hard-disconnect a specific clientID
    else if ('hard-disconnect' === action) {
        let tally = 0, clientRes
        while ( clientRes = eventClients.pop() ) {
            clientRes.end(': bye!') // SSE comments begin with a colon
            tally++
        }
        res.writeHead(201)
        res.write('{ "ok":"Hard-disconnected ' + tally + ' enduser(s)" }\n')
    }

    //// A disconnect instruction. @TODO disconnect a specific clientID
    else if ('disconnect' === action) {
        let tally = 0, clientRes
        while ( clientRes = eventClients.pop() ) {
            sendSSE(clientRes, 'id here', {
                time: (new Date()).toLocaleTimeString()
              , ok: 'admin sent a disconnect instruction'
          }, 'disconnect')
            tally++
        }
        res.writeHead(201)
        res.write('{ "ok":"Broadcast ‘disconnect’ to '+tally+' enduser(s)" }\n')
    }

    //// Deal with an admin notification.
    else if ('notify' === action) {
        let data = []
        req.on( 'data', chunk => data.push(chunk) )
           .on( 'end', () => {
                data = Buffer.concat(data).toString()
                data = JSON.parse(data) //@TODO deal with malformed JSON
                const tally = broadcast(data.message)
                res.writeHead(201)
                res.end('{ "ok":"Broadcast to ' + tally + ' enduser(s)" }\n')
           })
    }

    //// Not found.
    else {
        res.writeHead(404)
        res.end('{ "error":"NOT FOUND: See docs, http://oompsh.loop.coop/" }\n')
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

function getAdminCredentials () {
    const out = {}
    let errs = [], envCreds = process.env.OOMPSH_ADMIN_CREDENTIALS
    if (! envCreds)
        throw Error('Try `$ export OOMPSH_ADMIN_CREDENTIALS=jo:pw,sam:pass`')
    envCreds = envCreds.split(',')
    envCreds.forEach( (ec, i) => {
        if (! credentialsRx.test(ec) ) errs.push(i); else out[ec] = 1 } )
    if (errs.length)
        throw Error('Invalid OOMPSH_ADMIN_CREDENTIALS at index ' + errs)
    return out
}

function beginSSE (req, res) {
    res.writeHead(200, {
        'Content-Type':  'text/event-stream' // override JSON
      , 'Connection':    'keep-alive'
    }) // we already set 'Cache-Control: no-cache'

    //// Send an SSE every eight seconds on a single connection.
    // setInterval(function() {
    //     sendSSE( res, id, { time:(new Date()).toLocaleTimeString(), payload } )
    // }, 8000)

    sendSSE( res, 'begin', {
        time: (new Date()).toLocaleTimeString()
      , ok: 'SSE session has begun'
    })
}


function broadcast (payload, eventName=null) {
    let tally = 0
    eventClients.forEach( res => {
        sendSSE( res, 'broadcast', {
            time: (new Date()).toLocaleTimeString()
          , ok: payload
        }, eventName)
        tally++
    })
    return tally
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
