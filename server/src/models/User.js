import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254
  },
  passwordHash: { type: String, select: false },
  googleId: { type: String, unique: true, sparse: true, index: true },
  authProvider: { type: String, enum: ['password', 'google'], default: 'password' }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
