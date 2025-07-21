const mongoose = require('mongoose');

const actionLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ActionLog', actionLogSchema);