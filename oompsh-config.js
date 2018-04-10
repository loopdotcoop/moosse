//// oompsh-config.js //// 0.1.8 //// Config shared by browsers and servers ////

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

    VERSION: '0.1.8' // the major part of this is also the API version, `APIV`
  , get APIV () { return 'v' + ROOT.OOMPSH.configuration.VERSION.split('.')[0] }

    //// Used as one of the default `domain` values in the frontend UI.
  , remoteURL: 'https://oompsh.herokuapp.com'

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

*/ !function(ROOT){

const OOMPSH = ROOT.OOMPSH
const api = ROOT.OOMPSH.api = {
    enduser: {
        GET:  {
            '':        { eg:'GET /v0/'
                      , tip:'Retrieves a description of the API' }
          , 'version': { eg:'GET /v0/version'
                      , tip:'Shows the app’s name and version' }
          , 'begin':   { eg:"let es = new EventSource('v0/connect')"
                      , tip:'Starts a new SSE session' }
        }
      , POST: { }
    }
  , admin: { // admins can do everything endusers can do, plus...
        GET:  { }
      , POST: {
            'soft-end': { eg:'POST /v0/usr:pwd/soft-disconnect/all'
                       , tip:'Asks SSE clients to close' }
          , 'hard-end': { eg:'POST /v0/usr:pwd/hard-disconnect/all'
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
api.admin.GET  = Object.assign(api.admin.GET, api.enduser.GET)
api.admin.POST = Object.assign(api.admin.POST, api.enduser.POST)

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
  , target: /^.+$/ //@TODO
  , body:   /^.+$/ //@TODO
}

}('object' === typeof global ? global : this) /**
Built by config-builder.js */