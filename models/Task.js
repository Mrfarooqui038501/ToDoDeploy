const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String },
  status: { type: String, enum: ['Todo', 'In Progress', 'Done'], default: 'Todo' },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  assignedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastModified: { type: Date, default: Date.now },
  version: { type: Number, default: 1 },
});

module.exports = mongoose.model('Task', taskSchema);