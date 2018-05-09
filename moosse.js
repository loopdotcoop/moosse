//// moosse.js //// 0.3.4 //// The Node.js server //////////////////////////////
!function(){

//// Load the MOOSSE namespace, with configuration, API and validators.
require('./moosse-config.js')
const MOOSSE = global.MOOSSE

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
  , { apiURL, validatorsURL } = MOOSSE.configuration
  , runTests = require('./test.js')
  , { ok:is, deepEqual:eq } = require('assert')
  , app = require('http').createServer(server)
  , port = process.env.PORT || 3000 // Heroku sets $PORT

app.on('error', e => {
    console.error('Moosse error: ' + e.message)
    clearInterval(heartbeat)
    app.close()
})

////
app.listen( port, () => console.log(`Moosse is listening on port ${port}`) )

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
      , apiv   = MOOSSE.valid.apiv.test(parts[0])  ? parts[0] : null // mandatory 1st
      , creds  = 0 > (parts[1] || '').indexOf(':') ? null : parts[1] // 2nd
      , action = (creds ? parts[2] : parts[1]) || '' // 2nd (or 3rd if creds)
      , filter = (creds ? parts[3] : parts[2]) || '' // 3rd (or 4th if creds)

    //// Make sure the request API version matches this script’s API version.
    if (apiv !== MOOSSE.configuration.APIV)
        return error(res, 9200, 501, 'Wrong API version')

    //// Deal with the request depending on its method.
    if ('GET'  === req.method) return serveGET(req, res, creds, action, filter)
    if ('POST' === req.method) return servePOST(req, res, creds, action, filter)
}


//// Serve a file.
function serveFile (req, res) {
    const { readFileSync, existsSync } = require('fs')

    //// A request for the example client page.
    if ('/' === req.url || '/index.html' === req.url) {
        res.writeHead(200, {'Content-Type': 'text/html'})
        res.end( readFileSync(__dirname + '/index.html') )
    }

    //// A request for the Moosse configuration JavaScript file.
    else if ('/moosse-config.js' === req.url) {
        res.writeHead(200, {'Content-Type': 'application/javascript'})
        res.end( readFileSync(__dirname + '/moosse-config.js') )
    }

    //// A request for a CSS file.
    else if ('.css' === req.url.slice(-4) && existsSync(__dirname + req.url) ) {
        res.writeHead(200, {'Content-Type': 'text/css'})
        res.end( readFileSync(__dirname + req.url) )
    }

    //// A request for an HTML file.
    else if ('.html' === req.url.slice(-5) && existsSync(__dirname + req.url) ) {
        res.writeHead(200, {'Content-Type': 'text/html'})
        res.end( readFileSync(__dirname + req.url) )
    }

    //// A request for an ICO file.
    else if ('.ico' === req.url.slice(-4) && existsSync(__dirname + req.url) ) {
        res.writeHead(200, {'Content-Type': 'image/x-icon'})
        res.end( readFileSync(__dirname + req.url) )
    }

    //// A request for a JSON file.
    else if ('.json' === req.url.slice(-5) && existsSync(__dirname + req.url) ) {
        res.writeHead(200, {'Content-Type': 'application/json'})
        res.end( readFileSync(__dirname + req.url) )
    }

    //// A request for a PNG file.
    else if ('.png' === req.url.slice(-4) && existsSync(__dirname + req.url) ) {
        res.writeHead(200, {'Content-Type': 'image/png'})
        res.end( readFileSync(__dirname + req.url) )
    }

    //// A request for an SVG file.
    else if ('.svg' === req.url.slice(-4) && existsSync(__dirname + req.url) ) {
        res.writeHead(200, {'Content-Type': 'image/svg+xml'})
        res.end( readFileSync(__dirname + req.url) )
    }

    //// A request for a font file.
    else if ('.woff2' === req.url.slice(-6) && existsSync(__dirname + req.url) ) {
        res.writeHead(200, {'Content-Type': 'font/woff2'})
        res.end( readFileSync(__dirname + req.url) )
    }

    //// A request for an XML file.
    else if ('.xml' === req.url.slice(-4) && existsSync(__dirname + req.url) ) {
        res.writeHead(200, {'Content-Type': 'application/xml'})
        res.end( readFileSync(__dirname + req.url) )
    }

    //// Not found.
    else error(res, 9100, 404, 'No such path, see docs, '+apiURL, 'text/plain')
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
        if (! MOOSSE.valid.creds.test(credentials) )
            error(res, 9210, 401, 'Invalid credentials')
        else if (! adminCredentials[credentials] )
            error(res, 9211, 401, 'Credentials not recognised')
        else if (! MOOSSE.api.admin.GET[action] )
            error(res, 9230, 404, 'No such action, see docs, '+apiURL)
        else
            MOOSSE.action[action](req, res, credentials, action, filter)

    //// GET requests without credentials can only access ‘enduser’ GET actions.
    else
        if (! MOOSSE.api.enduser.GET[action] )
            error(res, 9231, 404, 'No such action, see docs, '+apiURL)
        else
            MOOSSE.action[action](req, res, credentials, action, filter)
}


