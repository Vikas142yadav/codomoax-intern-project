const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.MONGODB_DB || 'codomax';
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_production';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.options('*', cors({ origin: '*' }));
app.use(express.static(__dirname));

let usersCollection;
let blogsCollection;

class InMemoryCollection {
  constructor(items = []) {
    this.items = items;
  }

  async findOne(filter) {
    return this.items.find((item) => this.matchesFilter(item, filter)) || null;
  }

  async insertOne(doc) {
    const newItem = { ...doc, _id: new ObjectId() };
    this.items.push(newItem);
    return { insertedId: newItem._id };
  }

  async updateOne(filter, update) {
    const item = await this.findOne(filter);
    if (!item) return { matchedCount: 0, modifiedCount: 0 };
    if (update.$set) {
      Object.assign(item, update.$set);
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async deleteOne(filter) {
    const index = this.items.findIndex((item) => this.matchesFilter(item, filter));
    if (index === -1) return { deletedCount: 0 };
    this.items.splice(index, 1);
    return { deletedCount: 1 };
  }

  find(filter = {}) {
    const self = this;
    const filteredItems = self.items.filter((item) => self.matchesFilter(item, filter));
    return {
      sort(sortObj) {
        const sorted = [...filteredItems];
        const keys = Object.keys(sortObj);
        if (keys.length) {
          sorted.sort((a, b) => {
            for (const key of keys) {
              const direction = sortObj[key];
              if (a[key] < b[key]) return -1 * direction;
              if (a[key] > b[key]) return 1 * direction;
            }
            return 0;
          });
        }
        return {
          toArray: async () => sorted
        };
      }
    };
  }

  async createIndex() {
    return;
  }

  matchesFilter(item, filter) {
    return Object.entries(filter).every(([key, value]) => {
      if (key === '$or') {
        return Array.isArray(value) && value.some((condition) => this.matchesFilter(item, condition));
      }
      if (key === '$and') {
        return Array.isArray(value) && value.every((condition) => this.matchesFilter(item, condition));
      }

      const actual = item[key];
      if (value instanceof ObjectId) {
        return actual && actual.toString() === value.toString();
      }
      if (value instanceof RegExp) {
        return value.test(actual || '');
      }
      if (typeof value === 'object' && value !== null) {
        if ('$regex' in value) {
          const regex = new RegExp(value.$regex, value.$options || '');
          return regex.test(actual || '');
        }
        if ('$in' in value) {
          return Array.isArray(value.$in) && value.$in.some((option) => {
            if (option instanceof ObjectId) {
              return actual && actual.toString() === option.toString();
            }
            return actual === option;
          });
        }
        return false;
      }
      return actual === value;
    });
  }
}

function mapUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email
  };
}

function mapBlog(blog) {
  return {
    id: blog._id.toString(),
    title: blog.title,
    author: blog.author,
    category: blog.category,
    image: blog.image,
    content: blog.content,
    userId: blog.userId ? blog.userId.toString() : null,
    createdAt: blog.createdAt,
    updatedAt: blog.updatedAt
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getTokenFromHeader(req) {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

async function getUserFromToken(req) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || !payload.id) return null;
  try {
    return await usersCollection.findOne({ _id: new ObjectId(payload.id) });
  } catch (e) {
    return null;
  }
}

async function findUserByToken(token) {
  if (!token || !usersCollection) return null;
  const payload = verifyToken(token);
  if (!payload || !payload.id) return null;
  try {
    return await usersCollection.findOne({ _id: new ObjectId(payload.id) });
  } catch (e) {
    return null;
  }
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!name || !normalizedEmail || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  try {
    const existing = await usersCollection.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const newUser = {
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date().toISOString()
    };
    const result = await usersCollection.insertOne(newUser);
    res.json({ message: 'User registered', user: { id: result.insertedId.toString(), name: newUser.name, email: normalizedEmail } });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ message: 'Unable to create account' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await usersCollection.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const valid = bcrypt.compareSync(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token, user: mapUser(user) });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ message: 'Unable to log in' });
  }
});

app.post('/api/blogs', async (req, res) => {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ message: 'Missing token' });
  const token = match[1];
  const user = await findUserByToken(token);
  if (!user) return res.status(401).json({ message: 'Invalid token' });
  const { title, author, category, image, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required' });
  }
  try {
    const blog = {
      title,
      author: author?.trim() ? author.trim() : user.name,
      category: category?.trim() ? category.trim() : 'General',
      image: image?.trim() || '',
      content,
      userId: user._id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const result = await blogsCollection.insertOne(blog);
    res.json({ message: 'Blog created', blog: mapBlog({ ...blog, _id: result.insertedId }) });
  } catch (err) {
    console.error('Create blog error', err);
    res.status(500).json({ message: 'Unable to create blog' });
  }
});

app.get('/api/blogs', async (req, res) => {
  try {
    const { search, category, mine } = req.query;
    const query = {};

    if (category && category.trim()) {
      query.category = { $regex: `^${escapeRegex(category.trim())}$`, $options: 'i' };
    }

    if (search && search.trim()) {
      const regex = { $regex: escapeRegex(search.trim()), $options: 'i' };
      query.$or = [
        { title: regex },
        { content: regex },
        { author: regex },
        { category: regex }
      ];
    }

    if (mine === 'true') {
      const user = await getUserFromToken(req);
      if (!user) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      query.userId = user._id;
    }

    const posts = await blogsCollection.find(query).sort({ createdAt: -1 }).toArray();
    res.json(posts.map(mapBlog));
  } catch (err) {
    console.error('Fetch blogs error', err);
    res.status(500).json({ message: 'Unable to load blogs' });
  }
});

