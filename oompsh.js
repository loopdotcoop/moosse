//// oompsh.js //// 0.2.0 //// The Node.js server //////////////////////////////


//// Load the OOMPSH namespace, with configuration, API and validators.
require('./oompsh-config.js')
const OOMPSH = global.OOMPSH

//// Initialize the server’s event hub and initialize standard handlers.
const HUB = {
    es: {} // events, where each value is an array of functions
  , on: (e, fn) => (HUB.es[e] = HUB.es[e] || []).push(fn)
  , fire: (e, info) => (HUB.es[e] = HUB.es[e] || []).forEach( fn => fn(info) )
}
initHandlers()

//// Initialize mutable server state.
const STATE = {
    sseClients: []
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




//// SERVE

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

    //// All OPTIONS requests succeed.
    if ('OPTIONS' === req.method) return serveOPTIONS(req, res) //@TODO remove this, if it doesn’t help CORS

    //// Parse the four standard parts of the URL.
    const
        parts  = req.url.slice(1,'/'===req.url.slice(-1)?-1:Infinity).split('/')
      , apiv   = OOMPSH.valid.apiv.test(parts[0])  ? parts[0] : null // mandatory 1st
      , creds  = OOMPSH.valid.creds.test(parts[1]) ? parts[1] : null // 2nd
      , action = (creds ? parts[2] : parts[1]) || '' // 2nd (or 3rd if creds)
      , filter = (creds ? parts[3] : parts[2]) || '' // 3rd (or 4th if creds)

    //// Make sure the request API version matches this script’s API version.
    if (apiv !== OOMPSH.configuration.APIV)
        return error(res, 501, 'Wrong API version')

    //// Deal with the request depending on its method.
    if ('GET'  === req.method) return serveGET(req, res, creds, action, filter)
    if ('POST' === req.method) return servePOST(req, res, creds, action, filter)
    error(res, 405, 'Use GET, POST or OPTIONS')
}


//// Serve a file.
function serveFile (req, res) {

    //// A request for the example client page.
    if ('/' === req.url || '/index.html' === req.url) {
        res.writeHead(200, {'Content-Type': 'text/html'})
        res.end( require('fs').readFileSync(__dirname + '/index.html') )
    }

    //// A request for the Oompsh configuration JavaScript file.
    else if ('/oompsh-config.js' === req.url) {
        res.writeHead(200, {'Content-Type': 'application/javascript'})
        res.end( require('fs').readFileSync(__dirname + '/oompsh-config.js') )
    }

    //// Not found.
    else error(res, 404, 'See docs, '+OOMPSH.configuration.docsURL, 'text/plain')
}


//// Serve an OPTIONS request.
function serveOPTIONS (req, res) {
    ok(res, 200, "You're probably a CORS preflight", 'text/html')
}


//// Serve a GET request.
function serveGET (req, res, credentials, action, filter) {

    //// A GET request with valid credentials has access to the ‘admin’ GET
    //// actions, as well as the ‘enduser’ GET actions.
    if (credentials)
        if (! OOMPSH.valid.creds.test(credentials) )
            error(res, 401, 'Invalid credentials')
        else if (! adminCredentials[credentials] )
            error(res, 401, 'Credentials not recognised')
        else if (! OOMPSH.api.admin.GET[action] )
            error(res, 404, 'See docs, '+OOMPSH.configuration.docsURL)
        else
            OOMPSH.action[action](req, res, credentials, action, filter)

    //// GET requests without credentials can only access ‘enduser’ GET actions.
    else
        if (! OOMPSH.api.enduser.GET[action] )
            error(res, 404, 'See docs, '+OOMPSH.configuration.docsURL)
        else
            OOMPSH.action[action](req, res, credentials, action, filter)
}


//// Serve a POST request.
function servePOST (req, res, credentials, action, filter) {

    //// All POST requests must have valid credentials. Currently, Oompsh does
    //// not offer any POST actions to endusers.
    if (! credentials)
        error(res, 401, "Can't POST without credentials")
    else if (credentials && ! OOMPSH.valid.creds.test(credentials) )
        error(res, 401, 'Invalid credentials')
    else if (credentials && ! adminCredentials[credentials] )
        error(res, 401, 'Credentials not recognised')
    else if (! OOMPSH.api.admin.POST[action] )
        error(res, 404, 'See docs, '+OOMPSH.configuration.docsURL)
    else
        OOMPSH.action[action](req, res, credentials, action, filter)
}




//// EVENT HANDLERS