//// Serve a POST request.
function servePOST (req, res, credentials, action, filter) {

    //// All POST requests must have valid credentials. Currently, Moosse does
    //// not offer any POST actions to endusers.
    if (! credentials)
        error(res, 9222, 401, "Can't POST without credentials")
    else if (credentials && ! MOOSSE.valid.creds.test(credentials) )
        error(res, 9220, 401, 'Invalid credentials')
    else if (credentials && ! adminCredentials[credentials] )
        error(res, 9221, 401, 'Credentials not recognised')
    else if (! MOOSSE.api.admin.POST[action] )
        error(res, 9240, 404, 'No such action, see docs, '+apiURL)
    else
        MOOSSE.action[action](req, res, credentials, action, filter)
}




//// EVENT HANDLERS

//// Event handler codes 8000-8999
function initHandlers () {

    //// Broadcast a message to all admin SSE clients when the state changes.
    //// State-change codes 8500-8499
    HUB.on('state-change', info => {
        let data
        if ('begin' === info.type)
            data = { type:info.type, code:8500
              , ok: `An ${info.usertype} SSE session opened`
              , moosseID: info.moosseID
            }
        else if ('onSSEClientClose' === info.type)
            data = { type:info.type, code:8510
              , ok: `An ${info.usertype} SSE session closed`
              , moosseID: info.moosseID
            }
        else if ('hard-end' === info.type)
            data = { type:info.type, code:8520
              , ok: `An admin closed the SSE sessions of `
                  + info.tally.admin   + ' admin(s) and '
                  + info.tally.enduser + ' enduser(s)'
            }
        broadcast(data, 'admin', null, 'log')
    })

}


function onSSEClientClose () { const I='onSSEClientClose'
    STATE.sseClients.forEach( (res, i) => { if (this === res) {
        STATE.sseClients.splice(i, 1)

        //// Server state has changed so fire an event. This may be logged
        //// to a server file, and sent to admin SSE clients.
        const { moosseID, usertype } = res
        HUB.fire('state-change', { type:'onSSEClientClose', moosseID, usertype })
    }})
}


function onSSEClientError () {
    console.error('onSSEClientError() moosseID ' + res.moosseID + ':', res);
}




