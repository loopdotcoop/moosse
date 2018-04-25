//// config-builder.js //// 0.3.2 //// Converts README.md to *-config.js ///////

!function(){

//// Validate the environment. Should have called:
//// `$ node test.js` ...for standalone mode, or:
//// `$ node moosse.js` ...to fulfil ‘/v0/usr:pwd/test’ requests
if ('object' !== typeof module) return console.error(`Must run in Node.js`)

//// Export a function which runs the tests, useful if NOT standalone mode.
module.exports = (cb) => {
    callback = cb
    currTest = 0
    capturedDescs = {}
    if (tests[currTest]) tests[currTest++](currTest); else finish()
}

//// Load the MOOSSE namespace, with configuration, API and validators.
require('./moosse-config.js')

////
let callback
  , currTest = 0
  , capturedDescs = {}

const

    //// Determine whether ‘test.js’ has been called directly (we’ll need to
    //// spawn a server), or included by a running ‘moosse.js’ server (and
    //// used to fulfil a ‘/v0/usr:pwd/test’ request).
    standaloneMode = '/test.js' === process.argv[1].slice(-8)

/*
  , resEndDelay = // fulfilling a ‘/v0/o:k/test’ request on a remote server
        process.env.PORT && standaloneMode ? 100 // ...needs to run slower
      : 30 // ...than `$ node test.js` running on a local dev machine
*/

    ////
  , MOOSSE = global.MOOSSE
  , VERSION = require('./package.json').version
  , creds = Object.keys( getAdminCredentials() )[0]
  , { apiURL, validatorsURL } = MOOSSE.configuration

    //// Import library functionality.
  , { spawn } = require('child_process')
  , { request } = require('http')
  , { ok, deepEqual } = require('assert')
  , is = (value, desc) => {
        captureDesc(desc); ok(value, desc) }
  , eq = (actual, expected, desc) => {
        captureDesc(desc); deepEqual(actual, expected, desc) }

    //// Start an Moosse server (standalone mode only).
  , server = standaloneMode ? spawn('node', ['moosse.js']) : {
        port: process.env.PORT || 3000 // Heroku sets $PORT
      , on: (evt, fn) => {
            //...
        }
      , stderr: { on: (evt, fn) => {
            //...
        } }
      , stdout: { on: (evt, fn) => {
            //...
        } }
      , kill: () => {}
    }

    //// Initialise an array to hold test-failures, and define the tests.
  , fails = []
  , tests = [




        //// 9000-9999: Errors.


        //// 9000-9099: Moosse startup errors.
        //// @TODO


        //// 9100-9199: Errors serving a file.

        //// No such file.
        ct => test_plain_GET('/no-such-path!', j => eq(j, // ct=currentTest
        `{ "code":9100, "error":"NOT FOUND: No such path, see docs, ${
        apiURL}", "status":404 }\n`
        , ct+`. GET '/no-such-path!' should error (404/9100)`) )


        //// 9200-9299: URL-format errors.

        //// Wrong API version
      , ct => test_JSON('GET', '/v123', j => eq(j, // j=json
        { error: 'NOT IMPLEMENTED: Wrong API version'
        , status:501, code:9200 }
        , ct+`. GET '/v123' should error (501/9200)`) )
      , ct => test_JSON('POST', '/v9999/', j => eq(j, // with slash
        { error: 'NOT IMPLEMENTED: Wrong API version'
        , status:501, code:9200 }
        , ct+`. GET '/v9999' should error (501/9200)`) )

        //// GET credentials errors.
      , ct => test_JSON('GET', `/v0/-invalid:creds`, j => eq(j,
        { error: 'UNAUTHORIZED: Invalid credentials'
        , status:401, code:9210 }
        , ct+`. GET '/v0/-invalid:creds' should error (401/9210)`) )
      , ct => test_JSON('GET', `/v0/username:`, j => eq(j,
        { error: 'UNAUTHORIZED: Invalid credentials'
        , status:401, code:9210 }
        , ct+`. GET '/v0/username:' should error (401/9210)`) )
      , ct => test_JSON('GET', `/v0/:password`, j => eq(j,
        { error: 'UNAUTHORIZED: Invalid credentials'
        , status:401, code:9210 }
        , ct+`. GET '/v0/:password' should error (401/9210)`) )
      , ct => test_JSON('GET', `/v0/:`, j => eq(j,
        { error: 'UNAUTHORIZED: Invalid credentials'
        , status:401, code:9210 }
        , ct+`. GET '/v0/:' should error (401/9210)`) )
      , ct => test_JSON('GET', `/v0/no-such:creds`, j => eq(j,
        { error: 'UNAUTHORIZED: Credentials not recognised'
        , status:401, code:9211 }
        , ct+`. GET '/v0/no-such:creds' should error (401/9211)`) )

        //// POST credentials errors.
      , ct => test_JSON('POST', `/v0/invalid:-creds`, j => eq(j,
        { error: 'UNAUTHORIZED: Invalid credentials'
        , status:401, code:9220 }
        , ct+`. POST '/v0/invalid:-creds' should error (401/9220)`) )
      , ct => test_JSON('POST', `/v0/no-such:creds`, j => eq(j,
        { error: 'UNAUTHORIZED: Credentials not recognised'
        , status:401, code:9221 }
        , ct+`. POST '/v0/no-such:creds' should error (401/9221)`) )
      , ct => test_JSON('POST', `/v0/notify`, j => eq(j,
        { error: "UNAUTHORIZED: Can't POST without credentials"
        , status:401, code:9222 }
        , ct+`. POST '/v0/notify' should error (401/9222)`) )

        //// GET invalid action.
      , ct => test_JSON('GET', `/v0/${creds}/no-such-action!`, j => eq(j,
        { error: 'NOT FOUND: No such action, see docs, ' + apiURL
        , status:404, code:9230 }
        , ct+`. GET '/v0/<creds>/no-such-action!' should error (404/9230)`) )
      , ct => test_JSON('GET', `/v0/no-such-action!`, j => eq(j,
        { error: 'NOT FOUND: No such action, see docs, ' + apiURL
        , status:404, code:9231 }
        , ct+`. GET '/v0/no-such-action!' should error (404/9231)`) )

        //// POST invalid action.
      , ct => test_JSON('POST', `/v0/${creds}/no-such-action!`, j => eq(j,
        { error: 'NOT FOUND: No such action, see docs, ' + apiURL
        , status:404, code:9240 }
        , ct+`. POST '/v0/<creds>/no-such-action!' should error (404/9240)`) )

        //// GET invalid filter.
        ////@TODO 9250

        //// POST invalid filter.
      , ct => test_JSON('POST', `/v0/${creds}/hard-end/nope!`, j => eq(j,
        { error: 'NOT ACCEPTABLE: Invalid filter, see filter.standard, ' + validatorsURL
        , status:406, code:9260 }
        , ct+`. POST '/v0/<creds>/hard-end/nope!' should error (406/9260)`) )
      , ct => test_JSON('POST', `/v0/${creds}/soft-end/nope!`, j => eq(j,
        { error: 'NOT ACCEPTABLE: Invalid filter, see filter.standard, ' + validatorsURL
        , status:406, code:9260 }
        , ct+`. POST '/v0/<creds>/soft-end/nope!' should error (406/9260)`) )
        //@TODO 'notify' filter tests
        //@TODO 'add' filter tests
        //@TODO 'edit' filter tests
        //@TODO 'delete' filter tests


        //// 9300-9399: General header and body errors.

        //// Wrong method.
      , ct => test_JSON('DELETE', `/`, j => eq(j,
        { error: 'METHOD NOT ALLOWED: Use GET, POST or OPTIONS'
        , status:405, code:9300 }
        , ct+`. DELETE '/' should error (405/9300)`) )
      , ct => test_JSON('PUT', `/v0`, j => eq(j,
        { error: 'METHOD NOT ALLOWED: Use GET, POST or OPTIONS'
        , status:405, code:9300 }
        , ct+`. PUT '/v0' should error (405/9300)`) )

        ////@TODO header errors

        //// General invalid POST body.
      , ct => test_JSON('POST', `/v0/${creds}/notify/all`
        , 'Nope!', j => eq(j,
        { error: 'NOT ACCEPTABLE: Unparseable body'
        , status:406, code:9320 }
        , ct+`. POST '/v0/<creds>/notify/all' with body 'Nope!' should error (406/9320)`) )
      , ct => test_JSON('POST', `/v0/${creds}/notify/all`
        , '{ message:"Truncated JSON obje', j => eq(j,
        { error: 'NOT ACCEPTABLE: Unparseable body'
        , status:406, code:9320 }
        , ct+`. POST '/v0/<creds>/notify/all' with truncated body should error (406/9320)`) )
      , ct => test_JSON('POST', `/v0/${creds}/notify/all`
        , '"Also no!"', j => eq(j,
        { error: 'NOT ACCEPTABLE: Non-object body'
        , status:406, code:9330 }
        , ct+`. POST '/v0/<creds>/notify/all' with body '"Also no!"' should error (406/9330)`) )
      , ct => test_JSON('POST', `/v0/${creds}/notify/all`
        , 'null', j => eq(j, // nb, `null` has typeof 'object' in JavaScript
        { error: 'NOT ACCEPTABLE: Non-object body'
        , status:406, code:9330 }
        , ct+`. POST '/v0/<creds>/notify/all' with body 'null' should error (406/9330)`) )


        //// 9400-9499: SSE session errors.

        //// 'begin' SSE session errors.
      , ct => test_JSON('GET', '/v0/begin', j => eq(j,
        { error: "NOT ACCEPTABLE: Missing 'Accept: text/event-stream' header"
        , status:406, code:9400 }
        , ct+`. GET '/v0/begin' without proper Accept header should error (406/9400)`) )


        //// 9500-9999: Errors specific to actions.

        //// Invalid 'notify' POST body.
      , ct => test_JSON('POST', `/v0/${creds}/notify/all`
        , { }, j => eq(j,
        { error: `NOT ACCEPTABLE: Invalid body, see notifyBody, ` + validatorsURL
        , status:406, code:9530 }
        , ct+`. POST '/v0/<creds>/notify/all' with empty object body should error (406/9530)`) )
      , ct => test_JSON('POST', `/v0/${creds}/notify/all`
        , { shouldbemessage:"This ain't right" }, j => eq(j,
        { error: `NOT ACCEPTABLE: Invalid body, see notifyBody, ` + validatorsURL
        , status:406, code:9530 }
        , ct+`. POST '/v0/<creds>/notify/all' with incorrect keys should error (406/9530)`) )
      , ct => test_JSON('POST', `/v0/${creds}/notify/all`
        , { message:"This is ok...", but:"Not this!" }, j => eq(j,
        { error: `NOT ACCEPTABLE: Invalid body, see notifyBody, ` + validatorsURL
        , status:406, code:9530 }
        , ct+`. POST '/v0/<creds>/notify/all' with extra key should error (406/9530)`) )
      , ct => test_JSON('POST', `/v0/${creds}/notify/all`
        , { message:'' }, j => eq(j,
        { error: `NOT ACCEPTABLE: Invalid body, see notifyBody, ` + validatorsURL
        , status:406, code:9530 }
        , ct+`. POST '/v0/<creds>/notify/all' with message '' should error (406/9530)`) )
      , ct => test_JSON('POST', `/v0/${creds}/notify/all`
        , { message:'x'.repeat(MOOSSE.configuration.maxMessageLength + 1) }, j => eq(j,
        { error: `NOT ACCEPTABLE: Invalid body, see notifyBody, ` + validatorsURL
        , status:406, code:9530 }
        , ct+`. POST '/v0/<creds>/notify/all' with too-long message should error (406/9530)`) )

        //// Invalid 'add' POST body.
      , ct => test_JSON('POST', `/v0/${creds}/add/foo-bar`
        , { }, j => eq(j,
        { error: `NOT ACCEPTABLE: Invalid body, see addBody, ` + validatorsURL
        , status:406, code:9540 }
        , ct+`. POST '/v0/<creds>/add/foo-bar' with empty object body should error (406/9540)`) )
        //@TODO more 'add' POST body tests, following 'notify'

        //// Invalid 'edit' POST body.
      , ct => test_JSON('POST', `/v0/${creds}/edit/foo-bar`
        , { }, j => eq(j,
        { error: `NOT ACCEPTABLE: Invalid body, see editBody, ` + validatorsURL
        , status:406, code:9550 }
        , ct+`. POST '/v0/<creds>/edit/foo-bar' with empty object body should error (406/9550)`) )
        //@TODO more 'edit' POST body tests, following 'notify'

        //// Invalid 'delete' POST body.
      , ct => test_JSON('POST', `/v0/${creds}/delete/foo-bar`
        , { id:123, title:"Title not allowed in 'delete' POST body" }, j => eq(j,
        { error: `NOT ACCEPTABLE: Invalid body, see deleteBody, ` + validatorsURL
        , status:406, code:9560 }
        , ct+`. POST '/v0/<creds>/delete/foo-bar' with empty object body should error (406/9560)`) )
        //@TODO more 'delete' POST body tests, following 'notify'




        //// No codes: File.

        //// Homepage.
      , ct => test_plain_GET('/', d => is(
        0 < d.indexOf('<title>Moosse ' + VERSION)
        , ct+`. GET '/' should retrieve the homepage`) )
      , ct => test_plain_GET('/index.html', d => is(
        0 < d.indexOf('<title>Moosse ' + VERSION)
        , ct+`. GET '/index.html' should retrieve the homepage`) )

        //// Moosse Config.
      , ct => test_plain_GET('/moosse-config.js', d => is(
        0 < d.indexOf('moosse-config.js //// ' + VERSION)
        , ct+`. GET '/moosse-config.js' should retrieve Moosse config`) )




        //// 6000-8999: Ok.


        //// 6000-6999: GET and OPTIONS.


        //// 6000-6099: API, configuration etc.
      , ct => test_JSON('GET', '/v0', j => eq(j,
        MOOSSE.api // code 6000
        , ct+`. GET '/v0' should retrieve the Moosse API (200/6000)`) )

        //// 6100-6199: Version.
      , ct => test_JSON('GET', '/v0/version', j => eq(j,
        { ok: 'Moosse ' + VERSION, status:200, code:6100 }
        , ct+`. GET '/v0/version' should retrieve the Moosse version (200/6100)`) )
      , ct => test_JSON('GET', `/v0/${creds}/version`, j => eq(j,
        { ok: 'Moosse ' + VERSION, status:200, code:6100 }
        , ct+`. GET '/v0/<creds>/version' should retrieve the Moosse version (200/6100)`) )

        //// 6200-6899: @TODO

        //// 6900-6999: OPTIONS (always responds ok).
      , ct => test_JSON('OPTIONS', '/', j => eq(j,
        { ok:"You're probably a CORS preflight", status:200, code:6900 }
        , ct+`. OPTIONS '/' should just be ok (200/6900)`) )
      , ct => test_JSON('OPTIONS', '/v0', j => eq(j,
        { ok:"You're probably a CORS preflight", status:200, code:6900 }
        , ct+`. OPTIONS '/v0' should just be ok (200/6900)`) )
      , ct => test_JSON('OPTIONS', '/anything-in-here', j => eq(j,
        { ok:"You're probably a CORS preflight", status:200, code:6900 }
        , ct+`. OPTIONS '/anything-in-here' should just be ok (200/6900)`) )


        //// 7000-7999: POST.

        //// 7010: Soft-End.
      , ct => test_JSON('POST', `/v0/${creds}/soft-end/admin`, j => compare(j,
        { ok: /Broadcast 'soft-end' to \d+ admin\(s\), \d+ enduser\(s\)/
        , status:200, code:7010 }
        , ct+`. POST '/v0/<creds>/soft-end/admin' should respond ok (200/7010)`) )

        //// 7020: Hard-End.
      , ct => test_JSON('POST', `/v0/${creds}/hard-end/all`, j => compare(j,
        { ok: /Hard-ended \d+ admin\(s\), \d+ enduser\(s\)/
        , status:200, code:7020 }
        , ct+`. POST '/v0/<creds>/hard-end/all' should respond ok (200/7020)`) )

        //// 7030: Notify.
      , ct => test_JSON('POST', `/v0/${creds}/notify/enduser`,
        { message:'x'.repeat(MOOSSE.configuration.maxMessageLength) }, j => compare(j,
        { ok: /Notified \d+ admin\(s\), \d+ enduser\(s\)/
        , status:200, code:7030 }
        , ct+`. POST '/v0/<creds>/notify/enduser' should respond ok (200/7030)`) )
      , ct => test_JSON('POST', `/v0/${creds}/notify/enduser`,
        '   {\n"message":\n  "Another test message"\n }  ', j => compare(j,
        { ok: /Notified \d+ admin\(s\), \d+ enduser\(s\)/
        , status:200, code:7030 }
        , ct+`. POST '/v0/<creds>/notify/enduser' (multiline JSON) should work (200/7030)`) )

        //// 7040: Add.
      , ct => test_JSON('POST', `/v0/${creds}/add/_foo-cpt--2_4`,
        { id:123, title:'x'.repeat(MOOSSE.configuration.maxTitleLength) }, j => compare(j,
        { ok: /'add' sent to \d+ '_foo-cpt--2_4' enduser\(s\)/
        , status:200, code:7040 }
        , ct+`. POST '/v0/<creds>/add/_foo-cpt--2_4' should respond ok (200/7040)`) )

        //// 7050: Edit.
      , ct => test_JSON('POST', `/v0/${creds}/edit/_foo-cpt--2_4`,
        { id:123, title:'x'.repeat(MOOSSE.configuration.maxTitleLength) }, j => compare(j,
        { ok: /'edit' sent to \d+ '_foo-cpt--2_4' enduser\(s\)/
        , status:200, code:7050 }
        , ct+`. POST '/v0/<creds>/edit/_foo-cpt--2_4' should respond ok (200/7050)`) )

        //// 7050: Delete.
      , ct => test_JSON('POST', `/v0/${creds}/delete/_foo-cpt--2_4`,
        { id:123 }, j => compare(j,
        { ok: /'delete' sent to \d+ '_foo-cpt--2_4' enduser\(s\)/
        , status:200, code:7060 }
        , ct+`. POST '/v0/<creds>/delete/_foo-cpt--2_4' should respond ok (200/7060)`) )

        //// 7990: Test.
        //// To prevent infinite recursion, don’t test test :-)


        //// 8000-8999: Enduser SSE.

        //// 8000: Enduser basically works.
      , ct => test_SSE(0, '/v0/begin', [], j => ok( // j=json
          null != j[0] && null != j[0].id
        , ct+". Enduser 'begin' should respond with an event" ) )
      , ct => test_SSE(0, '/v0/begin/foo-bar,baz', [], j => compare(j[0].data, {
            beginAt: /^\d{13}$/
          , code: 8000
          , filter: 'foo-bar,baz'
          , group: 'all'
          , ok: 'Enduser SSE session is open'
          , moosseID: MOOSSE.valid.moosseID
          , sentAt: /^\d{13}$/
          , usertype: 'enduser' }
        , ct+". First enduser-data should confirm SSE session has begun (200/8000)" ) )

        //// 8010: Soft-End.
        //// Receives 'soft-end/enduser', '.../all', '.../<moosseID>', not '.../admin'.
      , ct => test_SSE(1, '/v0/begin', [`/v0/${creds}/soft-end/enduser`], j => eq(
          j[1].event, 'end'
        , ct+". 'soft-end/enduser' enduser SSE event should be 'end'" ) )
      , ct => test_SSE(1, '/v0/begin', [`/v0/${creds}/soft-end/enduser`], j => compare(j[1].data, {
            code: 8010
          , ok: 'An admin POSTed a soft-end instruction'
          , sentAt: /^\d{13}$/
          , type: 'soft-end' }
        , ct+". Second enduser-data should show soft-end, after 'soft-end/enduser' (SSE/8010)" ) )
      , ct => test_SSE(1, '/v0/begin', [`/v0/${creds}/soft-end/all`], j => eq(
          'An admin POSTed a soft-end instruction', j[1].data.ok
        , ct+". 'soft-end/all' enduser data should contain expected 'ok' value (SSE/8010)" ) )
      , ct => test_SSE(1, '/v0/begin', [`/v0/${creds}/soft-end/<moosseID>`], j => eq(
          'An admin POSTed a soft-end instruction', j[1].data.ok
        , ct+". 'soft-end/<moosseID>' enduser data should contain expected 'ok' value (SSE/8010)" ) )
      , ct => test_SSE(1, '/v0/begin', [`/v0/${creds}/soft-end/admin`], j => eq(
          undefined, j[1]
        , ct+". 'soft-end/admin' should not be received by an enduser" ) )

        //// 8020: Hard-End.
        //// Receives 'hard-end/enduser', '.../all', '.../<moosseID>', not '.../admin'.
        //// This is directly before being disconnected.
      , ct => test_SSE(1, '/v0/begin', [`/v0/${creds}/hard-end/enduser`], j => eq(
          j[1].event, 'end'
        , ct+". 'hard-end/enduser' enduser SSE event should be 'end'" ) )
      , ct => test_SSE(1, '/v0/begin', [`/v0/${creds}/hard-end/enduser`], j => compare(j[1].data, {
            code: 8020
          , ok: 'An admin POSTed a hard-end instruction'
          , sentAt: /^\d{13}$/
          , type: 'hard-end' }
        , ct+". Second enduser-data should show hard-end, after 'hard-end/enduser' (SSE/8020)" ) )
      , ct => test_SSE(1, '/v0/begin', [`/v0/${creds}/hard-end/all`], j => eq(
          'An admin POSTed a hard-end instruction', j[1].data.ok
        , ct+". 'hard-end/all' enduser data should contain expected 'ok' value (SSE/8020)" ) )
      , ct => test_SSE(1, '/v0/begin', [`/v0/${creds}/hard-end/<moosseID>`], j => eq(
          'An admin POSTed a hard-end instruction', j[1].data.ok
        , ct+". 'hard-end/<moosseID>' enduser data should contain expected 'ok' value (SSE/8020)" ) )
      , ct => test_SSE(1, '/v0/begin', [`/v0/${creds}/hard-end/admin`], j => eq(
          undefined, j[1]
        , ct+". 'hard-end/admin' should not be received by an enduser" ) )

        //// 8030: Notify.
        //// Receives 'notify/enduser', '.../all', '.../<moosseID>', not '.../admin'.
      , ct => test_SSE(1, '/v0/begin', [`/v0/${creds}/notify/enduser`, { message:'Hi!' }], j => eq(
          j[1].event, 'message'
        , ct+". 'notify/enduser' enduser SSE event should be 'message'" ) )
      , ct => test_SSE(1, '/v0/begin', [`/v0/${creds}/notify/enduser`
          , { message:'Messaging the endusers' }], j => compare(j[1].data, {
            code: 8030
          , ok: 'Messaging the endusers'
          , sentAt: /^\d{13}$/
          , type: 'notify' }
        , ct+". Second enduser-data should show notification, after 'notify/enduser' (SSE/8030)" ) )
      , ct => test_SSE(1, '/v0/begin', [`/v0/${creds}/notify/all`
          , { message:'Message to all' }], j => eq(
          'Message to all', j[1].data.ok
        , ct+". 'notify/all' enduser data should contain expected 'ok' value" ) )
      , ct => test_SSE(1, '/v0/begin', [`/v0/${creds}/notify/<moosseID>`
          , { message:'Message to just one moosseID' }], j => eq(
          'Message to just one moosseID', j[1].data.ok
        , ct+". 'notify/<moosseID>' enduser data should contain expected 'ok' value" ) )
      , ct => test_SSE(1, '/v0/begin', [`/v0/${creds}/notify/admin`
          , { message:'Message to admins' }], j => eq(
          undefined, j[1]
        , ct+". 'notify/admin' should not be received by an enduser" ) )


        //// 8000-8999: Admin SSE.

        //// 8000: Admin basically works.
      , ct => test_SSE(0, `/v0/${creds}/begin`, [], j => ok(
          null != j[0] && null != j[0].id && 'message' === j[0].event
        , ct+". Admin 'begin' should respond with a 'message' event" ) )
      , ct => test_SSE(0, `/v0/${creds}/begin/vvv`, [], j => compare(j[0].data, {
            beginAt: /^\d{13}$/
          , code: 8000
          , filter: 'vvv'
          , group: 'all'
          , ok: 'Admin SSE session is open'
          , moosseID: MOOSSE.valid.moosseID
          , sentAt: /^\d{13}$/
          , usertype: 'admin' }
        , ct+". First admin-data should confirm SSE session has begun (200/8000)" ) )

      , ct => test_SSE(1, `/v0/${creds}/begin`, [], j => ok(
          null != j[1] && null != j[1].id && 'log' === j[1].event
        , ct+". Admin gets a log referring to its own 'begin'" ) )
      , ct => test_SSE(1, `/v0/${creds}/begin`, [], j => compare(j[1].data, {
            code: 8500
          , ok: 'An admin SSE session opened'
          , moosseID: j[0].data.moosseID
          , sentAt: /^\d{13}$/
          , type: 'begin' }
        , ct+". Second admin-data should log its own SSE-begin (SSE/8500)" ) )

        //// 8010: Soft-End.
        //// Receives 'soft-end/admin', '.../all', '.../<moosseID>', not '.../enduser'.
      , ct => test_SSE(2, `/v0/${creds}/begin`, [`/v0/${creds}/soft-end/admin`], j => eq(
          j[2].event, 'end'
        , ct+". 'soft-end/admin' admin SSE event should be 'end'" ) )
      , ct => test_SSE(2, `/v0/${creds}/begin`, [`/v0/${creds}/soft-end/admin`], j => compare(j[2].data, {
            code: 8010
          , ok: 'An admin POSTed a soft-end instruction'
          , sentAt: /^\d{13}$/
          , type: 'soft-end' }
        , ct+". Third admin-data should show soft-end, after 'soft-end/admin' (SSE/8010)" ) )
      , ct => test_SSE(2, `/v0/${creds}/begin`, [`/v0/${creds}/soft-end/all`], j => eq(
          'An admin POSTed a soft-end instruction', j[2].data.ok
        , ct+". 'soft-end/all' admin data should contain expected 'ok' value (SSE/8010)" ) )
      , ct => test_SSE(2, `/v0/${creds}/begin`, [`/v0/${creds}/soft-end/<moosseID>`], j => eq(
          'An admin POSTed a soft-end instruction', j[2].data.ok
        , ct+". 'soft-end/<moosseID>' admin data should contain expected 'ok' value (SSE/8010)" ) )
      , ct => test_SSE(2, `/v0/${creds}/begin`, [`/v0/${creds}/soft-end/enduser`], j => eq(
          undefined, j[2]
        , ct+". 'soft-end/enduser' should not be received by an admin" ) )

        //// 8020: Hard-End.
        //// Receives 'hard-end/admin', '.../all', '.../<moosseID>', not '.../enduser'.
        //// This is directly before being disconnected.
      , ct => test_SSE(2, `/v0/${creds}/begin`, [`/v0/${creds}/hard-end/admin`], j => eq(
          j[2].event, 'end'
        , ct+". 'hard-end/admin' admin SSE event should be 'end'" ) )
      , ct => test_SSE(2, `/v0/${creds}/begin`, [`/v0/${creds}/hard-end/admin`], j => compare(j[2].data, {
            code: 8020
          , ok: 'An admin POSTed a hard-end instruction'
          , sentAt: /^\d{13}$/
          , type: 'hard-end' }
        , ct+". Third admin-data should show hard-end, after 'hard-end/admin' (SSE/8020)" ) )
      , ct => test_SSE(2, `/v0/${creds}/begin`, [`/v0/${creds}/hard-end/all`], j => eq(
          'An admin POSTed a hard-end instruction', j[2].data.ok
        , ct+". 'hard-end/all' admin data should contain expected 'ok' value (SSE/8020)" ) )
      , ct => test_SSE(2, `/v0/${creds}/begin`, [`/v0/${creds}/hard-end/<moosseID>`], j => eq(
          'An admin POSTed a hard-end instruction', j[2].data.ok
        , ct+". 'hard-end/<moosseID>' admin data should contain expected 'ok' value (SSE/8020)" ) )
      , ct => test_SSE(3, `/v0/${creds}/begin`, [`/v0/${creds}/hard-end/enduser`], j => eq(
          undefined, j[3]
        , ct+". 'hard-end/admin' should not be received by an admin" ) )

        //// 8520: Admin logs that a 'hard-end/enduser' happened.
      , ct => test_SSE(2, `/v0/${creds}/begin`, [`/v0/${creds}/hard-end/enduser`], j => eq(
          'An admin closed the SSE sessions of 0 admin(s) and 0 enduser(s)', j[2].data.ok
        , ct+". 'hard-end/admin' should not be received by an admin" ) )
      , ct => test_SSE(2, `/v0/${creds}/begin`
          , ['/v0/begin', null, `/v0/${creds}/hard-end/enduser`], j => compare(j[2].data, {
            type: 'hard-end'
          , code: 8520
          , ok: /^An admin closed the SSE sessions of \d+ admin\(s\) and \d+ enduser\(s\)$/
          , sentAt: /^\d{13}$/ }
        , ct+". Admins should log that enduser SSE sessions begin (SSE/8520)" ) )
        //@TODO why does admin not see the enduser begin log?

        //// 8030: Notify.
        //// Receives 'notify/admin', '.../all', '.../<moosseID>', not '.../enduser'.
      , ct => test_SSE(2, `/v0/${creds}/begin`, [`/v0/${creds}/notify/admin`, { message:'Hi!' }], j => eq(
          j[2].event, 'message'
        , ct+". 'notify/admin' admin SSE event should be 'message'" ) )
      , ct => test_SSE(2, `/v0/${creds}/begin`, [`/v0/${creds}/notify/admin`
          , { message:'Messaging the admins' }], j => compare(j[2].data, {
            code: 8030
          , ok: 'Messaging the admins'
          , sentAt: /^\d{13}$/
          , type: 'notify' }
        , ct+". Third admin-data should show notification, after 'notify/admin' (SSE/8030)" ) )
      , ct => test_SSE(2, `/v0/${creds}/begin`, [`/v0/${creds}/notify/all`
          , { message:'Message to all' }], j => eq(
          'Message to all', j[2].data.ok
        , ct+". 'notify/all' admin data should contain expected 'ok' value" ) )
      , ct => test_SSE(2, `/v0/${creds}/begin`, [`/v0/${creds}/notify/<moosseID>`
          , { message:'Message to just one moosseID' }], j => eq(
          'Message to just one moosseID', j[2].data.ok
        , ct+". 'notify/<moosseID>' admin data should contain expected 'ok' value" ) )
      , ct => test_SSE(2, `/v0/${creds}/begin`, [`/v0/${creds}/notify/enduser`
          , { message:'Message to endusers' }], j => eq(
          undefined, j[2]
        , ct+". 'notify/enduser' should not be received by an admin" ) )


        //// ENDUSER + ADMIN SSE
        //// Codes 8000-8999

        //// Admin logs that an enduser SSE session opens and closes.
      , ct => test_SSE(2, `/v0/${creds}/begin`, [0,0,'/v0/begin'], j => eq(
          j[2].event, 'log'
        , ct+". Admin SSE event when enduser SSE sessions begin should be 'log'" ) )
      , ct => test_SSE(2, `/v0/${creds}/begin`, [0,0,'/v0/begin'], j => compare(j[2].data, {
            type: 'begin'
          , code: 8500
          , ok: 'An enduser SSE session opened'
          , moosseID: MOOSSE.valid.moosseID
          , sentAt: /^\d{13}$/ }
        , ct+". Admins should log that enduser SSE sessions begin (SSE/8500)" ) )

      , ct => test_SSE(3, `/v0/${creds}/begin`, [0,0,'/v0/begin'], j => eq(
          j[3].event, 'log'
        , ct+". Admin SSE event when enduser SSE sessions end should be 'log'" ) )
      , ct => test_SSE(3, `/v0/${creds}/begin`, [0,0,'/v0/begin'], j => compare(j[3].data, {
            type: 'onSSEClientClose'
          , code: 8510
          , ok: 'An enduser SSE session closed'
          , moosseID: MOOSSE.valid.moosseID
          , sentAt: /^\d{13}$/ }
        , ct+". Admins should log that enduser SSE sessions end (SSE/8510)" ) )

      , ct => test_SSE(3, `/v0/${creds}/begin`, [0,0,'/v0/begin'], j => eq(
          j[2].data.moosseID, j[3].data.moosseID
        , ct+". Admins should log enduser moosseIDs consistently" ) )

        //// 8500: Admin logs that a second admin SSE session opens and closes.
      , ct => test_SSE(2, `/v0/${creds}/begin`, [0,0,`/v0/${creds}/begin`], j => compare(j[2].data, {
            type: 'begin'
          , code: 8500
          , ok: 'An admin SSE session opened'
          , moosseID: MOOSSE.valid.moosseID
          , sentAt: /^\d{13}$/ }
        , ct+". Admins should log that admin SSE sessions begin (SSE/8500)" ) )
      , ct => test_SSE(3, `/v0/${creds}/begin`, [0,0,`/v0/${creds}/begin`], j => compare(j[3].data, {
            type: 'onSSEClientClose'
          , code: 8510
          , ok: 'An admin SSE session closed'
          , moosseID: MOOSSE.valid.moosseID
          , sentAt: /^\d{13}$/ }
        , ct+". Admins should log that admin SSE sessions end (SSE/8510)" ) )

      , ct => test_SSE(3, `/v0/${creds}/begin`, [0,0,`/v0/${creds}/begin`], j => eq(
          j[2].data.moosseID, j[3].data.moosseID
        , ct+". Admins should log admin moosseIDs consistently" ) )


        //// BREAD SSE
        //// Codes ????-????

        //// 8040: Add.
        //// Enduser 'begin/yes-please,foo' receives 'add/yes-please', not 'add/no-thanks'.
      , ct => test_SSE(1, '/v0/begin/foo,yes-please', [`/v0/${creds}/add/yes-please`
          , { id:123, title:'Hi!' }], j => eq(
          j[1].event, 'bread'
        , ct+". 'begin/yes-please' enduser should receive 'bread' event after 'add/yes-please'" ) )
      , ct => test_SSE(1, '/v0/begin/yes-please,foo', [`/v0/${creds}/add/yes-please`
          , { id:123, title:'Hi!' }], j => compare(j[1].data, {
            code: 8040
          , diff: { id:123, title:'Hi!' }
          , ok: "New 'yes-please' was created"
          , sentAt: /^\d{13}$/
          , type: 'add' }
        , ct+". Second enduser-data should show add, after 'add/yes-please' (SSE/8040)" ) )
      , ct => test_SSE(1, '/v0/begin/yes-please,foo', [`/v0/${creds}/add/no-thanks`
          , { id:456, title:'Ho!' }], j => eq(
          undefined, j[1]
        , ct+". 'begin/yes-please' enduser should not receive 'add/no-thanks'" ) )

        //// 8050: Edit.
        //// Enduser 'begin/yes-please,foo' receives 'edit/yes-please', not 'edit/no-thanks'.
      , ct => test_SSE(1, '/v0/begin/foo,yes-please', [`/v0/${creds}/edit/yes-please`
          , { id:123, title:'Yo!' }], j => eq(
          j[1].event, 'bread'
        , ct+". 'begin/yes-please' enduser should receive 'bread' event after 'edit/yes-please'" ) )
      , ct => test_SSE(1, '/v0/begin/yes-please,foo', [`/v0/${creds}/edit/yes-please`
          , { id:123, title:'Yo!' }], j => compare(j[1].data, {
            code: 8050
          , diff: { id:123, title:'Yo!' }
          , ok: "A 'yes-please' was modified"
          , sentAt: /^\d{13}$/
          , type: 'edit' }
        , ct+". Second enduser-data should show edit, after 'edit/yes-please' (SSE/8050)" ) )
      , ct => test_SSE(1, '/v0/begin/yes-please,foo', [`/v0/${creds}/edit/no-thanks`
          , { id:456, title:'Ho!' }], j => eq(
          undefined, j[1]
        , ct+". 'begin/yes-please' enduser should not receive 'edit/no-thanks'" ) )

        //// 8060: Edit.
        //// Enduser 'begin/yes-please,foo' receives 'delete/yes-please', not 'delete/no-thanks'.
      , ct => test_SSE(1, '/v0/begin/foo,yes-please', [`/v0/${creds}/delete/yes-please`
          , { id:123 }], j => eq(
          j[1].event, 'bread'
        , ct+". 'begin/yes-please' enduser should receive 'bread' event after 'delete/yes-please'" ) )
      , ct => test_SSE(1, '/v0/begin/yes-please,foo', [`/v0/${creds}/delete/yes-please`
          , { id:123 }], j => compare(j[1].data, {
            code: 8060
          , diff: { id:123 }
          , ok: "A 'yes-please' was removed"
          , sentAt: /^\d{13}$/
          , type: 'delete' }
        , ct+". Second enduser-data should show delete, after 'delete/yes-please' (SSE/8060)" ) )
      , ct => test_SSE(1, '/v0/begin/yes-please,foo', [`/v0/${creds}/delete/no-thanks`
          , { id:456, title:'Ho!' }], j => eq(
          undefined, j[1]
        , ct+". 'begin/yes-please' enduser should not receive 'delete/no-thanks'" ) )


    ]//tests




//// EVENT HANDLERS

server.stderr.on('data', data => {
    process.stdout.write(`stderr: ${data}\n`)
    server.kill()
})

server.on('close', code => {
    process.stdout.write('Server exited'+(code?' with code '+code:'')+'\n')
    server.kill()
})

server.stdout.on('data', data => {
    process.stdout.write(`stdout: ${data}`)

    //// When the server outputs its startup message, begin the tests.
    if (! server.port) {
        const match = (data+'').match(/^\W*Moosse is listening on port (\d+)\W*$/)
        if (match) {
            server.port = match[1]
            if (tests[currTest]) tests[currTest++](currTest); else finish()
        }
    }
})




//// UTILITY

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


////
function finish () {

    //// Record the number of passes or fails.
    let out = ''
    if (! fails.length)
        out = 'All ' + currTest + ' tests passed!'
    else
        out = 'Failed ' + fails.length + ' of ' + currTest + ' tests:\n'
            + '  ' + fails.join('\n  ')

    //// Check that the statuses and codes are consistent.
    for (let code in capturedDescs) {
        const firstStatus = capturedDescs[code][0]
        let inconsistencies = 0
        capturedDescs[code].forEach( status => {
            if (status !== firstStatus) inconsistencies++
        })
        if (inconsistencies)
            out += `\nCode ${code} has status inconsistencies`
    }

    //// Check that all codes in moosse.js have tests.
    const moosseSrc = ( require('fs').readFileSync('moosse.js')+'' ).split('\n')
    moosseSrc.forEach( (line, num) => {
        const // eg 'error(res, 9210, 401, ' or 'ok(res, 6100, 200, '
            match = line.match(/(error|ok)\(res,\s*(\d{4}),\s*(\d{3}),\s*/) || []
          , okOrError = match[1]
          , code = match[2]
          , status = match[3]
        if (! code) return
        if (! capturedDescs[code])
            return out += `\nmoosse.js:${num+1} contains ${okOrError}-code ${
            code}, test.js does not`
            + ('7990'===code ? '\n  (prevents infinite recursion)' : '')
        if (status !== capturedDescs[code][0])
            return out += `\nmoosse.js:${num+1} ${okOrError}-code ${code
            } has status ${status}, but in test.js it is status ${
            capturedDescs[code][0]}`
        if (capturedDescs[code].foundInMoosseSrc)
            return out += `\nmoosse.js:${num+1} redeclares ${okOrError}-code ${code}`
        capturedDescs[code].foundInMoosseSrc = true
    })

    moosseSrc.forEach( (line, num) => {
        const // eg 'code:8010'
            match = line.match(/code:\s*(\d{4})/) || []
          , code = match[1]
        if (! code) return
        if (! capturedDescs[code])
            return out += `\nmoosse.js:${num+1} contains code ${
            code}, test.js does not`
        if (capturedDescs[code].foundInMoosseSrc)
            return out += `\nmoosse.js:${num+1} redeclares code ${code}`
        capturedDescs[code].foundInMoosseSrc = true
    })

    //// Check that test.js does not contain codes which moosse.js does not.
    for (let code in capturedDescs) {
        if (! capturedDescs[code].foundInMoosseSrc)
            out += `\ntest.js contains code ${code}, moosse.js does not`
    }

    //// Check that all codes in moosse-config.js have tests.
    [].concat(
        Object.keys(MOOSSE.api.ok)
      , Object.keys(MOOSSE.api.error)
    ).forEach( code => {
        if (MOOSSE.api.ok[code] && MOOSSE.api.error[code])
            return out += `\nmoosse-config.js contains code ${code
            } in its MOOSSE.api.ok AND MOOSSE.api.error`
        const okOrError = MOOSSE.api.ok[code] ? 'ok' : 'error'
        const status = MOOSSE.api[okOrError][code].status
        if (! capturedDescs[code])
            return out += `\nmoosse-config.js contains ${okOrError}-code ${
            code}, test.js does not`
            + ('7990'===code ? '\n  (prevents infinite recursion)' : '')
        if (status && status+'' !== capturedDescs[code][0])
            return out += `\nmoosse-config.js ${okOrError}-code ${
            code} has status ${status}, but in test.js it is status ${
            capturedDescs[code][0]}`
        capturedDescs[code].foundInMoosseConfig = true
    })

    //// Check that test.js does not contain codes which moosse-config.js does not.
    for (let code in capturedDescs) {
        if (! capturedDescs[code].foundInMoosseConfig)
            out += `\ntest.js contains code ${code}, moosse-config.js does not`
    }

    ////
    if (standaloneMode) {
        server.kill()
        console.log(out)
    } else {
        if (callback) callback(out)
        callback = null
    }
}


//// Run a test which expects a JSON object in response to a request.
function test_JSON (method, path, bodyOrAssertion, assertionOrNull, skipTests, headers={}) {
    const body = 'function' === typeof bodyOrAssertion ? null : bodyOrAssertion
    const assertion = body ? assertionOrNull : bodyOrAssertion
    if (! skipTests && 'function' !== typeof assertion)
        throw Error('No assertion!')
    const req = request({
        hostname: 'localhost'
      , port: server.port
      , path
      , method
      , headers
    }, res => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
            if (skipTests) return // eg `test_JSON()` has been called by `test_SSE()`
            try {
                data = JSON.parse(data)
                assertion(data)
            } catch (e) {
                fails.push(e.message)
            }
            if (tests[currTest]) tests[currTest++](currTest); else finish()
        })
    })
    req.on('error', e => {
        if (! skipTests)
            console.error(`test.js request error: ${e.message}`)
    })
    req.write('string' === typeof body ? body : JSON.stringify(body) )
    req.end()
}


