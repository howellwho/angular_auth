// require express and other modules
var express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    hbs = require('hbs'),
    mongoose = require('mongoose'),
    auth = require('./resources/auth');

// require and load dotenv
require('dotenv').load();

// configure bodyParser (for receiving form data)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// serve static files from public folder
app.use(express.static(__dirname + '/public'));

// set view engine to hbs (handlebars)
app.set('view engine', 'hbs');

// connect to mongodb
mongoose.connect('mongodb://localhost/angular_auth');

// require User and Post models
var User = require('./models/user');
var Post = require('./models/post');
/*
 * API Routes
 */

app.get('/api/me', auth.ensureAuthenticated, function (req, res) {
  User.findById(req.user, function (err, user) {
    res.send(user.populate('posts'));
  });
});

app.put('/api/me', auth.ensureAuthenticated, function (req, res) {
  User.findById(req.user, function (err, user) {
    if (!user) {
      return res.status(400).send({ message: 'User not found.' });
    }
    user.displayName = req.body.displayName || user.displayName;
    user.username = req.body.username || user.username;
    user.email = req.body.email || user.email;
    user.save(function(err) {
      res.send(user);
    });
  });
});

app.get('/api/posts', function (req, res) {
  Post.find({}, function(err, posts){
    console.log(posts);
    res.json(posts)
  })
});

app.post('/api/posts', auth.ensureAuthenticated, function(req, res){
  var newPost = req.body;
  if (newPost === null) {
    res.send('error');
  } else {
    console.log(newPost);
    User.findById(req.user, function(err, user) {
      console.log(req.user);
      Post.create(newPost, function(err, post){
        user.posts.push(post);
        console.log(user);
        user.save();
        res.json(post)

      })
    })
  }
})

/*
 * Auth Routes
 */

app.post('/auth/signup', function (req, res) {
  User.findOne({ email: req.body.email }, function (err, existingUser) {
    if (existingUser) {
      return res.status(409).send({ message: 'Email is already taken.' });
    }
    var user = new User({
      displayName: req.body.displayName,
      username: req.body.username,
      email: req.body.email,
      password: req.body.password
    });
    user.save(function (err, result) {
      if (err) {
        res.status(500).send({ message: err.message });
      }
      res.send({ token: auth.createJWT(result) });
    });
  });
});

app.post('/auth/login', function (req, res) {
  User.findOne({ email: req.body.email }, '+password', function (err, user) {
    if (!user) {
      return res.status(401).send({ message: 'Invalid email or password.' });
    }
    user.comparePassword(req.body.password, function (err, isMatch) {
      if (!isMatch) {
        return res.status(401).send({ message: 'Invalid email or password.' });
      }
      res.send({ token: auth.createJWT(user) });
    });
  });
});


/*
 * Catch All Route
 */
app.get(['/', '/signup', '/login', '/profile'], function (req, res) {
  res.render('index');
});


/*
 * Listen on localhost:3000
 */
app.listen(9000, function() {
  console.log('server started');
});