//// Add server actions to the Moosse namespace.
MOOSSE.action = {




    //// STATE-PRESERVING ACTIONS

    //// Retrieves a description of the API.
    '': (req, res, credentials, action, filter) => {
        res.writeHead(200)
        res.end( JSON.stringify(MOOSSE.api, null, 2) + `\n` )
        // MOOSSE.api includes the key/value `code:6000`
    }


    //// Shows the app’s name and version.
  , 'version': (req, res, credentials, action, filter) =>
        ok(res, 6100, 200, 'Moosse ' + MOOSSE.configuration.VERSION)


    //// Asks SSE clients to close.
  , 'soft-end': (req, res, credentials, action, filter) => {

        const tally = broadcast(
            { ok:'An admin POSTed a soft-end instruction', code:8010, type:'soft-end' }
          , filter, res, 'end')

        //// Respond to the original request.
        if (tally)
            ok(res, 7010, 200, "Broadcast 'soft-end' to "
              + tally.admin + ' admin(s), ' + tally.enduser + ' enduser(s)')
    }


    //// Sends a message to SSE clients.
  , 'notify': (req, res, credentials, action, filter) => {
        parseBody(req, res).then( data => {
            try { compare(data, MOOSSE.valid.notifyBody) } catch (e) {
                return error(res, 9530, 406, `Invalid body, see notifyBody, `
                  + validatorsURL) }
            const tally = broadcast({ code:8030, ok:data.message, type:'notify'}
              , filter, res)
            if (tally) ok(res, 7030, 200, 'Notified '+ tally.admin
              + ' admin(s), ' + tally.enduser + ' enduser(s)')
        }).catch( err => {} )
    }


    //// Tells endusers an item was created.
  , 'add': (req, res, credentials, action, filter) => {
        parseBody(req, res).then( data => {
            try { compare(data, MOOSSE.valid.addBody) } catch (e) {
                return error(res, 9540, 406, `Invalid body, see addBody, `
                  + validatorsURL) }
            const tally = broadcast({
                    code: 8040
                  , diff: data
                  , ok: `New '${filter}' was created`
                  , type: 'add' }
              , filter, res, 'bread', 'bread')
            if (tally) // `tally` is false if `broadcast()` sent an `error()`
                ok(res, 7040, 200, `'add' sent to ${tally.enduser} '${filter}' enduser(s)`)
        }).catch( err => {} )
    }


    //// Tells endusers an item was modified.
  , 'edit': (req, res, credentials, action, filter) => {
        parseBody(req, res).then( data => {
            try { compare(data, MOOSSE.valid.editBody) } catch (e) {
                return error(res, 9550, 406, `Invalid body, see editBody, `
                  + validatorsURL) }
            const tally = broadcast({
                    code: 8050
                  , diff: data
                  , ok: `A '${filter}' was modified`
                  , type: 'edit' }
              , filter, res, 'bread', 'bread')
            if (tally) // `tally` is false if `broadcast()` sent an `error()`
                ok(res, 7050, 200, `'edit' sent to ${tally.enduser} '${filter}' enduser(s)`)
        }).catch( err => {} )
    }


    //// Tells endusers an item was removed.
  , 'delete': (req, res, credentials, action, filter) => {
        parseBody(req, res).then( data => {
            try { compare(data, MOOSSE.valid.deleteBody) } catch (e) {
                return error(res, 9560, 406, `Invalid body, see deleteBody, `
                  + validatorsURL) }
            const tally = broadcast({
                    code: 8060
                  , diff: data
                  , ok: `A '${filter}' was removed`
                  , type: 'delete' }
              , filter, res, 'bread', 'bread')
            if (tally) // `tally` is false if `broadcast()` sent an `error()`
                ok(res, 7060, 200, `'delete' sent to ${tally.enduser} '${filter}' enduser(s)`)
        }).catch( err => {} )
    }


    //// Runs the test-suite.
  , 'test': (req, res, credentials, action, filter) => {
        runTests( results => {
            ok(res, 7990, 200, 'Test results: ' + results )
        })
    }




    //// STATE-CHANGING ACTIONS


    //// A request to start listening for Server-Sent Events.
  , 'begin': (req, res, credentials, action, filter) => {

        //// Finish validating the request.
        if (! req.headers.accept || 'text/event-stream' !== req.headers.accept)
            return error(res, 9400, 406, "Missing 'Accept: text/event-stream' header")
        //@TODO validate `filter`

        //// Store the response in `sseClients`, and add meta and listeners.
        STATE.sseClients.push(res)

        //// Add meta.
        const beginAt  = res.beginAt = (new Date())*1 // unix timestamp in ms
        res.filter = filter // post-types for an enduser, log-types for an admin
        const group = res.group = 'all' // useful for `MOOSSE.valid.filter.standard`
        const moosseID = res.moosseID = ~~(Math.random()*10) // 0-9
          + (Math.random().toString(36).slice(2,8)+'xxxx').slice(0,6) // a-z0-9
        const usertype = res.usertype = credentials ? 'admin' : 'enduser'

        //// Add listeners
        res.on('close', onSSEClientClose.bind(res) ) // bind client to `this`
        res.on('error', onSSEClientError.bind(res) ) // bind client to `this`

        //// Add special SSE headers, and send the first event.
        res.writeHead(200, { // 'Cache-Control: no-cache' already set
            'Content-Type':  'text/event-stream' // override JSON
          , 'Connection':    'keep-alive'
        })
        sendSSE(res, null, { // `null` makes an event named 'message'
            beginAt, filter, group, moosseID, usertype
          , code: 8000
          , ok: ucFirst(usertype) + ' SSE session is open'
        })

        //// Server state has changed so fire an event.
        HUB.fire('state-change', { type:action, beginAt, moosseID, usertype })
    }


    //// A hard-end instruction.
  , 'hard-end': (req, res, credentials, action, filter) => {
        const
            tally = { admin:0, enduser:0 }
          , filterFn = filterFactory(res, 'standard', filter)
        if (! filterFn) return // invalid `filter`, `filterFactory()` sent error

        //// Warn SSE clients shortly before disconnecting them.
        broadcast(
            { ok:'An admin POSTed a hard-end instruction', code:8020, type:'hard-end' }
          , filter, res, 'end')

        //// End the SSE session of any SSE clients which pass the filter, and
        //// remove them from the `sseClients` array.
        const newSseClients = []
        STATE.sseClients.forEach( sseRes => {
            if ( filterFn(sseRes) ) {
                sseRes.end()
                tally[sseRes.usertype]++
            } else {
                newSseClients.push(sseRes)
            }
        })
        STATE.sseClients = newSseClients

        //// Respond to the original request.
        ok(res, 7020, 200, 'Hard-ended '
          + tally.admin + ' admin(s), ' + tally.enduser + ' enduser(s)')

        //// Server state has changed so fire an event.
        HUB.fire('state-change', { type:action, tally })
    }

}//MOOSSE.action

