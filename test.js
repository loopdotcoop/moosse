//// config-builder.js //// 0.2.1 //// Converts README.md to *-config.js ///////

!function(){

    //// Validate the environment. Should have called:
    //// `$ node test.js`
    if ('object' !== typeof process) return console.error(`Must run in Node.js`)

    //// Load the OOMPSH namespace, with configuration, API and validators.
    require('./oompsh-config.js')

    const

        OOMPSH = global.OOMPSH

        //// Import library functionality.
      , { ok, deepEqual } = require('assert')
      , { spawn } = require('child_process')
      , { request } = require('http')

        ////
      , VERSION = require('./package.json').version

        //// Start an Oompsh server.
      , server = spawn('node', ['oompsh.js'])

        //// Initialise an array to hold test-failures, and define the tests.
      , fails = []
      , tests = [

            //// 404 not found. @TODO check HTTP status
            z => test_JSON_GET('/v0/no-such-path!'
              , data => deepEqual(data, { error:'NOT FOUND: See docs, ' + OOMPSH.configuration.docsURL }) )

            //// API description.
          , z => test_JSON_GET('/v0'
              , data => deepEqual(data, OOMPSH.api) )

            //// version.
          , z => test_JSON_GET('/v0/version'
              , data => deepEqual(data, { ok:'Oompsh ' + VERSION }) )

        ]


    //// Add event handlers to the Oompsh server.

    server.stderr.on('data', data => {
        process.stdout.write(`stderr: ${data}\n`)
    })

    server.on('close', code => {
        process.stdout.write(`server exited with code ${code}\n`)
    })

    server.stdout.on('data', data => {
        process.stdout.write(`stdout: ${data}`)

        //// When the server outputs its startup message, begin the tests.
        if (! server.port) {
            const match = (data+'').match(/^\W*Oompsh is listening on port (\d+)\W*$/)
            if (match) {
                server.port = match[1]
                const test = tests.shift()
                if (test) test(); else finish()
            }
        }
    })




    //// UTILITY

    ////
    function finish () {
        server.kill()
        if (! fails.length)
            return console.log('All tests passed!')
        console.error('Failed with ' + fails.length + ' error(s):')
        console.error( '  ' + fails.join('\n  ') )
    }

    //// Run a test which expects a JSON object in response to a GET request.
    function test_JSON_GET (path, assertion) {
        const req = request({
            hostname: 'localhost'
          , port: server.port
          , path
        }, res => {
            let data = ''
            res.on('data', chunk => data += chunk)
            res.on('end', () => {
                try {
                    data = JSON.parse(data)
                    assertion(data)
                } catch (e) {
                    fails.push(e.message)
                }
                const test = tests.shift()
                if (test) test(); else finish()
            })
        })
        req.end()
    }

}()