function initHandlers () {

    //// Broadcast a message to all admin SSE clients when the state changes.
    HUB.on('state-change', info => {
        let message
        if ('begin' === info.type)
            message = 'Opened ' + (info.isAdmin ? 'admin' : 'enduser')
              + ` SSE session, oompshID ${info.oompshID}`
        else if ('hard-end' === info.type)
            message = `Admin ${info.enderID} closed the SSE sessions of `
              + info.tally.admin   + ' admin(s) and '
              + info.tally.enduser + ' enduser(s)'
        else if ('onSSEClientClose' === info.type)
            message = (info.isAdmin ? 'Admin' : 'Enduser')
              + ` ${info.oompshID}'s SSE session closed`
        broadcast(message, 'admin')
    })

}


function onSSEClientClose () { const I='onSSEClientClose'
    STATE.sseClients.forEach( (res, i) => { if (this === res) {
        STATE.sseClients.splice(i, 1)

        //// Server state has changed so fire an event. This may be logged
        //// to a server file, and sent to admin SSE clients.
        const { oompshID, isAdmin } = res
        HUB.fire('state-change', { type:'onSSEClientClose', oompshID, isAdmin })
    }})
}


function onSSEClientError () {
    console.error('onSSEClientError() oompshID ' + res.oompshID + ':', res);
}




//// Add server actions to the Oompsh namespace.
OOMPSH.action = {




    //// STATE-PRESERVING ACTIONS

    //// Returns the API as a JSON object.
    '': (req, res, credentials, action, filter) => {
        res.writeHead(200)
        res.end( JSON.stringify(OOMPSH.api, null, 2) + `\n` )
    }

    //// A version request.
  , 'version': (req, res, credentials, action, filter) =>
        ok(res, 200, 'Oompsh ' + OOMPSH.configuration.VERSION)


    //// Send a soft-end event.
  , 'soft-end': (req, res, credentials, action, filter) => {

        const tally = broadcast('An admin POSTed a soft-end instruction'
          , filter, res, 'soft-end')

        //// Respond to the original request.
        if (tally)
            ok(res, 200, "Broadcast 'soft-end' to "
              + tally.admin + ' admin(s), ' + tally.enduser + ' enduser(s)')
    }


    //// Broadcast a notification.
  , 'notify': (req, res, credentials, action, filter) => {
        const raw = []
        req.on( 'data', chunk => raw.push(chunk) )
           .on( 'end', evt => notify(req, res, credentials, action, filter, raw) )
    }




    //// STATE-CHANGING ACTIONS


    //// A request to start listening for Server-Sent Events.
  , 'begin': (req, res, credentials, action, filter) => {

        //// Finish validating the request.
        if (! req.headers.accept || 'text/event-stream' !== req.headers.accept)
            return error(res, 406, "Missing 'Accept: text/event-stream' header")

        //// Store the response in `sseClients`, and add meta and listeners.
        STATE.sseClients.push(res)
        const beginAt  = res.oompshID = (new Date())*1 // unix timestamp in ms
        const oompshID = res.oompshID = ~~(Math.random()*10) // 0-9
          + (Math.random().toString(36).slice(2,8)+'xxxx').slice(0,6) // a-z0-9
        const isAdmin  = res.isAdmin = !! credentials
        res.on('close', onSSEClientClose.bind(res) ) // bind client to `this`
        res.on('error', onSSEClientError.bind(res) ) // bind client to `this`

        //// Add special SSE headers, and send the first event.
        res.writeHead(200, { // 'Cache-Control: no-cache' already set
            'Content-Type':  'text/event-stream' // override JSON
          , 'Connection':    'keep-alive'
        })
        sendSSE(res, null, { // `null` makes an event named 'message'
            beginAt, oompshID, isAdmin
          , ok: (res.isAdmin?'Admin':'Enduser') + ' SSE session is open'
        })

        //// Server state has changed so fire an event.
        HUB.fire('state-change', { type:action, beginAt, oompshID, isAdmin })
    }


    //// A hard-end instruction. @TODO hard-end a specific SSE client
  , 'hard-end': (req, res, credentials, action, filter) => {

        //// Validate `filter` and define `usertypeFilter` and `oompshIDFilter`.
        const
            tally = { admin:0, enduser:0 }
          , match = filter.match(OOMPSH.valid.standardFilter) || []
          , oompshIDFilter = match[1]
          , usertypeFilter = match[2] && 'all' !== filter ? filter : false
        if (! match.length)
            return error(res, 406, 'Filter fails '+OOMPSH.valid.standardFilter)

        //// End the SSE session of any SSE clients which pass the filter, and
        //// remove them from the `sseClients` array.
        const newSseClients = []
        STATE.sseClients.forEach( sseRes => {
            const usertype = sseRes.isAdmin ? 'admin' : 'enduser'
            if (
                (oompshIDFilter && oompshIDFilter !== sseRes.oompshID)
             || (usertypeFilter && 0 > usertype.indexOf(usertypeFilter) )
            ) {
                newSseClients.push(sseRes)
            } else {
                sseRes.end(':bye!') // SSE comments begin with a colon
                tally[usertype]++
            }
        })
        STATE.sseClients = newSseClients

        //// Respond to the original request.
        ok(res, 200, 'Hard-ended '
          + tally.admin + ' admin(s), ' + tally.enduser + ' enduser(s)')

        //// Server state has changed so fire an event.
        HUB.fire('state-change', { action, tally, enderID:res.oompshID })
    }

}//OOMPSH.action

