console.clear();
const express = require('express');
const session = require('express-session');
const handlebars = require('express-handlebars');
const {v4: uuid } = require('uuid');
const fs = require('fs');
const { Session } = require('inspector');

const app = express();
const PORT = 3000;

// Middlewares
app.use(express.urlencoded({extended: true}));
app.use(session({
    secret: "HayMiMadreElBicho",
    resave: false,
    saveUninitialized: false
}));
app.set('views', __dirname);
app.engine('hbs', handlebars({
    defaultLayout: 'main',
    layoutsDir: __dirname,
    extname: '.hbs'
}));
app.set('view engine', 'hbs');

const login = (req,res, next) => {
    if(!req.session.userId){
        res.redirect('/login');
    }else{
        next();
    }
}

// CSRF

const tokens = new Map();

const csrfToken = (sessionId) => {
    let token = uuid();
    tokens.get(sessionId).add(token);
    /* setTimeout(() => tokens.get(SessionId).delete(token),30000); */
    return token;
}

const csrf = (req,res,next) => {
    const token = req.body.csrf;
    if(!token || !tokens.get(req.sessionID.has(token))){
        res.status(422).send('CSRF Token missing or expired');
    }else{
        next();
    }
}

// Db

const users = JSON.parse(fs.readFileSync('./db.json'));

// Routes

app.get('/home', login, (req, res) => {
    res.send(`
        <p>Home page, must be logged in to access</p>
        <a href="/edit">edit</a>
    `);
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    if(!req.body.email || !req.body.password){ return res.status(400).send('Fill all the fields')};
    const user = users.find(e => e.email === req.body.email);
    if(!user || user.password !== req.body.password){
        return res.status(400).send('Invalid credentials');
    }
    req.session.userId = user.id;
    tokens.set(req.sessionID, new Set())
    console.log(req.session);
    res.redirect('/home');
});

app.get('/logout', login, (req,res) => {
    req.session.destroy();
    res.send('logged out <a href="/login">login</a>')
})

app.get('/edit', login, (req, res) => {
    res.render('edit', {token: csrfToken(req.sessionID)});
})

app.post('/edit', login, csrf, (req, res) => {
    console.log(req.get('origin'));
    const user = users.find(user => user.id === req.session.userId);
    user.email = req.body.email;
    console.log(`User ${user.id} email change to ${user.email}`);

    res.send(`Email changed to ${user.email}`);
})

// Server
app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
})
