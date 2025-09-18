import express from 'express';
import cors from 'cors';
import chatRoute from './src/routes/chat.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'DocTalk backend is running!' });
});

app.use('/api/chat', chatRoute);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
