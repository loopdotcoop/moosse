# Oompsh

#### A Node.js server which adds realtime push notification to Oom apps

+ __Last update:__  2018/04/06 <!-- OOMBUMPABLE -->
+ __Version:__      0.0.7 <!-- OOMBUMPABLE -->

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

At a minimum, you will need to define the OOMPSH_AUTH0 config var:  
`$ heroku config:set OOMPSH_AUTH0=my-username:my-password`  
…choose your own username and password here!

You can define up to ten admin authentications this way, from `OOMPSH_AUTH0` to
`OOMPSH_AUTH9`.

After each new `$ git commit` and `$ git push`, you should redeploy the app:  
`$ git push heroku master`
