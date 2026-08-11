const API_BASE = 'http://localhost:3000';
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
if (menuBtn) {
  menuBtn.addEventListener('click', () => navLinks.classList.toggle('show'));
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirmPassword').value;
    if (!name || !email || !password) {
      alert('Name, email, and password are required');
      return;
    }
    if (password !== confirm) {
      alert('Passwords do not match');
      return;
    }
    try {
      const res = await fetch(API_BASE + '/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await parseJSONResponse(res);
      if (!res.ok) throw new Error(data.message || res.statusText || 'Registration failed');
      alert('Registration successful');
      window.location.href = 'login.html';
    } catch (err) {
      console.warn('Fetch registration failed, falling back to form submit:', err.message);
      alert('Registration failed in app mode, retrying directly. If this still fails, make sure the backend is running at http://localhost:3000.');
      e.target.submit();
    }
  });
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) {
      alert('Email and password are required');
      return;
    }
    try {
      const res = await fetch(API_BASE + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await parseJSONResponse(res);
      if (!res.ok) throw new Error(data.message || res.statusText || 'Login failed');
      localStorage.setItem('token', data.token);
      window.location.href = 'dashboard.html';
    } catch (err) {
      alert(err.message);
    }
  });
}

const blogForm = document.getElementById('blogForm');
if (blogForm) {
  blogForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value.trim();
    const author = document.getElementById('author').value.trim();
    const category = document.getElementById('category').value;
    const image = document.getElementById('image').value.trim();
    const content = document.getElementById('content').value.trim();
    if (!title || !content) {
      alert('Title and content are required');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in to create a blog');
      window.location.href = 'login.html';
      return;
    }
    try {
      const res = await fetch(API_BASE + '/api/blogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ title, author, category, image, content })
      });
      const data = await parseJSONResponse(res);
      if (!res.ok) throw new Error(data.message || res.statusText || 'Failed to create blog');
      alert('Blog Published Successfully!');
      window.location.href = 'dashboard.html';
    } catch (err) {
      alert(err.message);
    }
  });
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  });
}

async function loadBlogs() {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;
  try {
    const res = await fetch(API_BASE + '/api/blogs');
    const blogs = await parseJSONResponse(res);
    if (!res.ok) throw new Error(blogs.message || 'Unable to load blogs');
    if (!blogs.length) {
      grid.innerHTML = '<p class="empty-state">No blogs yet. Create one!</p>';
      return;
    }
    grid.innerHTML = '';
    blogs.forEach((blog) => {
      const card = document.createElement('div');
      card.className = 'blog-card';
      card.innerHTML = `
        <img src="${escapeHtml(blog.image) || 'https://picsum.photos/400/250?random=' + Date.now()}" alt="Blog image">
        <div class="blog-content">
          <div class="meta">
            <span>${escapeHtml(blog.author || 'Anonymous')}</span>
            <span>${escapeHtml(blog.category || 'General')}</span>
            <span>${formatDate(blog.createdAt)}</span>
          </div>
          <h3>${escapeHtml(blog.title)}</h3>
          <p>${escapeHtml(blog.content.substring(0, 150))}...</p>
          <a href="blog.html?id=${blog.id}" class="read-btn">Read More</a>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `<p class="empty-state">${escapeHtml(err.message)}</p>`;
  }
}

async function loadBlogDetail() {
  const detail = document.getElementById('blogDetail');
  if (!detail) return;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    detail.innerHTML = '<p class="empty-state">Blog ID is missing.</p>';
    return;
  }
  try {
    const res = await fetch(API_BASE + `/api/blogs/${encodeURIComponent(id)}`);
    const data = await parseJSONResponse(res);
    if (!res.ok) throw new Error(data.message || 'Unable to load blog');
    detail.innerHTML = `
      <img src="${escapeHtml(data.image) || 'https://picsum.photos/900/350?random=' + Date.now()}" alt="Blog image">
      <div class="detail-content">
        <h1>${escapeHtml(data.title)}</h1>
        <div class="detail-meta">
          <span>${escapeHtml(data.author || 'Anonymous')}</span>
          <span>${escapeHtml(data.category || 'General')}</span>
          <span>${formatDate(data.createdAt)}</span>
        </div>
        <p>${escapeHtml(data.content).replace(/\n/g, '<br>')}</p>
        <a href="index.html" class="btn back-btn"><i class="fa-solid fa-arrow-left"></i> Back to Home</a>
      </div>
    `;
  } catch (err) {
    detail.innerHTML = `<p class="empty-state">${escapeHtml(err.message)}</p>`;
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function parseJSONResponse(response) {
  const text = await response.text();
  if (!text) {
    return response.ok ? {} : { message: response.statusText || 'No response body' };
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    return { message: text };
  }
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

if (document.getElementById('blogGrid')) loadBlogs();
if (document.getElementById('blogDetail')) loadBlogDetail();
