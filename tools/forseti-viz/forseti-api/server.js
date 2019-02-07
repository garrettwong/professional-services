'use strict';

// express 4.0
const express = require('express');

import api from './server/api';
import config from './server/config.json';

// setup app
const app = express();
app.set('view engine', 'pug');
app.use(express.static('public')); // images,css,etc.

app.all('*', function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

// set up /api routes
app.use('/api', api({
  config
}));

// set up / main route
app.get('/', (req, res) => {
  res.render('index', {
    title: `Hello World`
  });
});

// test routes
app.get('/home', function (req, res) {
  res.send('GET: ' + req.url);
});

app.post('/home', function (req, res) {
  res.send('POST: ' + req.url);
});



// initialize app
app.listen(config.port, config.host);
console.log(`Running on http://${config.host}:${config.port}`);