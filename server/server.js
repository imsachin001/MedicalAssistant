import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import mongoose from 'mongoose';
import chatRoute from './src/routes/chat.js';
import authRoute from './src/routes/auth.js';

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',
  'https://doctalkai.vercel.app',
  ...(process.env.CLIENT_ORIGIN ? [process.env.CLIENT_ORIGIN] : [])
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

const mongoUri = process.env.MONGODB_URI;

if (process.env.NODE_ENV === 'production' && !mongoUri) {
  throw new Error('MONGODB_URI is required in production');
}

const startServer = async () => {
  try {
    await mongoose.connect(mongoUri || 'mongodb://localhost:27017/medicalai');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
};

app.get('/', (req, res) => {
  res.json({ message: 'DocTalk backend is running!' });
});

app.use('/api/chat', chatRoute);
app.use('/api/auth', authRoute);

startServer();
