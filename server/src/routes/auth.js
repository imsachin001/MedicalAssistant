import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { getJwtSecret, requireAuth } from '../middleware/auth.js';

const router = express.Router();
const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

function getGoogleRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI
    || 'http://localhost:5000/api/auth/google/callback';
}

function getClientOrigin() {
  return process.env.CLIENT_ORIGIN || 'http://localhost:5173';
}

function parseCookie(req, name) {
  const cookie = (req.headers.cookie || '').split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

async function findOrCreateGoogleUser(payload) {
  if (!payload?.email || !payload.email_verified) return null;

  const email = payload.email.toLowerCase();
  let user = await User.findOne({
    $or: [{ googleId: payload.sub }, { email }]
  });

  if (user) {
    let changed = false;
    if (!user.googleId) {
      user.googleId = payload.sub;
      changed = true;
    }
    if (user.authProvider !== 'google') {
      user.authProvider = 'google';
      changed = true;
    }
    if (payload.name && user.name !== payload.name) {
      user.name = payload.name;
      changed = true;
    }
    if (changed) await user.save();
  } else {
    user = await User.create({
      name: String(payload.name || email.split('@')[0]).trim().slice(0, 80),
      email,
      googleId: payload.sub,
      authProvider: 'google'
    });
  }

  return user;
}

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email };
}

function signToken(user) {
  return jwt.sign(
    { sub: String(user._id), email: user.email },
    getJwtSecret(),
    { expiresIn: '7d', issuer: 'doctalk' }
  );
}

router.post('/signup', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (name.length > 80) {
      return res.status(400).json({ error: 'Name is too long' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });
    const token = signToken(user);

    return res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Could not create account' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    return res.json({ token, user: publicUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Could not log in' });
  }
});

router.post('/google', async (req, res) => {
  if (!googleClient) {
    return res.status(503).json({ error: 'Google login is not configured on the server' });
  }

  const credential = String(req.body.credential || '');
  if (!credential) {
    return res.status(400).json({ error: 'Google credential is required' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const user = await findOrCreateGoogleUser(ticket.getPayload());
    if (!user) {
      return res.status(401).json({ error: 'Google account email could not be verified' });
    }

    const token = signToken(user);
    return res.json({ token, user: publicUser(user) });
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(401).json({ error: 'Google login failed or credential was invalid' });
  }
});

router.get('/google/redirect', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      error: 'Google redirect login is not configured on the server'
    });
  }

  const state = crypto.randomBytes(32).toString('hex');
  const secure = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `google_oauth_state=${encodeURIComponent(state)}; HttpOnly; SameSite=Lax; Path=/api/auth/google; Max-Age=600${secure ? '; Secure' : ''}`);

  const redirectClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getGoogleRedirectUri()
  );

  const authorizationUrl = redirectClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'select_account',
    scope: ['openid', 'email', 'profile'],
    state
  });

  return res.redirect(authorizationUrl);
});

router.get('/google/callback', async (req, res) => {
  const clientOrigin = getClientOrigin();

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${clientOrigin}/#auth_error=Google%20login%20is%20not%20configured`);
  }

  const savedState = parseCookie(req, 'google_oauth_state');
  if (!req.query.state || !savedState || req.query.state !== savedState) {
    return res.redirect(`${clientOrigin}/#auth_error=Invalid%20OAuth%20state`);
  }

  if (req.query.error) {
    return res.redirect(`${clientOrigin}/#auth_error=Google%20login%20was%20cancelled`);
  }

  if (!req.query.code) {
    return res.redirect(`${clientOrigin}/#auth_error=Google%20did%20not%20return%20an%20authorization%20code`);
  }

  try {
    const redirectClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      getGoogleRedirectUri()
    );
    const { tokens } = await redirectClient.getToken(String(req.query.code));

    if (!tokens.id_token) {
      return res.redirect(`${clientOrigin}/#auth_error=Google%20did%20not%20return%20an%20ID%20token`);
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const user = await findOrCreateGoogleUser(ticket.getPayload());

    if (!user) {
      return res.redirect(`${clientOrigin}/#auth_error=Google%20account%20email%20could%20not%20be%20verified`);
    }

    const token = signToken(user);
    res.setHeader('Set-Cookie', 'google_oauth_state=; HttpOnly; SameSite=Lax; Path=/api/auth/google; Max-Age=0');
    return res.redirect(
      `${clientOrigin}/#google_token=${encodeURIComponent(token)}&google_user=${encodeURIComponent(JSON.stringify(publicUser(user)))}`
    );
  } catch (error) {
    console.error('Google callback error:', error);
    return res.redirect(`${clientOrigin}/#auth_error=Google%20login%20failed`);
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return res.status(500).json({ error: 'Could not load account' });
  }
});

export default router;
