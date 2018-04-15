//// config-builder.js //// 0.2.3 //// Converts README.md to *-config.js ///////

!function(){

    //// Validate the environment. Should have called:
    //// `$ node test.js` ...for standalone mode, or:
    //// `$ node oompsh.js` ...to fulfil ‘/v0/usr:pwd/test’ requests
    if ('object' !== typeof module) return console.error(`Must run in Node.js`)

    //// Export a function which runs the tests, useful if NOT standalone mode.
    module.exports = (cb) => {
        callback = cb
        currTest = 0
        if (tests[currTest]) tests[currTest++](currTest); else finish()
    }

    //// Load the OOMPSH namespace, with configuration, API and validators.
    require('./oompsh-config.js')

    ////
    let currTest = 0
      , callback

    const

        //// Determine whether ‘test.js’ has been called directly (we’ll need to
        //// spawn a server), or included by a running ‘oompsh.js’ server (and
        //// used to fulfil a ‘/v0/usr:pwd/test’ request).
        standaloneMode = '/test.js' === process.argv[1].slice(-8)

        ////
      , OOMPSH = global.OOMPSH
      , VERSION = require('./package.json').version
      , creds = Object.keys( getAdminCredentials() )[0]
      , { docsURL } = OOMPSH.configuration

        //// Import library functionality.
      , { spawn } = require('child_process')
      , { request } = require('http')
      , { ok, deepEqual } = require('assert')
      , is = ok
      , eq = deepEqual

        //// Start an Oompsh server (standalone mode only).
      , server = standaloneMode ? spawn('node', ['oompsh.js']) : {
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




            //// ERRORS AS EXPECTED
            //// Codes 9000-9999

            //// Oompsh startup errors: 9000-9099
            //// @TODO


            //// Errors serving a file: 9100-9199

            //// No such file.
            ct => test_plain_GET('/no-such-path!', j => eq(j, // ct=currentTest
            `{ "code":9100, "error":"NOT FOUND: No such path, see docs, ${
            docsURL}", "status":404 }\n`
            , ct+`. GET '/no-such-path!' should error (404/9100)`) )


            //// URL-format errors: 9200-9299

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
            { error: 'NOT FOUND: No such action, see docs, ' + docsURL
            , status:404, code:9230 }
            , ct+`. GET '/v0/<creds>/no-such-action!' should error (404/9230)`) )
          , ct => test_JSON('GET', `/v0/no-such-action!`, j => eq(j,
            { error: 'NOT FOUND: No such action, see docs, ' + docsURL
            , status:404, code:9231 }
            , ct+`. GET '/v0/no-such-action!' should error (404/9231)`) )

            //// POST invalid action.
          , ct => test_JSON('POST', `/v0/${creds}/no-such-action!`, j => eq(j,
            { error: 'NOT FOUND: No such action, see docs, ' + docsURL
            , status:404, code:9240 }
            , ct+`. POST '/v0/<creds>/no-such-action!' should error (404/9240)`) )

            //// GET invalid filter.
            ////@TODO 9250

            //// POST invalid filter.
          , ct => test_JSON('POST', `/v0/${creds}/hard-end/nope!`, j => eq(j,
            { error: 'NOT ACCEPTABLE: Filter not \'admin|enduser|all\' or an oompshID'
            , status:406, code:9260 }
            , ct+`. POST '/v0/<creds>/hard-end/nope!' should error (406/9260)`) )
          , ct => test_JSON('POST', `/v0/${creds}/soft-end/nope!`, j => eq(j,
            { error: 'NOT ACCEPTABLE: Filter not \'admin|enduser|all\' or an oompshID'
            , status:406, code:9261 }
            , ct+`. POST '/v0/<creds>/soft-end/nope!' should error (406/9261)`) )


            //// Header and body errors: 9300-9399

            //// Wrong method.
          , ct => test_JSON('DELETE', `/`, j => eq(j,
            { error: 'METHOD NOT ALLOWED: Use GET, POST or OPTIONS'
            , status:405, code:9300 }
            , ct+`. DELETE '/' should error (405/9300)`) )
          , ct => test_JSON('PUT', `/v0`, j => eq(j,
            { error: 'METHOD NOT ALLOWED: Use GET, POST or OPTIONS'
            , status:405, code:9300 }
            , ct+`. PUT '/v0' should error (405/9300)`) )

            //// Invalid POST body.
          , ct => test_JSON('POST', `/v0/${creds}/notify/all`
            , { shouldbemessage:"This ain’t right" }
            , j => eq(j,
            { error: `NOT ACCEPTABLE: Body should be '{ "message":"Hi!" }'`
            , status:406, code:9310 }
            , ct+`. POST '/v0/<creds>/notify/all' with malformed body should error (406/9310)`) )

            //// SSE session errors: 9400-9499

            //// Begin SSE session errors.
          , ct => test_JSON('GET', `/v0/begin`, j => eq(j,
            { error: "NOT ACCEPTABLE: Missing 'Accept: text/event-stream' header"
            , status:406, code:9400 }
            , ct+`. GET '/v0/begin' without proper Accept header should error (406/9400)`) )



            //// GET AND OPTIONS TESTS
            //// Codes 6000-6999

            //// API description.
          , ct => test_JSON('GET', '/v0', j => eq(j,
            OOMPSH.api // code 6000
            , ct+`. GET '/v0' should retrieve the Oompsh API (200/6000)`) )

            //// Version.
          , ct => test_JSON('GET', '/v0/version', j => eq(j,
            { ok: 'Oompsh ' + VERSION, status:200, code:6100 }
            , ct+`. GET '/v0/version' should retrieve the Oompsh version (200/6100)`) )
          , ct => test_JSON('GET', `/v0/${creds}/version`, j => eq(j,
            { ok: 'Oompsh ' + VERSION, status:200, code:6100 }
            , ct+`. GET '/v0/<creds>/version' should retrieve the Oompsh version (200/6100)`) )

            //// OPTIONS always responds ok.
          , ct => test_JSON('OPTIONS', '/', j => eq(j,
            { ok:"You're probably a CORS preflight", status:200, code:6900 }
            , ct+`. OPTIONS '/' should just be ok (200/6900)`) )
          , ct => test_JSON('OPTIONS', '/v0', j => eq(j,
            { ok:"You're probably a CORS preflight", status:200, code:6900 }
            , ct+`. OPTIONS '/v0' should just be ok (200/6900)`) )
          , ct => test_JSON('OPTIONS', '/anything-in-here', j => eq(j,
            { ok:"You're probably a CORS preflight", status:200, code:6900 }
            , ct+`. OPTIONS '/anything-in-here' should just be ok (200/6900)`) )




            //// POST TESTS
            //// Codes 7000-7999

            //// Soft-End.
          , ct => test_JSON('POST', `/v0/${creds}/soft-end/admin`, j => compare(j,
            { ok: /Broadcast 'soft-end' to \d+ admin\(s\), \d+ enduser\(s\)/
            , status:200, code:7000 }
            , ct+`. POST '/v0/<creds>/soft-end/admin' should respond ok (200/7000)`) )

            //// Hard-End.
          , ct => test_JSON('POST', `/v0/${creds}/hard-end/all`, j => compare(j,
            { ok: /Hard-ended \d+ admin\(s\), \d+ enduser\(s\)/
            , status:200, code:7010 }
            , ct+`. POST '/v0/<creds>/hard-end/all' should respond ok (200/7010)`) )

            //// Notify.
          , ct => test_JSON('POST', `/v0/${creds}/notify/enduser`,
            { message: 'A test message' }, j => compare(j,
            { ok: /Notified \d+ admin\(s\), \d+ enduser\(s\)/
            , status:200, code:7020 }
            , ct+`. POST '/v0/<creds>/notify/enduser' should respond ok (200/7020)`) )




            //// FILE TESTS
            //// No codes

            //// Homepage.
          , ct => test_plain_GET('/', d => is(
            0 < d.indexOf('<title>Oompsh ' + VERSION)
            , ct+`. GET '/' should retrieve the homepage`) )
          , ct => test_plain_GET('/index.html', d => is(
            0 < d.indexOf('<title>Oompsh ' + VERSION)
            , ct+`. GET '/index.html' should retrieve the homepage`) )

            //// Oompsh Config.
          , ct => test_plain_GET('/oompsh-config.js', d => is(
            0 < d.indexOf('oompsh-config.js //// ' + VERSION)
            , ct+`. GET '/oompsh-config.js' should retrieve Oompsh config`) )




            //// ENDUSER SSE
            //// Codes 8000-8999

            //// Basically works.
          , ct => test_SSE('/v0/begin', null, null, j => ok(
            null != j[0] && null != j[0].id && null != j[1] && null != j[1].ok
            , ct+". Enduser 'begin' should basically work" ) )

          , ct => test_SSE(`/v0/begin`, null, null, j => compare(j[1], {
                beginAt: /^\d{13}$/
              , code: 8000
              , isAdmin: false
              , ok: 'Enduser SSE session is open'
              , oompshID: OOMPSH.valid.oompshID
              , sentAt: /^\d{13}$/
          }, ct+". First enduser-data should confirm SSE session has begun (SSE/8000)" ) )

            //// Receives 'soft-end/enduser'.
          , ct => test_SSE('/v0/begin', `/v0/${creds}/soft-end/enduser`, null, j => eq(
            j[3].event, 'soft-end'
            , ct+". 'soft-end/all' enduser SSE event should be 'soft-end'" ) )

          , ct => test_SSE(`/v0/begin`, `/v0/${creds}/soft-end/enduser`
              , null, j => compare(j[4], {
                code: 8010
              , ok: 'An admin POSTed a soft-end instruction'
              , sentAt: /^\d{13}$/
              , type: 'soft-end'
          }, ct+". Second enduser-data should show soft-end, after 'soft-end/enduser' (SSE/8010)" ) )

            //// Receives 'soft-end/all' and '.../<oompshID>', but not '.../admin'.
          , ct => test_SSE('/v0/begin', `/v0/${creds}/soft-end/all`, null, j => eq(
            'An admin POSTed a soft-end instruction', j[4].ok
            , ct+". 'soft-end/all' enduser data should contain expected 'ok' value (SSE/8010)" ) )
          , ct => test_SSE('/v0/begin', `/v0/${creds}/soft-end/<oompshID>`, null, j => eq(
            'An admin POSTed a soft-end instruction', j[4].ok
            , ct+". 'soft-end/<oompshID>' enduser data should contain expected 'ok' value (SSE/8010)" ) )
          , ct => test_SSE('/v0/begin', `/v0/${creds}/soft-end/admin`, null, j => eq(
            undefined, j[4]
            , ct+". 'soft-end/admin' should not be received by an enduser" ) )

            //// Receives 'hard-end/enduser', '.../all', '.../<oompshID>', not '.../admin'.
            ////@TODO test that the connected is also ended from the server
          , ct => test_SSE('/v0/begin', `/v0/${creds}/hard-end/enduser`, null, j => eq(
            j[2].comment, 'bye!'
            , ct+". Enduser should receive a 'bye!' comment after 'hard-end/enduser'" ) )
          , ct => test_SSE('/v0/begin', `/v0/${creds}/hard-end/all`, null, j => eq(
            j[2].comment, 'bye!'
            , ct+". Enduser should receive a 'bye!' comment after 'hard-end/all'" ) )
          , ct => test_SSE('/v0/begin', `/v0/${creds}/hard-end/<oompshID>`, null, j => eq(
            j[2].comment, 'bye!'
            , ct+". Enduser should receive a 'bye!' comment after 'hard-end/<oompshID>'" ) )
          , ct => test_SSE('/v0/begin', `/v0/${creds}/hard-end/admin`, null, j => eq(
            undefined, j[2]
            , ct+". Enduser should not receive a 'bye!' comment after 'hard-end/admin'" ) )

            //// Receives 'notify/enduser'.
          , ct => test_SSE(`/v0/begin`, `/v0/${creds}/notify/enduser`
              , { message:'Messaging the endusers' }, j => compare(j[3], {
                code: 8030
              , ok: 'Messaging the endusers'
              , sentAt: /^\d{13}$/
              , type: 'notify'
          }, ct+". Second enduser-data should show notification, after 'notify/enduser' (SSE/8030)" ) )

            //// Receives 'notify/all' and '.../<oompshID>', but not '.../admin'.
          , ct => test_SSE('/v0/begin', `/v0/${creds}/notify/all`
            , { message:'Message to all' }, j => eq(
            'Message to all', j[3].ok
            , ct+". 'notify/all' enduser data should contain expected 'ok' value" ) )
          , ct => test_SSE('/v0/begin', `/v0/${creds}/notify/<oompshID>`
            , { message:'Message to just one oompshID' }, j => eq(
            'Message to just one oompshID', j[3].ok
            , ct+". 'notify/<oompshID>' enduser data should contain expected 'ok' value" ) )
          , ct => test_SSE('/v0/begin', `/v0/${creds}/notify/admin`
            , { message:'Message to admins' }, j => eq(
            undefined, j[3]
            , ct+". 'notify/admin' should not be received by an enduser" ) )




            //// ADMIN SSE
            //// Codes 8000-8999

            //// Basically works.
          , ct => test_SSE(`/v0/${creds}/begin`, null, null, j => ok( // j=json
            null != j[0] && null != j[0].id && null != j[1] && null != j[1].ok
            , ct+". Admin 'begin' should basically work" ) )

          , ct => test_SSE(`/v0/${creds}/begin`, null, null, j => compare(j[1], {
                beginAt: /^\d{13}$/
              , code: 8001
              , isAdmin: true
              , ok: 'Admin SSE session is open'
              , oompshID: OOMPSH.valid.oompshID
              , sentAt: /^\d{13}$/
          }, ct+". First admin-data should confirm SSE session has begun (SSE/8001)" ) )

          , ct => test_SSE(`/v0/${creds}/begin`, null, null, j => compare(j[3], {
                code: 8100
              , ok: 'Opened admin SSE session'
              , oompshID: OOMPSH.valid.oompshID
              , sentAt: /^\d{13}$/
              , type: 'begin'
          }, ct+". Second admin-data should log its own SSE-begin (SSE/8100)" ) )

            //// Receives 'soft-end/admin'.
          , ct => test_SSE(`/v0/${creds}/begin`, `/v0/${creds}/soft-end/admin`, null, j => eq(
            j[5].event, 'soft-end'
            , ct+". 'soft-end/all' admin SSE event should be 'soft-end'" ) )

          , ct => test_SSE(`/v0/${creds}/begin`, `/v0/${creds}/soft-end/admin`
              , null, j => compare(j[6], {
                code: 8010
              , ok: 'An admin POSTed a soft-end instruction'
              , sentAt: /^\d{13}$/
              , type: 'soft-end'
          }, ct+". Third admin-data should show soft-end, after 'soft-end/admin' (SSE/8010)" ) )

            //// Receives 'soft-end/all' and '.../<oompshID>', but not '.../enduser'.
          , ct => test_SSE(`/v0/${creds}/begin`, `/v0/${creds}/soft-end/all`, null, j => eq(
            'An admin POSTed a soft-end instruction', j[6].ok
            , ct+". 'soft-end/all' admin data should contain expected 'ok' value" ) )
          , ct => test_SSE(`/v0/${creds}/begin`, `/v0/${creds}/soft-end/<oompshID>`, null, j => eq(
            'An admin POSTed a soft-end instruction', j[6].ok
            , ct+". 'soft-end/<oompshID>' admin data should contain expected 'ok' value" ) )
          , ct => test_SSE(`/v0/${creds}/begin`, `/v0/${creds}/soft-end/enduser`, null, j => eq(
            undefined, j[5]
            , ct+". 'soft-end/enduser' should not be received by an admin" ) )

            //// Receives 'hard-end/admin', '.../all', '.../<oompshID>', not '.../enduser'.
            ////@TODO test that the connected is also ended from the server
          , ct => test_SSE(`/v0/${creds}/begin`, `/v0/${creds}/hard-end/admin`, null, j => eq(
            j[4].comment, 'bye!'
            , ct+". Admin should receive a 'bye!' comment after 'hard-end/admin'" ) )
          , ct => test_SSE(`/v0/${creds}/begin`, `/v0/${creds}/hard-end/all`, null, j => eq(
            j[4].comment, 'bye!'
            , ct+". Admin should receive a 'bye!' comment after 'hard-end/all'" ) )
          , ct => test_SSE(`/v0/${creds}/begin`, `/v0/${creds}/hard-end/<oompshID>`, null, j => eq(
            j[4].comment, 'bye!'
            , ct+". Admin should receive a 'bye!' comment after 'hard-end/<oompshID>'" ) )
          , ct => test_SSE(`/v0/${creds}/begin`, `/v0/${creds}/hard-end/enduser`, null, j => eq(
            j[5].ok, 'An admin closed the SSE sessions of 0 admin(s) and 0 enduser(s)'
            , ct+". Admin should receive a log after 'hard-end/enduser'" ) )
          , ct => test_SSE(`/v0/${creds}/begin`, `/v0/${creds}/hard-end/enduser`, null, j => eq(
            undefined, j[6]
            , ct+". Admin should not receive a 'bye!' comment after 'hard-end/enduser'" ) )

            //// Receives 'notify/admin'.
          , ct => test_SSE(`/v0/${creds}/begin`, `/v0/${creds}/notify/admin`
              , { message:'Messaging the admins' }, j => compare(j[5], {
                code: 8030
              , ok: 'Messaging the admins'
              , sentAt: /^\d{13}$/
              , type: 'notify'
          }, ct+". Third admin-data should show notification, after 'notify/admin' (SSE/8030)" ) )

            //// Receives 'notify/all' and '.../<oompshID>', but not '.../enduser'.
          , ct => test_SSE(`/v0/${creds}/begin`, `/v0/${creds}/notify/all`
            , { message:'Message to all' }, j => eq(
            'Message to all', j[5].ok
            , ct+". 'notify/all' admin data should contain expected 'ok' value" ) )
          , ct => test_SSE(`/v0/${creds}/begin`, `/v0/${creds}/notify/<oompshID>`
            , { message:'Message to just one oompshID' }, j => eq(
            'Message to just one oompshID', j[5].ok
            , ct+". 'notify/<oompshID>' admin data should contain expected 'ok' value" ) )
          , ct => test_SSE(`/v0/${creds}/begin`, `/v0/${creds}/notify/enduser`
            , { message:'Message to admins' }, j => eq(
            undefined, j[5]
            , ct+". 'notify/admin' should not be received by an admin" ) )




            //// ENDUSER + ADMIN SSE
            //// Codes 8000-8999

            //// Admin logs that an enduser SSE session opens and closes.
          , ct => test_SSE(`/v0/${creds}/begin`, null, null, j => compare(j[5], {
                type: 'begin'
              , code: 8100
              , ok: 'Opened enduser SSE session'
              , oompshID: OOMPSH.valid.oompshID
              , sentAt: /^\d{13}$/
          }, ct+". Admins should log that enduser SSE sessions begin (SSE/8100)" )
              ,`/v0/begin` )

          , ct => test_SSE(`/v0/${creds}/begin`, null, null, j => compare(j[7], {
                type: 'onSSEClientClose'
              , code: 8101
              , ok: 'Enduser SSE session closed'
              , oompshID: OOMPSH.valid.oompshID
              , sentAt: /^\d{13}$/
          }, ct+". Admins should log that enduser SSE sessions end (SSE/8101)" )
              ,`/v0/begin` )

          , ct => test_SSE(`/v0/${creds}/begin`, null, null, j => eq(
              j[5].oompshID, j[7].oompshID
              , ct+". Admins should log enduser oompshIDs consistently" )
              ,`/v0/begin` )

            //// Admin logs that a second admin SSE session opens and closes.
          , ct => test_SSE(`/v0/${creds}/begin`, null, null, j => compare(j[5], {
                type: 'begin'
              , code: 8100
              , ok: 'Opened admin SSE session'
              , oompshID: OOMPSH.valid.oompshID
              , sentAt: /^\d{13}$/
          }, ct+". Admins should log that admin SSE sessions begin (SSE/8100)" )
              , `/v0/${creds}/begin` )

          , ct => test_SSE(`/v0/${creds}/begin`, null, null, j => compare(j[7], {
                type: 'onSSEClientClose'
              , code: 8101
              , ok: 'Admin SSE session closed'
              , oompshID: OOMPSH.valid.oompshID
              , sentAt: /^\d{13}$/
          }, ct+". Admins should log that admin SSE sessions end (SSE/8101)" )
              ,`/v0/${creds}/begin` )

          , ct => test_SSE(`/v0/${creds}/begin`, null, null, j => eq(
              j[5].oompshID, j[7].oompshID
              , ct+". Admins should log admin oompshIDs consistently" )
              , `/v0/${creds}/begin` )




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
            const match = (data+'').match(/^\W*Oompsh is listening on port (\d+)\W*$/)
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


    ////
    function finish () {
        let out = ''
        if (! fails.length)
            out = 'All ' + currTest + ' tests passed!'
        else
            out = 'Failed ' + fails.length + ' of ' + currTest + ' tests:\n'
                + '  ' + fails.join('\n  ')
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
        const body = 'object' === typeof bodyOrAssertion ? bodyOrAssertion : null
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
                    if ('Cannot convert undefined or null to object' === e.message)
                        e.message = currTest + '. ' + e.message
                    fails.push(e.message)
                }
                if (tests[currTest]) tests[currTest++](currTest); else finish()
            })
        })
        req.on('error', e => {
            if (! skipTests)
                console.error(`test.js request error: ${e.message}`)
        })
        req.write( JSON.stringify(body) )
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
                    if ('Cannot convert undefined or null to object' === e.message)
                        e.message = currTest + '. ' + e.message
                    fails.push(e.message)
                }
                if (tests[currTest]) tests[currTest++](currTest); else finish()
            })
        })
        req.end()
    }


    //// Run a test which temporarily opens an SSE session.
    function test_SSE (ssePath, postPath, postBody, jsonAssertion, lateGetPath, stdout) {
        const req = request({
            hostname: 'localhost'
          , port: server.port
          , path: ssePath
          , headers: {
                Accept: 'text/event-stream'
            }
        }, res => {
            let json = [], raw = '', oompshID
            setTimeout( () => {
                if (! lateGetPath)
                    return req.abort()
                test_JSON('GET', lateGetPath, null, null, true, {
                    Accept: 'text/event-stream'
                })
                setTimeout( () => {
                    req.abort()
                }, 100)
            }, 100) // close the SSE session after 100 milliseconds
            res.on('data', chunk => {
                raw += chunk
                if ( /^id: /.test(chunk) )
                    json.push({ id:+chunk.slice(4) })
                else if ( /^data: /.test(chunk) )
                    json.push( JSON.parse( chunk.slice(6) ) )
                else if ( /^event: /.test(chunk) )
                    json.push({ event:(chunk.slice(7)+'').trim() })
                else if ( /^:/.test(chunk) )
                    json.push({ comment:(chunk.slice(1)+'').trim() })
                if (stdout) // helps debug tests
                    process.stdout.write(chunk+'')
                if (2 === json.length && postPath) {
                    oompshID = json[1].oompshID
                    postPath = postPath.replace('<oompshID>', oompshID)
                    if (stdout) console.log('\n> test.js will POST', postPath)
                    test_JSON('POST', postPath, postBody, null, true)
                    postPath = false // prevent double-POST
                }
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
                    // if ('Cannot convert undefined or null to object' === e.message)
                    //     e.message = currTest + '. ' + e.message
                    fails.push(e.message)
                }
                if (tests[currTest]) tests[currTest++](currTest); else finish()
            })
        })
        req.end()
    }


    ////
    function compare (actual, model, desc) {
        if ('object' !== typeof actual)
            throw Error('`compare()` was passed '
              + (typeof actual) + ' to `actual`. `currTest` is ' + currTest)
        const actualKeys = Object.keys(actual).sort()
        const modelKeys = Object.keys(model).sort()
        eq(actualKeys, modelKeys, desc + '\n    (actual vs model keys mismatch)')
        modelKeys.forEach( modelKey => {
            const actualVal = actual[modelKey]
            const modelVal = model[modelKey]
            if ( 'function' === typeof modelVal.test) // eg a RegExp
                ok( modelVal.test(actualVal), desc + `\n    (invalid '${modelKey}')` )
            else
                eq(modelVal, actualVal, desc + `\n    (different '${modelKey}')` )
        })
    }

}()