//// Run a test which expects plain text in response to a GET request.
function test_plain_GET (path, assertion) {
    const req = request({
        hostname: 'localhost'
      , port: server.port
      , path
    }, res => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
            try {
                assertion(data)
            } catch (e) {
                fails.push(e.message)
            }
            if (tests[currTest]) tests[currTest++](currTest); else finish()
        })
    })
    req.end()
}


//// Run a test which temporarily opens an SSE session.
function test_SSE (
    closeAfter    // number of SSEs, or event name, before closing the request
  , ssePath       //
  , lateRequests  // array, alternating paths and bodys
  , jsonAssertion //
  , stdout        // boolean, whether to `console.log()` server output
) {
    const req = request({
        hostname: 'localhost'
      , port: server.port
      , path: ssePath
      , headers: { Accept:'text/event-stream' }
    }, res => {
        let i = -1
          , json = []
          , raw = ''
          , secondPath     = lateRequests[0] || ''
          , secondPathBody = lateRequests[1] || ''
          , thirdPath      = lateRequests[2] || ''
          , timeout = setTimeout( () => {
                if (stdout) process.stdout.write(
                    '\n> test.js timed out after a quarter of a second\n')
                // fails.push(currTest + '. A test timed out after 1 second')
                req.abort()
            }, 250) // end the SSE session after a quarter of a second
        res.on('data', chunk => {
            raw += chunk
            if ( /^id: /.test(chunk) )
                json[++i] = { id:+chunk.slice(4), rawData:'', event:'message' }
            else if ( /^event: /.test(chunk) )
                json[i].event = (chunk.slice(7)+'').trim()
            else if ( /^data: /.test(chunk) )
                json[i].rawData += (chunk.slice(6)+'').trim()
            else if ( /^:/.test(chunk) )
                json[++i] = { comment:(chunk.slice(1)+'').trim() }
            else if ('\n' === chunk+'') {

                if (json[i].rawData) try {
                    json[i].data = JSON.parse(json[i].rawData)
                } catch (e) {
                    json[i].data = 'Unparseable, see `rawData`: ' + e
                }

                if (stdout) // helps debug tests
                    process.stdout.write( '\n'+JSON.stringify(json[i],null,2)+'\n' )

                if ('number' === typeof closeAfter && i === closeAfter) {
                    clearTimeout(timeout)
                    req.abort()
                } else if ('string' === typeof closeAfter && json[i].event === closeAfter) {
                    clearTimeout(timeout)
                    req.abort()
                } else if (0 === i && secondPath) {
                    const moosseID = json[0].data ? json[0].data.moosseID : 'X'
                    secondPath = secondPath.replace('<moosseID>', moosseID)
                    if (stdout) process.stdout.write(
                        '\n> test.js POST ' + secondPath + '\n')
                    test_JSON('POST', secondPath, secondPathBody, null, true)
                    secondPath = false // prevent double-POST @TODO needed?
                } else if (1 === i && thirdPath) {
                    if (stdout) process.stdout.write(
                        '\n> test.js GET/POST ' + thirdPath + '\n')
                    if ('/begin' === thirdPath.slice(-6) )
                        test_JSON('GET', thirdPath, null, null, true
                          , { Accept: 'text/event-stream' })
                    else
                        test_JSON('POST', thirdPath, null, null, true)
                }

            }

            if (stdout) // helps debug tests
                process.stdout.write(chunk+'')

        })
        res.on('end', () => {
            try {
                if (jsonAssertion)
                    jsonAssertion(json)
                else if (rawAssertion)
                    rawAssertion(raw)
                else
                    throw Error('No assertion?')
            } catch (e) {
                fails.push(e.message)
            }
            if (tests[currTest]) tests[currTest++](currTest); else finish()
        })
    })
    req.end()
}


