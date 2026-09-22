const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const s3 = require('./config/s3');
const { validateFile } = require('./utils/fileValidation');

const User = require('./models/User');
const File = require('./models/File');
const Folder = require('./models/Folder');
const verifyToken = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running!' });
});

// REGISTER
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET CURRENT USER (protected)
app.get('/api/auth/me', verifyToken, async (req, res) => {
  const user = await User.findById(req.userId).select('-password');
  res.json(user);
});

// REQUEST UPLOAD URL (protected)
app.post('/api/upload/request-url', verifyToken, async (req, res) => {
  try {
    const { filename, mimeType, fileSize } = req.body;
    const validation = validateFile(filename, mimeType, fileSize);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.reason });
    }
    const s3Key = `${req.userId}/${uuidv4()}-${filename}`;
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      ContentType: mimeType,
    });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    res.json({ uploadUrl, s3Key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CONFIRM UPLOAD (protected)
app.post('/api/upload/confirm', verifyToken, async (req, res) => {
  try {
    const { filename, s3Key, mimeType, size, folder } = req.body;
    const newFile = new File({
      filename,
      s3Key,
      mimeType,
      size,
      owner: req.userId,
      folder: folder || null,
    });
    await newFile.save();
    res.status(201).json({ message: 'File saved', file: newFile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// LIST MY FILES (protected)
app.get('/api/files', verifyToken, async (req, res) => {
  try {
    const files = await File.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET DOWNLOAD URL (protected)
app.get('/api/files/:id/download', verifyToken, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    if (file.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to access this file' });
    }
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: file.s3Key,
    });
    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    res.json({ downloadUrl, filename: file.filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE A FILE (protected)
app.delete('/api/files/:id', verifyToken, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    if (file.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this file' });
    }
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: file.s3Key,
    }));
    await File.findByIdAndDelete(req.params.id);
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE FOLDER (protected)
app.post('/api/folders', verifyToken, async (req, res) => {
  try {
    const { name, parentFolder } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Folder name is required' });
    }
    const newFolder = new Folder({
      name,
      owner: req.userId,
      parentFolder: parentFolder || null,
    });
    await newFolder.save();
    res.status(201).json(newFolder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// LIST FOLDERS AND FILES INSIDE A FOLDER (or top-level if none given)
app.get('/api/folders/contents', verifyToken, async (req, res) => {
  try {
    const parentFolder = req.query.parentFolder || null;
    const folders = await Folder.find({ owner: req.userId, parentFolder });
    const files = await File.find({ owner: req.userId, folder: parentFolder });
    res.json({ folders, files });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE FOLDER (protected) — only if empty
app.delete('/api/folders/:id', verifyToken, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    if (folder.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const hasFiles = await File.exists({ folder: folder._id });
    const hasSubfolders = await Folder.exists({ parentFolder: folder._id });
    if (hasFiles || hasSubfolders) {
      return res.status(400).json({ message: 'Folder is not empty' });
    }
    await Folder.findByIdAndDelete(req.params.id);
    res.json({ message: 'Folder deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});