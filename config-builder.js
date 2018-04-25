//// config-builder.js //// 0.3.3 //// Converts README.md to *-config.js ///////

!function(){

    //// Validate the output filename. Should have called:
    //// `$ node config-builder.js moosse-config.js`
    if ('object' !== typeof process) return console.error(`Must run in Node.js`)
    if (! process.argv[2]) return console.error(`Output? eg ‘moosse-config.js’`)
    if (! /\.js$/.test(process.argv[2]) ) return console.error(`Output not .js`)

    const

        //// Import library functionality.
        { readFileSync, writeFileSync, existsSync } = require('fs')

        //// Create the top-line of the output file.
      , version = require('./package.json').version
      , argv = process.argv
      , src = argv[3] || 'README.md' // the source file
      , out = [ ( '//// ' + ([
            argv[2], version, 'Config shared by browsers and servers' ])
           .join(' //// ') + ' ' + '/'.repeat(99) ).slice(0,80), '\n/**' ]

        //// Find the configuration section of the source file.
      , raw = existsSync(src) ? (readFileSync(src)+'').split('\n') : []
      , begin = raw.findIndex( l => 0 <= l.indexOf('BEGIN config-builder') )
      , end   = raw.findIndex( l => 0 <= l.indexOf('END config-builder') )

    //// Validate the source file.
    if (! raw.length) return console.error(`Source file ${src} does not exist`)
    if (0 > begin)    return console.error(`No 'BEGIN config-builder' in `+src)
    if (0 > end)      return console.error(`No 'END config-builder' in `+src)
    if (begin >= end) return console.error(`BEGIN/END markers are muddled`)

    //// Convert markdown to JavaScript, line by line.
    let inJS = false // true when we are in a ```js ... ``` block
    raw.slice(begin+1, end).forEach( l => {
        if (!inJS && /^```js\W*$/.test(l) ) inJS = true,
            out.push('*/ !function(ROOT){\n')
        else if ( inJS && /^```\W*$/.test(l) ) inJS = false,
            out.push(`\n}('object' === typeof global ? global : this) /**`)
        else
            out.push(l)
    })

    //// Write the output file.
    writeFileSync(argv[2], out.join('\n') + '\nBuilt by config-builder.js */')


}()