app.get('/api/blogs/:id/edit', async (req, res) => {
  try {
    const blogId = req.params.id;
    if (!ObjectId.isValid(blogId)) {
      return res.status(400).json({ message: 'Invalid blog ID' });
    }
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Missing or invalid token' });
    }

    const blog = await blogsCollection.findOne({ _id: new ObjectId(blogId) });
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    if (!blog.userId || blog.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to edit this blog' });
    }

    res.json(mapBlog(blog));
  } catch (err) {
    console.error('Fetch edit blog error', err);
    res.status(500).json({ message: 'Unable to load blog for edit' });
  }
});

app.put('/api/blogs/:id', async (req, res) => {
  try {
    const blogId = req.params.id;
    if (!ObjectId.isValid(blogId)) {
      return res.status(400).json({ message: 'Invalid blog ID' });
    }

    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Missing or invalid token' });
    }

    const existingBlog = await blogsCollection.findOne({ _id: new ObjectId(blogId) });
    if (!existingBlog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    if (!existingBlog.userId || existingBlog.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to update this blog' });
    }

    const { title, author, category, image, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const updatedBlog = {
      title,
      author: author?.trim() ? author.trim() : user.name,
      category: category?.trim() ? category.trim() : 'General',
      image: image?.trim() || '',
      content,
      updatedAt: new Date().toISOString()
    };

    await blogsCollection.updateOne({ _id: existingBlog._id }, { $set: updatedBlog });
    res.json({ message: 'Blog updated', blog: mapBlog({ ...existingBlog, ...updatedBlog, _id: existingBlog._id }) });
  } catch (err) {
    console.error('Update blog error', err);
    res.status(500).json({ message: 'Unable to update blog' });
  }
});

app.delete('/api/blogs/:id', async (req, res) => {
  try {
    const blogId = req.params.id;
    if (!ObjectId.isValid(blogId)) {
      return res.status(400).json({ message: 'Invalid blog ID' });
    }

    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Missing or invalid token' });
    }

    const existingBlog = await blogsCollection.findOne({ _id: new ObjectId(blogId) });
    if (!existingBlog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    if (!existingBlog.userId || existingBlog.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to delete this blog' });
    }

    await blogsCollection.deleteOne({ _id: existingBlog._id });
    res.json({ message: 'Blog deleted' });
  } catch (err) {
    console.error('Delete blog error', err);
    res.status(500).json({ message: 'Unable to delete blog' });
  }
});

app.get('/api/blogs/:id', async (req, res) => {
  try {
    const blogId = req.params.id;
    if (!ObjectId.isValid(blogId)) {
      return res.status(400).json({ message: 'Invalid blog ID' });
    }
    const blog = await blogsCollection.findOne({ _id: new ObjectId(blogId) });
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.json(mapBlog(blog));
  } catch (err) {
    console.error('Fetch blog error', err);
    res.status(500).json({ message: 'Unable to load blog' });
  }
});

app.get('/api/me', async (req, res) => {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ message: 'Missing token' });
  const token = match[1];
  const user = await findUserByToken(token);
  if (!user) return res.status(401).json({ message: 'Invalid token' });
  res.json(mapUser(user));
});

// Internal helper: remove smoke-test blogs (dev only)
app.delete('/internal/cleanup-smoke', async (req, res) => {
  try {
    if (!blogsCollection) return res.status(500).json({ message: 'No blogs collection' });
    const filter = { $or: [ { title: 'Smoke Test' }, { author: 'Smoke Tester' }, { content: { $regex: 'Smoke test', $options: 'i' } } ] };
    // If using in-memory collection, it supports deleteOne/deleteMany semantics above
    if (typeof blogsCollection.deleteMany === 'function') {
      const result = await blogsCollection.deleteMany(filter);
      const deleted = result.deletedCount || result.deleted || 0;
      return res.json({ message: 'Cleanup completed', deletedCount: deleted });
    }
    // Fallback for in-memory collection: find matching and delete one-by-one
    if (typeof blogsCollection.find === 'function') {
      const items = await blogsCollection.find(filter).sort({ createdAt: -1 }).toArray();
      let deleted = 0;
      for (const it of items) {
        if (typeof blogsCollection.deleteOne === 'function') {
          const r = await blogsCollection.deleteOne({ _id: it._id });
          deleted += (r.deletedCount || 0);
        }
      }
      return res.json({ message: 'Cleanup completed', deletedCount: deleted });
    }
    return res.status(500).json({ message: 'No supported delete method' });
  } catch (err) {
    console.error('Cleanup error', err);
    res.status(500).json({ message: 'Cleanup failed' });
  }
});

async function start() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    usersCollection = db.collection('users');
    blogsCollection = db.collection('blogs');
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.warn('MongoDB unavailable, falling back to in-memory storage:', err.message || err);
    usersCollection = new InMemoryCollection();
    blogsCollection = new InMemoryCollection();
  }

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
