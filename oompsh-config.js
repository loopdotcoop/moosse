//// oompsh-config.js //// 0.2.0 //// Config shared by browsers and servers ////

/**
## Namespace

The global namespace is `window.OOMPSH` in a browser, or `global.OOMPSH` in the
Node.js server.

*/ !function(ROOT){

ROOT.OOMPSH = {}

}('object' === typeof global ? global : this) /**



## Configuration

*/ !function(ROOT){

ROOT.OOMPSH.configuration = {

    VERSION: '0.2.0' // the major part of this is also the API version, `APIV`
  , get APIV () { return 'v' + ROOT.OOMPSH.configuration.VERSION.split('.')[0] }

    //// Used as one of the default `domain` values in the frontend UI.
  , remoteURL: 'https://oompsh.herokuapp.com'

    //// Part of the response with a 404 NOT FOUND error.
  , docsURL: 'https://github.com/loopdotcoop/oompsh#api'

    //// Validators for the first character of a username or password, and for
    //// subsequent characters.
  , c1: '[a-zA-Z0-9!()_`~@\'"^]' // not allowed to start with . or -
  , c2: '[a-zA-Z0-9!()_`~@\'"^.-]'

    //// Initial values for the server’s ‘very very verbose’ and ‘very verbose’.
  , vvv: false // very very verbose logging
  , vv:  true  // very verbose logging (must be true if `vvv` is true)

}

}('object' === typeof global ? global : this) /**




## API

Request URLs can have up to four parts:
1. Oompsh __API version,__ currently `v0`. This is the only mandatory part
2. __Credentials,__ in the form `<my-username>:<my-password>`. Oompsh expects HTTPS!
3. An __action,__ eg `version`, `begin` or `notify`
4. A __filter,__ eg `all`, `admin`, `enduser`, or an SSE client ID, eg `a1b2c3` _[@TODO ID filter]_

Requests must be sent with the correct method for that action, either `GET` or `POST`. All
`POST` requests require credentials.

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


*/ !function(ROOT){

const OOMPSH = ROOT.OOMPSH
const api = ROOT.OOMPSH.api = {
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
  , admin: { // admins can do everything endusers can do, plus...
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
        }
    }
  , status: { // the server responds with one of these HTTP status codes:
        200: 'OK'
      , 401: 'UNAUTHORIZED' // nb, we don’t send a 'WWW-Authenticate' header
      , 404: 'NOT FOUND'
      , 405: 'METHOD NOT ALLOWED'
      , 406: 'NOT ACCEPTABLE'
      // , 500: 'INTERNAL SERVER ERROR'
      , 501: 'NOT IMPLEMENTED'
    }
}

//// Duplicate all enduser actions to admin.
api.admin.GET  = Object.assign({}, api.enduser.GET, api.admin.GET)
api.admin.POST = Object.assign({}, api.enduser.POST, api.admin.POST)

}('object' === typeof global ? global : this) /**




## Validators

*/ !function(ROOT){

const OOMPSH = ROOT.OOMPSH
    , { c1, c2 } = OOMPSH.configuration
    , { admin, enduser } = OOMPSH.api

OOMPSH.valid = {
    local:  /^https?:\/\/(127\.0\.0\.1|localhost)/
  , domain: /^https?:\/\/[-:.a-z0-9]+\/?$/

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
  , filter: /^.+$/ //@TODO
  , body:   /^.+$/ //@TODO

  , oompshID: /^\d[a-z\d]{6}$/ // a digit, then six digits or lowercase letters
  , standardFilter: /^(\d[a-z\d]{6})|(admin|enduser|all)$/
}

}('object' === typeof global ? global : this) /**
Built by config-builder.js */