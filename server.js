const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.MONGODB_DB || 'codomax';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.options('*', cors());
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

  find() {
    const self = this;
    return {
      sort(sortObj) {
        const sorted = [...self.items];
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
      const actual = item[key];
      if (value instanceof ObjectId) {
        return actual && actual.toString() === value.toString();
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

async function findUserByToken(token) {
  if (!token || !usersCollection) return null;
  return usersCollection.findOne({ token });
}

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  try {
    const existing = await usersCollection.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const newUser = {
      name,
      email,
      passwordHash,
      token: null,
      createdAt: new Date().toISOString()
    };
    const result = await usersCollection.insertOne(newUser);
    res.json({ message: 'User registered', user: { id: result.insertedId.toString(), name, email } });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ message: 'Unable to create account' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const valid = bcrypt.compareSync(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    await usersCollection.updateOne({ _id: user._id }, { $set: { token } });
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
    const posts = await blogsCollection.find().sort({ createdAt: -1 }).toArray();
    res.json(posts.map(mapBlog));
  } catch (err) {
    console.error('Fetch blogs error', err);
    res.status(500).json({ message: 'Unable to load blogs' });
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