{ //// Ensure consistency between MOOSSE.action and MOOSSE.api.
    const a = MOOSSE.api.admin, e = MOOSSE.api.enduser, keys = Object.keys
        , l = keys(a.GET).concat(keys(a.POST), keys(e.GET), keys(e.POST))
    for (let key of l)
        if (! MOOSSE.action[key]) throw Error(`Missing MOOSSE.action.${key}()`)
    for (let key in MOOSSE.action)
        if (! l.includes(key)) throw Error(`Unreachable MOOSSE.action.${key}()`)
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
    res.end(`{ "code":${code}, "error":"${MOOSSE.api.status[status]}: `
      + `${remarks}", "status":${status} }\n`)
    return false
}


////
function getAdminCredentials () {
    const out = {}
    let errs = [], envCreds = process.env.MOOSSE_ADMIN_CREDENTIALS
    if (! envCreds)
        throw Error('Try `$ export MOOSSE_ADMIN_CREDENTIALS=jo:pw,sam:pass`')
    envCreds = envCreds.split(',')
    envCreds.forEach( (ec, i) => {
        if (! MOOSSE.valid.creds.test(ec) ) errs.push(i); else out[ec] = 1 } )
    if (errs.length)
        throw Error('Invalid MOOSSE_ADMIN_CREDENTIALS at index ' + errs)
    return out
}