{ //// Ensure consistency between OOMPSH.action and OOMPSH.api.
    const a = OOMPSH.api.admin, e = OOMPSH.api.enduser, keys = Object.keys
        , l = keys(a.GET).concat(keys(a.POST), keys(e.GET), keys(e.POST))
    for (let key of l)
        if (! OOMPSH.action[key]) throw Error(`Missing OOMPSH.action.${key}()`)
    for (let key in OOMPSH.action)
        if (! l.includes(key)) throw Error(`Unreachable OOMPSH.action.${key}()`)
}




//// UTILITY


//// Sends a response after a successful GET or POST request. Usage:
//// ok(`res`, 200, 'That worked great!', 'text/plain'), which writes:
//// '{ "ok":"That worked great!" }'
function ok (res, status, remarks, contentType=null) {
    const headers = contentType ? { 'Content-Type': contentType } : {}
    remarks = remarks.replace(/\\/g, '\\\\')
    remarks = remarks.replace(/"/g, '\\"')
    res.writeHead(status, headers)
    res.end(`{ "ok":"${remarks}" }\n`)
    return true
}


//// Sends a response after a GET or POST request which failed. Usage:
//// error(`res`, 501, 'Wrong API version'), which writes:
//// '{ "error":"NOT IMPLEMENTED: Wrong API version" }'
function error (res, status, remarks, contentType=null) {
    const headers = contentType ? { 'Content-Type': contentType } : {}
    remarks = remarks.replace(/\\/g, '\\\\')
    remarks = remarks.replace(/"/g, '\\"')
    res.writeHead(status, headers)
    res.end(`{ "error":"${OOMPSH.api.status[status]}: ${remarks}" }\n`)
    return false
}


////
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


function notify (req, res, credentials, action, filter, raw) {
    raw = Buffer.concat(raw).toString()
    try { var data = JSON.parse(raw) } catch (e) {}
    if ('object' !== typeof data || null == data.message)
        return error(res, 406, `Body should be '{ "message":"Hi!" }'`)
    const tally = broadcast(data.message, filter, res)
    if (tally)
        ok(res, 200, 'Notified '+ tally.admin + ' admin(s), '
          + tally.enduser + ' enduser(s)')
}


function broadcast (payload, filter, res, eventName) {

    //// Validate `filter` and define `usertypeFilter` and `oompshIDFilter`.
    const
        tally = { admin:0, enduser:0 }
      , match = filter.match(OOMPSH.valid.standardFilter) || []
      , oompshIDFilter = match[1]
      , usertypeFilter = match[2] && 'all' !== filter ? filter : false
// console.log(`"${filter}"`, `"${oompshIDFilter}"`, `"${usertypeFilter}"`);
    if (res && ! match.length) //@TODO error-check internal `broadcast()` calls
        return error(res, 406, 'Filter fails '+OOMPSH.valid.standardFilter)

    //// Send an event to any SSE clients which pass the filter.
    STATE.sseClients.forEach( sseRes => {
        const usertype = sseRes.isAdmin ? 'admin' : 'enduser'
        if (oompshIDFilter && oompshIDFilter !== sseRes.oompshID) return
        if (usertypeFilter && 0 > usertype.indexOf(usertypeFilter) ) return
        sendSSE(sseRes, eventName, {
            time: (new Date()).toLocaleTimeString()
          , ok: payload
        })
        tally[usertype]++
    })
    return tally
}


function sendSSE (res, eventName=null, data) {
    res.write('id: ' + (OOMPSH.sseID++) + '\n')
    if (eventName) res.write('event: ' + eventName + '\n')
    JSON.stringify(data, 2).split('\n').forEach(
        line => {
            res.write('data: ' + line + '\n')
        })
    res.write('\n')
}
