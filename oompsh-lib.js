//// oompsh-lib.js //// 0.1.5 //// Code shared by browsers and servers /////////
//// The global OOMPSH namespace, with configuration, API and utilities ////////

!function(ROOT){




//// DEVELOPER-EDITABLE CONFIG

const
    //// Can be used as a default value in frontend UIs.
    remoteURL = 'https://oompsh.herokuapp.com'

    //// Validators for the first character of a username or password, and for
    //// subsequent characters.
  , c1 = '[a-zA-Z0-9!()_`~@\'"^]' // not allowed to start with . or -
  , c2 = '[a-zA-Z0-9!()_`~@\'"^.-]'

    //// Initial values for the server’s ‘very very verbose’ and ‘very verbose’.
    vvv = false      // very very verbose logging
  , vv = vvv || true // very verbose logging (always true if `vvv` is true)




//// NAMESPACE

const OOMPSH = ROOT.OOMPSH = {




    //// CONFIGURATION
    VERSION: '0.1.5' // the major part of this is also the API version, `APIV`
  , get APIV () { return 'v' + OOMPSH.VERSION.split('.')[0] }
  , remoteURL


    //// API
  , api: {
        enduser: {
            GET:  [ 'version', 'browse', 'read' ]
          , POST: [ 'edit', 'add', 'delete', 'notify' ]
        }
      , admin: { // admins can do everything endusers can do, plus...
            GET:  [ 'version' ]
          , POST: [ 'soft-disconnect', 'hard-disconnect', 'notify' ]
        }
      , status: { // the server responds with one of these HTTP status codes:
            200: 'OK' //@TODO proper message
          , 201: 'OK' //@TODO proper message
          , 401: 'UNAUTHORIZED'
          , 404: 'NOT FOUND'
          , 405: 'METHOD NOT ALLOWED'
          , 406: 'NOT ACCEPTABLE'
          , 501: 'NOT IMPLEMENTED'
        }
    }


}//OOMPSH




//// VALIDATORS

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
      + OOMPSH.api.admin.GET.join('|') + '|'
      + OOMPSH.api.admin.POST.join('|') + '|'
      + OOMPSH.api.enduser.GET.join('|') + '|'
      + OOMPSH.api.enduser.POST.join('|')
      + `)$` )
  , target: /^.+$/ //@TODO
  , body:   /^.+$/ //@TODO
}




}('object' === typeof global ? global : this)
