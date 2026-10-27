import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  role: {
    type: String,
    enum: ['OPERATOR', 'QA_QC_MANAGER', 'AUDITOR', 'ADMIN'],
    default: 'OPERATOR',
    required: true
  },
  department: { type: String, default: 'Manufacturing Plant' },
  employeeId: { type: String, required: true },
  passwordHash: { type: String, required: true },
  pinHash: { type: String, required: true },
  active: { type: Boolean, default: true }
}, {
  timestamps: true,
  collection: 'users'
});

export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
export default UserModel;
