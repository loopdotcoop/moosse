const server = (req, res) => {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain')
    res.end('This is Oompsh ' + require('./package.json').version + '\n')
}
const app = require('http').createServer(server)
const port = process.env.PORT || 3000 // Heroku sets $PORT
app.listen( port, () => console.log(`App is listening on port ${port}`) )
