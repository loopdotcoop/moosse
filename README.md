# Oompsh

#### A Node.js server which adds realtime push notification to Oom apps

+ __Last update:__  2018/04/16
+ __Version:__      0.2.5

[Homepage](http://oompsh.loop.coop/) &nbsp;
[Repo](https://github.com/loopdotcoop/oompsh) &nbsp;
[NPM](https://www.npmjs.com/package/oompsh) &nbsp;
[Changelog](http://oompsh.loop.coop/CHANGELOG) &nbsp;
[Test @TODO](http://oompsh.loop.coop/support/test.html)

Oom &nbsp;
🔅 &nbsp;
Realtime &nbsp;
🌟 &nbsp;
Push &nbsp;
🎉 &nbsp;
Server-Sent Events




## Author

Designed, developed and authored by Rich Plastow for Loop.Coop.

+ __Website:__
  [richplastow.com](http://richplastow.com/) &nbsp;
  [loop.coop](https://loop.coop/)
+ __GitHub:__
  [richplastow](https://github.com/richplastow) &nbsp;
  [loopdotcoop](https://github.com/loopdotcoop)
+ __Twitter:__
  [@richplastow](https://twitter.com/richplastow) &nbsp;
  [@loopdotcoop](https://twitter.com/loopdotcoop)
+ __Location:__
  Brighton, UK and Himachal Pradesh, India




## App

+ __Locales:__
  - English
+ __Software:__
  - Atom
  - Git
+ __Languages:__
  - HTML5
  - CSS3
  - JavaScript ES6
+ __Dependencies:__
  - None!




<!-- BEGIN config-builder.js -->
## Namespace

The global namespace is `window.OOMPSH` in a browser, or `global.OOMPSH` in the
Node.js server.

```js
ROOT.OOMPSH = {}
```



## Configuration

```js
ROOT.OOMPSH.configuration = {

    VERSION: '0.2.5' // the major part of this is also the API version, `APIV`
  , get APIV () { return 'v' + ROOT.OOMPSH.configuration.VERSION.split('.')[0] }

    //// Used as one of the default `domain` values in the frontend UI.
  , remoteURL: 'https://oompsh.herokuapp.com'

    //// Part of the response with various errors.
  , apiURL: 'https://github.com/loopdotcoop/oompsh#api'
  , validatorsURL: 'https://github.com/loopdotcoop/oompsh#validators'

    //// Validators for the first character of a username or password, and for
    //// subsequent characters.
  , c1: '[a-zA-Z0-9!()_`~@\'"^]' // not allowed to start with . or -
  , c2: '[a-zA-Z0-9!()_`~@\'"^.-]'

    //// Initial values for the server’s ‘very very verbose’ and ‘very verbose’.
  , vvv: false // very very verbose logging
  , vv:  true  // very verbose logging (must be true if `vvv` is true)

}
```




## API

Request URLs can have up to four parts:
1. Oompsh __API version,__ currently `v0`. This is the only mandatory part
2. __Credentials,__ in the form `<my-username>:<my-password>`. Oompsh expects HTTPS!
3. An __action,__ eg `version`, `begin` or `notify`
4. A __filter,__ eg `all`, `admin`, `enduser`, or an SSE client ID, eg `a1b2c3` _[@TODO ID filter]_

Requests must be sent with the correct method for that action, either `GET` or
`POST`. All `POST` requests require credentials.

Some of the `POST` actions, eg `notify`, also expect a request body to be sent, which
should be JSON data. _[@TODO more POST actions with body]_

The `begin` action is a special case:
- It starts a ‘Server-Sent Events’ session, so needs headers like
`Accept: text/event-stream` — you’ll probably use `new EventSource()` for this.
- If the URL contains credentials, an __admin__ SSE session is opened, which listens
for server log events. The filter can be blank, `vv` or `vvv` _[@TODO vv, vvv]_
- If the URL _does not_ contain credentials, an __enduser__ SSE session is
opened, which listens for data update events. The filter should be a
comma-delimited list of WordPress post-types, eg `post,page,my-cpt` _[@TODO post types]_


```js
const OOMPSH = ROOT.OOMPSH
const api = ROOT.OOMPSH.api = {

    //// Endusers can only GET:
    enduser: {
        GET:  {
            '':         { eg:'GET /v0/'
                       , tip:'Retrieves a description of the API' }
          , 'version':  { eg:'GET /v0/version'
                       , tip:'Shows the app’s name and version' }
          , 'begin':    { eg:"new EventSource('v0/connect/post,page,my-cpt')"
                       , tip:'Starts an enduser SSE session' }
        }
      , POST: { }
    }

    //// Admins can do everything endusers can do, plus:
  , admin: {
        GET:  {
            'begin':    { eg:"new EventSource('v0/usr:pwd/connect')"
                       , tip:'Starts an admin SSE session' }
        }
      , POST: {
            'soft-end': { eg:'POST /v0/usr:pwd/soft-disconnect/enduser'
                       , tip:'Asks SSE clients to close' }
          , 'hard-end': { eg:'POST /v0/usr:pwd/hard-disconnect/enduser'
                       , tip:'Forces SSE clients to close' }
          , 'notify':   { eg:'BODY {"message":"Hello SSEs!"}'
                          + ' POST /v0/usr:pwd/notify/all'
                       , tip:'Sends a message to SSE clients' }
          , 'test':     { eg:'POST /v0/usr:pwd/test'
                       , tip:'Runs the test-suite' }
        }
    }

    //// The Oompsh server responds with one of these HTTP status codes.
  , status: {
        200: 'OK'
      , 401: 'UNAUTHORIZED' // nb, Oompsh doesn’t send a WWW-Authenticate header
      , 404: 'NOT FOUND'
      , 405: 'METHOD NOT ALLOWED'
      , 406: 'NOT ACCEPTABLE'
      // , 500: 'INTERNAL SERVER ERROR'
      , 501: 'NOT IMPLEMENTED'
    }

    //// 6000-8999: Ok.
  , ok: {

        //// 6000-6999: GET and OPTIONS.
        6000: { status:200, eg:'GET /v0', tip:'Retrieve the Oompsh API' }
      , 6100: { status:200, eg:'GET /v0/version', tip:'Retrieve the Oompsh version' }
      , 6900: { status:200, eg:'OPTIONS /', tip:"You're probably a CORS preflight" }

        //// 7000-7999: POST.
      , 7010: { status:200, eg:'POST /v0/o:k/soft-end/all', tip:'Soft-End all' }
      , 7020: { status:200, eg:'POST /v0/o:k/hard-end/all', tip:'Hard-End all' }
      , 7030: { status:200, eg:'BODY {"message":"ok"} POST /v0/o:k/notify/all'
          , tip:'Notify all' }
      , 7990: { status:200, eg:'POST /v0/o:k/test', tip:'Run tests' }

        //// 8000-4999: Admin and enduser SSE.
      , 8000: { status:200, eg:'GET /v0/begin', tip:'Enduser SSE session is open' }
      , 8010: { event:'soft-end', type:'soft-end', tip:"Asks SSE clients to close" }
      , 8020: { event:'hard-end', type:'hard-end', tip:"Warn before hard-end SSE clients" } //@TODO
      , 8030: { event:'message', type:'notify', tip:"Sends a message to SSE clients" }

        //// 8500-8999: Admin SSE logs.
      , 8500: { event:'log', type:'begin', tip:"An SSE session opened" }
      , 8510: { event:'log', type:'onSSEClientClose', tip:"An SSE session closed" }
      , 8520: { event:'log', type:'hard-end', tip:"An admin closed some SSE sessions" }

    }

    //// 9000-9999: Errors.
  , error: {

        //// 9000-9099: Oompsh startup errors.
        //// @TODO

        //// 9100-9199: Errors serving a file.
        9100: { status:404, eg:'GET /no-such-path!', tip:'No such path...' }

        //// 9200-9299: URL-format errors.
      , 9200: { status:501, eg:'GET /v9999', tip:'Wrong API version' }
      , 9210: { status:401, eg:'GET /v0/-:-', tip:'Invalid credentials' }
      , 9211: { status:401, eg:'GET /v0/x:x', tip:'Credentials not recognised' }
      , 9220: { status:401, eg:'POST /v0/-:-', tip:'Invalid credentials' }
      , 9221: { status:401, eg:'POST /v0/x:x', tip:'Credentials not recognised' }
      , 9222: { status:401, eg:'POST /v0/notify', tip:"Can't POST without credentials" }
      , 9230: { status:404, eg:'GET /v0/o:k/non-existant', tip:'No such action...' }
      , 9231: { status:404, eg:'GET /v0/non-existant', tip:'No such action...' }
      , 9240: { status:404, eg:'POST /v0/o:k/non-existant', tip:'No such action...' }
      , 9260: { status:406, eg:'POST /v0/o:k/soft-end/NO!', tip:'Invalid filter...' }

        //// 9300-9399: Header and body errors.
      , 9300: { status:405, eg:'DELETE /v0', tip:'Use GET, POST or OPTIONS' }
      , 9310: { status:406, eg:'BODY {"No":"Message"} POST /v0/o;k/notify/all'
          , tip:`Body should be '{ "message":"Hi!" }'` }

        //// 9400-9499: SSE session errors.
      , 9400: { status:406, eg:'GET /v0/begin without Accept header'
          , tip:"Missing 'Accept: text/event-stream' header" }
    }

  , code: 6000 // every API response has a code
}

//// Duplicate all enduser actions to admin.
api.admin.GET  = Object.assign({}, api.enduser.GET, api.admin.GET)
api.admin.POST = Object.assign({}, api.enduser.POST, api.admin.POST)
```




## Validators

```js
const OOMPSH = ROOT.OOMPSH
    , { c1, c2 } = OOMPSH.configuration
    , { admin, enduser } = OOMPSH.api

OOMPSH.valid = {
    local:  /^https?:\/\/(127\.0\.0\.1|localhost)/
  , domain: /^https?:\/\/[-:.a-z0-9]+\/?$/

  , oompshID: /^\d[a-z\d]{6}$/ // a digit, then six digits or lowercase letters

    //// Username, password and credentials.
  , user:  new RegExp(`^(${c1}${c2}{0,64})$`)
  , pass:  new RegExp(`^(${c1}${c2}{0,64})$`)
  , creds: new RegExp(`^${c1}${c2}{0,64}:${c1}${c2}{0,64}$`)

  , apiv:   /^v\d+$/
  , domain: /^https?:\/\/[-:.a-z0-9]+\/?$/
  , method: /^(GET|POST|OPTIONS)$/
  , action: new RegExp( `^(`
      + Object.keys(admin.GET).join('|') + '|'
      + Object.keys(admin.POST).join('|') + '|'
      + Object.keys(enduser.GET).join('|') + '|'
      + Object.keys(enduser.POST).join('|')
      + `)$` )

    //// Filters.
  , standardFilter: /^(\d[a-z\d]{6})|(admin|enduser|all)$/
  , filter: /^.+$/ //@TODO should be a combination of standardFilter plus any others

    //// Body.
  , notifyBody: /^.+$/ //@TODO will be used to validate the BODY of 'POST /v0/notify'
  , body: /^.+$/ //@TODO should be a combination of notifyBody plus any others
}
```
<!-- END config-builder.js -->




## Heroku

Once Heroku is set up, you can check for current environment (config) variables:  
`$ heroku run printenv`  

You’ll need to choose an admin username and password, and record it in the
`OOMPSH_ADMIN_CREDENTIALS` config var:  
`$ heroku config:set OOMPSH_ADMIN_CREDENTIALS=<admin-username>:<admin-password>`

You can define any number of admin credentials this way, eg:  
`$ heroku config:set OOMPSH_ADMIN_CREDENTIALS=jo:pw,sam:pass,pat:foobar`  
Note that oompsh.js throws an error on startup if any credentials are invalid.

After each `$ git commit` and `$ git push`, you should redeploy the app:  
`$ git push heroku master`
