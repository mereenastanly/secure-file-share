const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  s3Key: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('File', fileSchema);