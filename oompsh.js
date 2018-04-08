//// oompsh.js //// 0.1.5 //// The Node.js server //////////////////////////////


//// Load the OOMPSH namespace, with configuration, API and utilities.
require('./oompsh-lib.js')
const OOMPSH = global.OOMPSH

//// Initialize mutable server state.
const STATE = {
    vvv: OOMPSH.vvv // very very verbose logging
  , vv:  OOMPSH.vv  // very verbose logging (always true if `vvv` is true)
  , sseClients: []
  , sseID: 0
}

//// Initialize immutable server state.
const
    adminCredentials = getAdminCredentials()
  , app = require('http').createServer(server)
  , port = process.env.PORT || 3000 // Heroku sets $PORT
app.listen( port, () => console.log(`App is listening on port ${port}`) )


//// Send a ‘heartbeat’ to all SSE clients, once every 10 seconds.
setInterval ( () => {
    STATE.sseClients.forEach( res => res.write(':tick\n') )
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
      , apiv   = /^v\d+$/.test(parts[0]) ? parts[0] : null // mandatory 1st
      , creds  = OOMPSH.valid.creds.test(parts[1]) ? parts[1] : null // optional 2nd
      , action = creds ? parts[2] : parts[1] // mandatory, 2nd or 3rd
      , target = creds ? parts[3] : parts[2] // optional, 3rd or 4th

    //// Make sure the request API version matches this script’s API version.
    if (apiv !== OOMPSH.APIV)
        return error(res, 501, 'Wrong API version')

    //// Deal with the request depending on its method.
    if ('OPTIONS' === req.method) return serveOPTIONS(req, res) //@TODO remove this, if it doesn’t help CORS
    if ('GET'     === req.method) return serveGET(req, res, creds, action, target)
    if ('POST'    === req.method) return servePOST(req, res, creds, action, target)
    error(res, 405, 'Use GET, POST or OPTIONS')
}


//// Serve a top-level file.
function serveFile (req, res) {

    //// A request for the example client page.
    if ('/' === req.url || '/index.html' === req.url) {
        res.writeHead(200, {'Content-Type': 'text/html'})
        res.end( require('fs').readFileSync(__dirname + '/index.html') )
    }

    //// A request for the Oompsh library JavaScript file.
    else if ('/oompsh-lib.js' === req.url) {
        res.writeHead(200, {'Content-Type': 'application/javascript'})
        res.end( require('fs').readFileSync(__dirname + '/oompsh-lib.js') )
    }

    //// Not found.
    else error(res, 404, 'See docs, http://oompsh.loop.coop/', 'text/plain')
}


//// Serve an OPTIONS request.
function serveOPTIONS (req, res) {
    ok(res, 200, "You're probably a CORS preflight", 'text/html')
}


//// Serve a GET request.
function serveGET (req, res, credentials, action, target) {

    //// Validate credentials if supplied (they’re optional for GET requests).
    if (credentials && ! OOMPSH.valid.creds.test(credentials) )
        error(res, 401, 'Invalid credentials')
    else if (credentials && ! adminCredentials[credentials] )
        error(res, 401, 'Credentials not recognised')

    //// A version request.
    else if ('version' === action)
        ok(res, 200, 'Oompsh ' + OOMPSH.VERSION)

    //// A request to start listening for Server-Sent Events.
    else if ('connect' === action) {
        if (! req.headers.accept || 'text/event-stream' !== req.headers.accept)
            return error(res, 406, "Missing 'Accept: text/event-stream' header")
        res.oompshid = (Math.random()*1e16).toString(36)
        res.isAdmin = !! credentials
        res.on('close', onSSEClientClose.bind(res) ) // bind client to `this`
        res.on('error', onSSEClientError.bind(res) ) // bind client to `this`
        STATE.sseClients.push(res)
        beginSSE(req, res)
    }

    //// Not found.
    else error(res, 404, 'See docs, http://oompsh.loop.coop/')

}//serveGET()


//// Serve a POST request.
function servePOST (req, res, credentials, action, target) {

    //// Authenticate credentials.
    if (! credentials) // all POST requests must have credentials
        error(res, 401, "Can't POST without credentials")
    else if (credentials && ! OOMPSH.valid.creds.test(credentials) )
        error(res, 401, 'Invalid credentials')
    else if (credentials && ! adminCredentials[credentials] )
        error(res, 401, 'Credentials not recognised')

    //// A hard-disconnect instruction. @TODO hard-disconnect a specific target
    else if ('hard-disconnect' === action) {
        let tally = { admin:0, enduser:0 }, sseRes
        while ( sseRes = STATE.sseClients.pop() ) {
            const usertype = sseRes.isAdmin ? 'admin' : 'enduser'
            sseRes.end(':bye ' + usertype) // SSE comments begin with a colon
            tally[usertype]++
        }
        ok(res, 201, 'Hard-disconnected '
          + tally.admin + ' admin(s), ' + tally.enduser + ' enduser(s)')
    }

    //// A soft-disconnect instruction. @TODO soft-disconnect a specific target
    else if ('soft-disconnect' === action) {
        let tally = { admin:0, enduser:0 }, sseRes
        while ( sseRes = STATE.sseClients.pop() ) {
            const usertype = sseRes.isAdmin ? 'admin' : 'enduser'
            sendSSE(sseRes, 'soft-disconnect', {
                time: (new Date()).toLocaleTimeString()
              , ok: 'admin sent a soft-disconnect instruction'
            })
            tally[usertype]++
        }
        ok(res, 201, "Broadcast 'soft-disconnect' to "
          + tally.admin + ' admin(s), ' + tally.enduser + ' enduser(s)')
    }

    //// Deal with a notification.
    else if ('notify' === action) {
        const raw = []
        req.on( 'data', chunk => raw.push(chunk) )
           .on( 'end', evt => notify(res, raw) )
    }

    //// Not found.
    else error(res, 404, 'See docs, http://oompsh.loop.coop/')

}//servePOST()




//// EVENT HANDLERS

function onSSEClientClose () { const I='onSSEClientClose'
    STATE.sseClients.forEach( (res, i) => { if (this === res) {
        STATE.sseClients.splice(i, 1)
        vvok( I,`deleted ${res.oompshid} (index ${i})`)
        vvvok(I,`counted ${STATE.sseClients.length} eventClient(s) left:`)
        if (vvv) ok('  '+STATE.sseClients.map(res => res.oompshid).join('\n  ') )
    }})
}


function onSSEClientError () {
    console.log('onSSEClientError() oompshid ' + res.oompshid + ':', res);
}




//// UTILITY


//// Sends a response after a succesful request. Usage:
//// ok(`res`, 200, 'That worked great!', 'text/plain'), which writes:
//// '{ "ok":"That worked great!" }'
function ok (res, status, remarks, contentType=null) {
    const headers = contentType ? { 'Content-Type': contentType } : {}
    remarks = remarks.replace(/"/g, '\\"')
    res.writeHead(status, headers)
    res.end(`{ "ok":"${remarks}" }\n`)
}


//// Sends a response after a request which failed. Usage:
//// error(`res`, 501, 'Wrong API version'), which writes:
//// '{ "error":"NOT IMPLEMENTED: Wrong API version" }'
function error (res, status, remarks, contentType=null) {
    const headers = contentType ? { 'Content-Type': contentType } : {}
    remarks = remarks.replace(/"/g, '\\"')
    res.writeHead(status, headers)
    res.end(`{ "error":"${OOMPSH.api.status[status]}: ${remarks}" }\n`)
}


////
function vvok  (fnName, msg) { if (vv)  console.log(new Date()+` ${fnName}()\n  `+msg) }
function vvvok (fnName, msg) { if (vvv) console.log(new Date()+` ${fnName}()\n  `+msg) }
function oops (msg) { console.error(msg) }

function getAdminCredentials () {
    const out = {}
    let errs = [], envCreds = process.env.OOMPSH_ADMIN_CREDENTIALS
    if (! envCreds)
        throw Error('Try `$ export OOMPSH_ADMIN_CREDENTIALS=jo:pw,sam:pass`')
    envCreds = envCreds.split(',')
    envCreds.forEach( (ec, i) => {
        if (! OOMPSH.valid.creds.test(ec) ) errs.push(i); else out[ec] = 1 } )
    if (errs.length)
        throw Error('Invalid OOMPSH_ADMIN_CREDENTIALS at index ' + errs)
    return out
}

function beginSSE (req, res) {
    res.writeHead(200, {
        'Content-Type':  'text/event-stream' // override JSON
      , 'Connection':    'keep-alive'
    }) // we already set 'Cache-Control: no-cache'
    sendSSE(res, null, { // `null` makes an event named 'message'
        time: (new Date()).toLocaleTimeString()
      , ok: 'SSE session has begun'
    })
}


function notify (res, raw) {
    // let data
    raw = Buffer.concat(raw).toString()
    try { var data = JSON.parse(raw) } catch (e) {}
    if ('object' !== typeof data || null == data.message)
        return error(res, 406, `Body should be '{ "message":"Hi!" }'`)
    const { admin, enduser } = broadcast(data.message)
    ok(res, 201, 'Notified '+ admin + ' admin(s), ' + enduser + ' enduser(s)')
}


function broadcast (payload, eventName=null) {
    const tally = { admin:0, enduser:0 }
    STATE.sseClients.forEach( res => {
        const usertype = res.isAdmin ? 'admin' : 'enduser'
        sendSSE(res, eventName, {
            time: (new Date()).toLocaleTimeString()
          , ok: payload
        })
        tally[usertype]++
    })
    return tally
}


function sendSSE (res, eventName=null, data) {
    res.write('id: ' + (OOMPSH.sseID++) + '\n')
    if (vvv) console.log('id: ' + OOMPSH.sseID)
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
