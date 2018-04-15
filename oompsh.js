//// oompsh.js //// 0.2.4 //// The Node.js server //////////////////////////////
!function(){

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
  , docsURL = OOMPSH.configuration.docsURL
  , runTests = require('./test.js')
  , app = require('http').createServer(server)
  , port = process.env.PORT || 3000 // Heroku sets $PORT

app.on('error', e => {
    console.error('Oompsh error: ' + e.message)
    clearInterval(heartbeat)
    app.close()
})

////
app.listen( port, () => console.log(`Oompsh is listening on port ${port}`) )

//// Send a ‘heartbeat’ to all SSE clients, once every 10 seconds.
const heartbeat = setInterval ( () => {
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

    //// All OPTIONS requests succeed. Anything else, except GET or POST, fails.
    if ('OPTIONS' === req.method) return serveOPTIONS(req, res)
    if ('GET' !== req.method && 'POST' !== req.method)
        return error(res, 9300, 405, 'Use GET, POST or OPTIONS')

    //// Parse the four standard parts of the URL.
    const
        parts  = req.url.slice(1,'/'===req.url.slice(-1)?-1:Infinity).split('/')
      , apiv   = OOMPSH.valid.apiv.test(parts[0])  ? parts[0] : null // mandatory 1st
      , creds  = 0 > (parts[1] || '').indexOf(':') ? null : parts[1] // 2nd
      , action = (creds ? parts[2] : parts[1]) || '' // 2nd (or 3rd if creds)
      , filter = (creds ? parts[3] : parts[2]) || '' // 3rd (or 4th if creds)

    //// Make sure the request API version matches this script’s API version.
    if (apiv !== OOMPSH.configuration.APIV)
        return error(res, 9200, 501, 'Wrong API version')

    //// Deal with the request depending on its method.
    if ('GET'  === req.method) return serveGET(req, res, creds, action, filter)
    if ('POST' === req.method) return servePOST(req, res, creds, action, filter)
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
    else error(res, 9100, 404, 'No such path, see docs, '+docsURL, 'text/plain')
}


//// Serve an OPTIONS request.
function serveOPTIONS (req, res) {
    ok(res, 6900, 200, "You're probably a CORS preflight", 'text/html')
}


//// Serve a GET request.
function serveGET (req, res, credentials, action, filter) {

    //// A GET request with valid credentials has access to the ‘admin’ GET
    //// actions, as well as the ‘enduser’ GET actions.
    if (credentials)
        if (! OOMPSH.valid.creds.test(credentials) )
            error(res, 9210, 401, 'Invalid credentials')
        else if (! adminCredentials[credentials] )
            error(res, 9211, 401, 'Credentials not recognised')
        else if (! OOMPSH.api.admin.GET[action] )
            error(res, 9230, 404, 'No such action, see docs, '+docsURL)
        else
            OOMPSH.action[action](req, res, credentials, action, filter)

    //// GET requests without credentials can only access ‘enduser’ GET actions.
    else
        if (! OOMPSH.api.enduser.GET[action] )
            error(res, 9231, 404, 'No such action, see docs, '+docsURL)
        else
            OOMPSH.action[action](req, res, credentials, action, filter)
}


//// Serve a POST request.
function servePOST (req, res, credentials, action, filter) {

    //// All POST requests must have valid credentials. Currently, Oompsh does
    //// not offer any POST actions to endusers.
    if (! credentials)
        error(res, 9222, 401, "Can't POST without credentials")
    else if (credentials && ! OOMPSH.valid.creds.test(credentials) )
        error(res, 9220, 401, 'Invalid credentials')
    else if (credentials && ! adminCredentials[credentials] )
        error(res, 9221, 401, 'Credentials not recognised')
    else if (! OOMPSH.api.admin.POST[action] )
        error(res, 9240, 404, 'No such action, see docs, '+docsURL)
    else
        OOMPSH.action[action](req, res, credentials, action, filter)
}




//// EVENT HANDLERS

//// Event handler codes 8000-8999
function initHandlers () {

    //// Broadcast a message to all admin SSE clients when the state changes.
    //// State-change codes 8100-8199
    HUB.on('state-change', info => {
        let data
        if ('begin' === info.type)
            data = { type:info.type, code:8100
              , ok: `Opened ${info.isAdmin ? 'admin' : 'enduser'} SSE session`
              , oompshID: info.oompshID
            }
        else if ('onSSEClientClose' === info.type)
            data = { type:info.type, code:8101
              , ok: `${info.isAdmin ? 'Admin' : 'Enduser'} SSE session closed`
              , oompshID: info.oompshID
            }
        else if ('hard-end' === info.type)
            data = { type:info.type, code:8102
              , ok: `An admin closed the SSE sessions of `
                  + info.tally.admin   + ' admin(s) and '
                  + info.tally.enduser + ' enduser(s)'
            }
        broadcast(data, 'admin')
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
        // OOMPSH.api includes the key/value `code:6000`
    }

    //// A version request.
  , 'version': (req, res, credentials, action, filter) =>
        ok(res, 6100, 200, 'Oompsh ' + OOMPSH.configuration.VERSION)


    //// Send a soft-end event.
  , 'soft-end': (req, res, credentials, action, filter) => {

        const tally = broadcast(
            { ok:'An admin POSTed a soft-end instruction', code:8010, type:'soft-end' }
          , filter, res, 'soft-end')

        //// Respond to the original request.
        if (tally)
            ok(res, 7000, 200, "Broadcast 'soft-end' to "
              + tally.admin + ' admin(s), ' + tally.enduser + ' enduser(s)')
    }


    //// Broadcast a notification.
  , 'notify': (req, res, credentials, action, filter) => {
        const raw = []
        req.on( 'data', chunk => raw.push(chunk) )
           .on( 'end', evt => notify(req, res, credentials, action, filter, raw) )
    }


    //// Runs the test-suite.
  , 'test': (req, res, credentials, action, filter) => {
        runTests( results => {
            ok(res, 7030, 200, 'Test results: ' + results )
        })
    }




    //// STATE-CHANGING ACTIONS


    //// A request to start listening for Server-Sent Events.
  , 'begin': (req, res, credentials, action, filter) => {

        //// Finish validating the request.
        if (! req.headers.accept || 'text/event-stream' !== req.headers.accept)
            return error(res, 9400, 406, "Missing 'Accept: text/event-stream' header")

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
          , code: 8000
          , ok: (res.isAdmin?'Admin':'Enduser') + ' SSE session is open'
        })

        //// Server state has changed so fire an event.
        HUB.fire('state-change', { type:action, beginAt, oompshID, isAdmin })
    }


    //// A hard-end instruction.
  , 'hard-end': (req, res, credentials, action, filter) => {

        //// Validate `filter` and define `usertypeFilter` and `oompshIDFilter`.
        const
            tally = { admin:0, enduser:0 }
          , match = filter.match(OOMPSH.valid.standardFilter) || []
          , oompshIDFilter = match[1]
          , usertypeFilter = match[2] && 'all' !== filter ? filter : false
        if (! match.length)
            return error(res, 9260, 406, "Filter not 'admin|enduser|all' or an oompshID")

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
                sseRes.end(':bye!\n') // SSE comments begin with a colon
                tally[usertype]++
            }
        })
        STATE.sseClients = newSseClients

        //// Respond to the original request.
        ok(res, 7010, 200, 'Hard-ended '
          + tally.admin + ' admin(s), ' + tally.enduser + ' enduser(s)')

        //// Server state is about to change so fire an event.
        HUB.fire('state-change', { type:action, tally })
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
//// ok(`res`, 99, 200, 'That worked great!', 'text/plain'), which writes:
//// '{ "ok":"That worked great!", "status":200, "code":99 }'
function ok (res, code, status, remarks, contentType=null) {
    const headers = contentType ? { 'Content-Type': contentType } : {}
    remarks = remarks.replace(/\\/g, '\\\\')
    remarks = remarks.replace(/"/g, '\\"')
    remarks = remarks.replace(/\n/g, '\\n')
    res.writeHead(status, headers)
    res.end(`{ "code":${code}, "ok":"${remarks}", "status":${status} }\n`)
    return true
}


//// Sends a response after a GET or POST request which failed. Usage:
//// error(`res`, 9200, 501, 'Wrong API version'), which writes:
//// '{ "error":"NOT IMPLEMENTED: Wrong API version", "status":501, "code":9200 }'
function error (res, code, status, remarks, contentType=null) {
    const headers = contentType ? { 'Content-Type': contentType } : {}
    remarks = remarks.replace(/\\/g, '\\\\')
    remarks = remarks.replace(/"/g, '\\"')
    remarks = remarks.replace(/\n/g, '\\n')
    res.writeHead(status, headers)
    res.end(`{ "code":${code}, "error":"${OOMPSH.api.status[status]}: `
      + `${remarks}", "status":${status} }\n`)
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
    if ('object' !== typeof data || null == data || null == data.message)
        return error(res, 9310, 406, `Body should be '{ "message":"Hi!" }'`)
    const tally = broadcast({
        code: 8030
      , ok: data.message
      , type: 'notify'
    }, filter, res)
    if (tally)
        ok(res, 7020, 200, 'Notified '+ tally.admin + ' admin(s), '
          + tally.enduser + ' enduser(s)')
}


function broadcast (data, filter, res, eventName) {

    //// Validate `filter` and define `usertypeFilter` and `oompshIDFilter`.
    const
        tally = { admin:0, enduser:0 }
      , match = filter.match(OOMPSH.valid.standardFilter) || []
      , oompshIDFilter = match[1]
      , usertypeFilter = match[2] && 'all' !== filter ? filter : false
// console.log(`"${filter}"`, `"${oompshIDFilter}"`, `"${usertypeFilter}"`);
    if (res && ! match.length) //@TODO error-check internal `broadcast()` calls
        return error(res, 9261, 406, "Filter not 'admin|enduser|all' or an oompshID")

    //// Send an event to any SSE clients which pass the filter.
    STATE.sseClients.forEach( sseRes => {
        const usertype = sseRes.isAdmin ? 'admin' : 'enduser'
        if (oompshIDFilter && oompshIDFilter !== sseRes.oompshID) return
        if (usertypeFilter && 0 > usertype.indexOf(usertypeFilter) ) return
        sendSSE(sseRes, eventName, data)
        tally[usertype]++
    })
    return tally
}


function sendSSE (res, eventName=null, data) {
    data.sentAt = data.sentAt || (new Date())*1 // unix timestamp in ms
    const sortedKeys = Object.keys(data).sort()
    const sortedData = {}
    sortedKeys.forEach( key => sortedData[key] = data[key] )
    res.write('id: ' + (STATE.sseID++) + '\n')
    if (eventName) res.write('event: ' + eventName + '\n')
    JSON.stringify(sortedData, 2).split('\n').forEach(
        line => {
            res.write('data: ' + line + '\n')
        })
    res.write('\n')
}




}()
