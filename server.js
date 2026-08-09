const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files from this directory
app.use(express.static(__dirname));

// In-memory storage (demo only)
const users = [];
const blogs = [];

function findUserByToken(token) {
  return users.find(u => u.token === token);
}

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ message: 'Email already registered' });
  }

  const salt = bcrypt.genSaltSync(8);
  const hash = bcrypt.hashSync(password, salt);

  const user = {
    id: users.length + 1,
    name,
    email,
    passwordHash: hash,
    createdAt: new Date().toISOString()
  };

  users.push(user);

  res.json({ message: 'User registered', user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = bcrypt.compareSync(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  // Create a simple token for demo purposes
  const token = crypto.randomBytes(24).toString('hex');
  user.token = token;

  res.json({ message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/blogs', (req, res) => {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ message: 'Missing token' });

  const token = match[1];
  const user = findUserByToken(token);
  if (!user) return res.status(401).json({ message: 'Invalid token' });

  const { title, author, category, image, content } = req.body;
  if (!title || !content) return res.status(400).json({ message: 'Missing title or content' });

  const blog = {
    id: blogs.length + 1,
    title,
    author: author || user.name,
    category: category || '',
    image: image || '',
    content,
    userId: user.id,
    createdAt: new Date().toISOString()
  };

  blogs.push(blog);

  res.json({ message: 'Blog created', blog });
});

app.get('/api/blogs', (req, res) => {
  res.json(blogs.slice().reverse());
});

app.get('/api/me', (req, res) => {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ message: 'Missing token' });
  const token = match[1];
  const user = findUserByToken(token);
  if (!user) return res.status(401).json({ message: 'Invalid token' });

  res.json({ id: user.id, name: user.name, email: user.email });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