////
function compare (actual, model, desc='') {
    captureDesc(desc)
    if ('object' !== typeof actual)
        throw Error('`test.js:compare()` was passed '
          + (typeof actual) + ' to `actual`. `currTest` is ' + currTest)
    const actualKeys = Object.keys(actual).sort()
    const modelKeys = Object.keys(model).sort()
    if ( (model.ok && ! model.error) && (! actual.ok && actual.error) )
        throw Error(desc + '\n    Expected an ok-object, got an error-object:'
          + '\n    ' + actual.error)
    if ( (! model.ok && model.error) && (actual.ok && ! actual.error) )
        throw Error(desc + '\n    Expected an error-object, got an ok-object:'
          + '\n    ' + actual.ok)
    deepEqual(actualKeys, modelKeys, desc + '\n    (actual vs model keys mismatch)')
    modelKeys.forEach( modelKey => {
        const actualVal = actual[modelKey]
        const modelVal = model[modelKey]
        if ( 'function' === typeof modelVal.test) // eg a RegExp
            ok(modelVal.test(actualVal), desc + `\n    (invalid '${modelKey}')`)
        else
            deepEqual(modelVal, actualVal, desc + `\n    (different '${modelKey}')`)
    })
}


////
function captureDesc (desc) {
    const
        match = ( desc.match(/\((\d{3}|SSE)\/(\d{4})\)/) || [] )
      , status = match[1]
      , code = match[2]
    if (! code) return // code `0` should not exist
    capturedDescs[code] = capturedDescs[code] || []
    capturedDescs[code].push(status)
}


}()
