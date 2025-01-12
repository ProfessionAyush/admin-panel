const express = require('express');

const app = express();
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('connect-flash');
const bodyParser = require('body-parser');
const Admin = require('./models/admin');



// DB Config
mongoose.connect("mongodb://127.0.0.1:27017/admin_database");


// Middleware setup
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());



// Middleware to parse URL-encoded and JSON bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Express session
app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));
// Connect flash
app.use(flash());
// Passport middleware
app.use(passport.initialize());
app.use(passport.session());
// Passport Config
passport.use(new LocalStrategy(Admin.authenticate()));
passport.serializeUser(Admin.serializeUser());
passport.deserializeUser(Admin.deserializeUser());


// Global variables
app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});


// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routes
app.use('/', require('./routes/index'));

// Set the port directly
const PORT = 5000;
app.listen(PORT, console.log(`Server started on port ${PORT}`));

module.exports = app;