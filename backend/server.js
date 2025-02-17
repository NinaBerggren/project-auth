import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import tedTalkData from './data/ted-talksMod.json';

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/project-auth';
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;

const listEndpoints = require('express-list-endpoints');

// Defines the port the app will run on. Defaults to 8080, but can be overridden
// when starting the server. Example command to overwrite PORT env variable value:
// PORT=9000 npm start
const port = process.env.PORT || 8080;
const app = express();

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(express.json());

// Middleware set up for error msg like DB down.
app.use((req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    next();
  } else {
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// ------- User schema and model
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  // npm install crypto, import
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  }
});

const User = mongoose.model('User', UserSchema);

// ----------- TED Talk model for content -------
const TedTalk = mongoose.model('TedTalk', {
  talk_id: Number,
  title: String,
  speaker: String,
  recorded_date: String,
  published_date: String,
  event: String,
  duration: Number,
  views: Number,
  likes: Number
});

// Resetting DataBase on demand
if (process.env.RESET_DB) {
  console.log('Resetting database!');

  const resetDataBase = async () => {
    await TedTalk.deleteMany({});
    tedTalkData.forEach((singleTedTalk) => {
      const newTedTalk = new TedTalk(singleTedTalk);
      newTedTalk.save();
    });
  };
  resetDataBase();
}

const authenticateUser = async (req, res, next) => {
  const accessToken = req.header('Authorization');
  try {
    const user = await User.findOne({ accessToken: accessToken });
    if (user) {
      next();
    } else {
      res.status(401).json({
        response: 'Please log in',
        success: false
      });
    }
  } catch (error) {
    res.status(400).json({
      response: error,
      success: false
    });
  }
};

// ------- ROUTES ----------

app.get('/', (req, res) => {
  res.json(listEndpoints(app));
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const salt = bcrypt.genSaltSync();
    if (password.length < 8) {
      res.status(400).json({
        success: false,
        response: 'Password need to be at least 8 characters long'
      });
    } else {
      const newUser = await new User({
        username: username,
        password: bcrypt.hashSync(password, salt)
      }).save();
      res.status(201).json({
        success: true,
        response: {
          username: newUser.username,
          accessToken: newUser.accessToken,
          id: newUser._id
        }
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      response: error.message
    });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(200).json({
        success: true,
        response: {
          username: user.username,
          id: user._id,
          accessToken: user.accessToken
        }
      });
    } else {
      // 400 error on client side
      res.status(400).json({
        success: false,
        response: "Credentials didn't match"
      });
    }
  } catch (error) {
    // error on server side
    res.status(500).json({
      success: false,
      response: error
    });
  }
});

// Route Returns top 10 most viewed TED Talks
app.get('/top10Views', authenticateUser);
app.get('/top10Views', async (req, res) => {
  try {
    const mostViews = await TedTalk.find({}).sort({ views: -1 }).limit(10);
    if (mostViews) {
      res.status(200).json({
        success: true,
        body: mostViews
      });
    }
  } catch (error) {
    res.status(400).json({
      body: {
        message: 'bad request',
        success: false
      }
    });
  }
});

// Route to get details about a specific TED Talk
app.get('/speaker/:id', authenticateUser);
app.get('/speaker/:id', async (req, res) => {
  try {
    const speaker = await TedTalk.findOne({ talk_id: req.params.id });
    console.log(speaker);

    if (speaker) {
      res.status(200).json({
        success: true,
        body: speaker
      });
    }
  } catch (error) {
    res.status(400).json({
      body: {
        message: 'bad request',
        success: false
      }
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