function broadcast (data, filter, res, eventName, filterValidatorName='standard') {
    const
        tally = { admin:0, enduser:0 }
      , filterFn = filterFactory(res, filterValidatorName, filter)
    if (! filterFn) return // invalid `filter`, `filterFactory()` sent error

    //// Send an event to any SSE clients which pass the filter.
    STATE.sseClients.forEach( sseRes => {
        if ( filterFn(sseRes) ) {
            sendSSE(sseRes, eventName, data)
            tally[sseRes.usertype]++
        }
    })
    return tally
}

// 8626864962
function sendSSE (res, eventName=null, data) {
    data.sentAt = data.sentAt || (new Date())*1 // unix timestamp in ms
    const sortedKeys = Object.keys(data).sort()
    const sortedData = {}
    sortedKeys.forEach( key => sortedData[key] = data[key] )
    res.write('id: ' + (STATE.sseID++) + '\n')
    if (eventName) res.write('event: ' + eventName + '\n')
    JSON.stringify(sortedData, null, 2).split('\n').forEach(
        line => {
            res.write('data: ' + line + '\n')
        })
    res.write('\n')
}


//// Validates `filter` and returns a function to accept or reject SSE clients.
function filterFactory (
    res // Node HTTP `response` object, lets `filterFactory()` send an `error()`
  , validatorName // eg 'standard' for `MOOSSE.valid.filter.standard`
  , filter // the `filter` string, from the last part of the request path
) {
    //// Deal with the special 'bread' case. @TODO can this be not a special case?
    if ('bread' === validatorName)
        return client => {
            if (null == client.filter) return false // client has no `filter` meta
            let accept = false
            client.filter.split(',').forEach( clientFilter => {
                if (filter === clientFilter)
                    return accept = true
            })
            return accept
        }

    ////
    const
        filterObj = {} // used by `filterFn()` to accept or reject SSE clients
      , validator = MOOSSE.valid.filter[validatorName] // { key1: /[abc]/, key2: /[def]/ }
    Object.keys(validator).forEach( key => {
        const rx = validator[key] // rx = /[abc]/
        if ( rx.test(filter) ) // if `filter` contains 'a', 'b' or 'c'...
            filterObj[key] = filter // ...`filterFn()` will reject clients...
    }) // ... with no `key1` property, or whose `key1` does not equal `filter`
    if ( res && 0 === Object.keys(filterObj).length )
        return error(res, 9260, 406, `Invalid filter, see filter.${validatorName}, `
          + validatorsURL)
    return client => {
        let accept = true
        Object.keys(filterObj).forEach( key => {
            if (null == client[key]) return accept = false // client has no `key1`
            if (filterObj[key] !== client[key]) // test client’s `key1`
                return accept = false // any filter which fails rejects the client
        })
        return accept
    }
}


////
function parseBody (req, res) {
    return new Promise( (resolve, reject) => {
        const raw = []
        req.on( 'data', chunk => raw.push(chunk) )
           .on( 'end', evt => {
                try {
                    var body = JSON.parse( Buffer.concat(raw).toString() )
                } catch (e) {
                    error(res, 9320, 406, 'Unparseable body')
                    return reject('Unparseable body')
                }
                if (null !== body && 'object' === typeof body)
                    return resolve(body)
                error(res, 9330, 406, 'Non-object body')
                reject('Non-object body')
            })
    })
}


////
function compare (actual, model) {
    if ('object' !== typeof actual)
        throw Error('`moosse.js:compare()` was passed '
          + (typeof actual) + ' to `actual`')
    const actualKeys = Object.keys(actual).sort()
    const modelKeys = Object.keys(model).sort()
    eq(actualKeys, modelKeys, 'Mismatch between `actual` and `model` keys')
    modelKeys.forEach( modelKey => {
        const actualVal = actual[modelKey]
        const modelVal = model[modelKey]
        if ( 'function' === typeof modelVal.test) // eg a RegExp
            is(modelVal.test(actualVal), `Invalid \`model\` key '${modelKey}'`)
        else
            eq(modelVal, actualVal, `Different \`model\` key '${modelKey}'`)
    })
}


////
function ucFirst (str) {
    return str[0].toUpperCase() + str.slice(1)
}

}()
