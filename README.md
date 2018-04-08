# Oompsh

#### A Node.js server which adds realtime push notification to Oom apps

+ __Last update:__  2018/04/08
+ __Version:__      0.1.3

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
