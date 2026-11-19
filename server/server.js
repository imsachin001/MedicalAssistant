import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import mongoose from 'mongoose';
import chatRoute from './src/routes/chat.js';
import authRoute from './src/routes/auth.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medicalai', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(error => console.error('MongoDB connection error:', error));

app.get('/', (req, res) => {
  res.json({ message: 'DocTalk backend is running!' });
});

app.use('/api/chat', chatRoute);
app.use('/api/auth', authRoute);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
