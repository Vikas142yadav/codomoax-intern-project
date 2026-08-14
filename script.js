const API_BASE = (function(){
  const host = window.location.hostname;
  const port = window.location.port;
  if (host === '127.0.0.1' || host === 'localhost') {
    if (port && port !== '3000') return 'http://127.0.0.1:3000';
    return window.location.origin;
  }
  if (window.location.protocol === 'file:') return 'http://127.0.0.1:3000';
  return window.location.origin;
})();
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
if (menuBtn && navLinks) {
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.addEventListener('click', (e) => {
    const isOpen = navLinks.classList.toggle('show');
    menuBtn.setAttribute('aria-expanded', String(!!isOpen));
    e.stopPropagation();
  });
  // close menu when clicking a link
  navLinks.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('show');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });
  // close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !menuBtn.contains(e.target)) {
      navLinks.classList.remove('show');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

const token = localStorage.getItem('token');
const pageHome = document.body.classList.contains('page-home');
const pageDashboard = document.body.classList.contains('page-dashboard');
const pageEditor = document.body.classList.contains('page-editor');
const pageDetail = document.body.classList.contains('page-detail');

async function loadCurrentUser() {
  if (!token) return;
  try {
    const res = await fetch(API_BASE + '/api/me', { headers: { Authorization: 'Bearer ' + token } });
    const user = await parseJSONResponse(res);
    if (!res.ok) {
      localStorage.removeItem('token');
      return;
    }
    const nav = document.getElementById('navLinks');
    if (nav) {
      nav.innerHTML = `
            <li><a href="index.html">Home</a></li>
            <li><a href="dashboard.html" class="${pageDashboard ? 'active' : ''}">Dashboard</a></li>
            <li><a href="create-blog.html">Create Blog</a></li>
            <li><a href="profile.html">Profile (${escapeHtml(user.name)})</a></li>
            <li><a href="#" id="logoutBtn">Logout</a></li>
      `;
      const logoutBtnNew = document.getElementById('logoutBtn');
      if (logoutBtnNew) {
        logoutBtnNew.addEventListener('click', (e) => {
          e.preventDefault();
          localStorage.removeItem('token');
          window.location.href = 'login.html';
        });
      }
    }
  } catch (err) {
    console.error('Unable to load current user', err);
  }
}

const registerForm = document.getElementById('registerForm');
const registerSubmitBtn = document.getElementById('registerSubmitBtn');
if (registerForm && registerSubmitBtn) {
  registerSubmitBtn.addEventListener('click', async () => {
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
      if (!res.ok) {
        alert(data.message || res.statusText || 'Registration failed');
        return;
      }
      alert('Registration successful');
      window.location.href = 'login.html';
    } catch (err) {
      console.error('Fetch registration failed:', err);
      alert('Unable to reach the registration backend. Please check the server and try again.');
    }
  });
}

const loginForm = document.getElementById('loginForm');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
if (loginForm && loginSubmitBtn) {
  loginSubmitBtn.addEventListener('click', async () => {
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
      if (!res.ok) {
        alert(data.message || res.statusText || 'Login failed');
        return;
      }
      localStorage.setItem('token', data.token);
      window.location.href = 'dashboard.html';
    } catch (err) {
      console.error('Fetch login failed:', err);
      alert('Unable to reach the login backend. Please check the server and try again.');
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

const blogForm = document.getElementById('blogForm');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
if (searchInput) {
  searchInput.addEventListener('input', () => loadBlogs({ search: searchInput.value.trim(), category: categoryFilter?.value }));
}
if (categoryFilter) {
  categoryFilter.addEventListener('change', () => loadBlogs({ search: searchInput?.value.trim(), category: categoryFilter.value }));
}

async function initializeEditorPage() {
  const form = document.getElementById('blogForm');
  const heading = document.querySelector('.form-container h2');
  const submitButton = form.querySelector('button[type="submit"]');
  const params = new URLSearchParams(window.location.search);
  const blogId = params.get('id');

  if (blogId) {
    if (!token) {
      alert('Please log in to edit a blog');
      window.location.href = 'login.html';
      return;
    }
    heading.textContent = 'Edit Blog';
    submitButton.innerHTML = '<i class="fa-solid fa-save"></i> Update Blog';
    await populateEditForm(blogId);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitBlogForm(blogId);
  });
}

async function populateEditForm(blogId) {
  try {
    const res = await fetch(API_BASE + `/api/blogs/${encodeURIComponent(blogId)}/edit`, {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
    const blog = await parseJSONResponse(res);
    if (!res.ok) throw new Error(blog.message || 'Unable to load blog for edit');
    document.getElementById('title').value = blog.title || '';
    document.getElementById('author').value = blog.author || '';
    document.getElementById('category').value = blog.category || '';
    document.getElementById('image').value = blog.image || '';
    document.getElementById('content').value = blog.content || '';
  } catch (err) {
    alert(err.message);
    window.location.href = 'dashboard.html';
  }
}

async function submitBlogForm(blogId) {
  const title = document.getElementById('title').value.trim();
  const author = document.getElementById('author').value.trim();
  const category = document.getElementById('category').value;
  const image = document.getElementById('image').value.trim();
  const content = document.getElementById('content').value.trim();

  if (!title || !content) {
    alert('Title and content are required');
    return;
  }

  if (!token) {
    alert('You must be logged in to publish a blog');
    window.location.href = 'login.html';
    return;
  }

  const method = blogId ? 'PUT' : 'POST';
  const url = blogId ? `${API_BASE}/api/blogs/${encodeURIComponent(blogId)}` : `${API_BASE}/api/blogs`;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ title, author, category, image, content })
    });
    const data = await parseJSONResponse(res);
    if (!res.ok) throw new Error(data.message || 'Unable to save blog');
    alert(blogId ? 'Blog updated successfully!' : 'Blog published successfully!');
    window.location.href = 'dashboard.html';
  } catch (err) {
    alert(err.message);
  }
}

async function loadBlogs({ search = '', category = '' } = {}) {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  if (pageDashboard) params.set('mine', 'true');

  try {
    const url = API_BASE + '/api/blogs' + (params.toString() ? `?${params.toString()}` : '');
    const res = await fetch(url, {
      headers: pageDashboard && token ? { Authorization: 'Bearer ' + token } : undefined
    });
    const blogs = await parseJSONResponse(res);
    if (!res.ok) throw new Error(blogs.message || 'Unable to load blogs');

    const countElem = document.getElementById('myBlogsCount');
    if (pageDashboard && countElem) {
      countElem.textContent = String(blogs.length);
    }

    if (!blogs.length) {
      grid.innerHTML = `<p class="empty-state">${pageDashboard ? 'No blogs found in your dashboard.' : 'No blogs yet. Create one!'}</p>`;
      return;
    }

    grid.innerHTML = '';
    blogs.forEach((blog) => {
      const card = document.createElement('div');
      card.className = 'blog-card';
      const imageUrl = escapeHtml(blog.image) || 'https://picsum.photos/400/250?random=' + Date.now();
      const excerpt = escapeHtml((blog.content || '').substring(0, 150));
      const actions = pageDashboard
        ? `
            <div class="blog-actions">
              <a href="blog.html?id=${blog.id}" class="read-btn"><i class="fa-solid fa-book-open"></i> Read</a>
              <a href="create-blog.html?id=${blog.id}" class="edit-btn"><i class="fa-solid fa-pen"></i> Edit</a>
              <button class="delete-btn" data-id="${blog.id}"><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
          `
        : `<a href="blog.html?id=${blog.id}" class="read-btn">Read More</a>`;

      card.innerHTML = `
        <img src="${imageUrl}" alt="Blog image">
        <div class="blog-content">
          <div class="meta">
            <span>${escapeHtml(blog.author || 'Anonymous')}</span>
            <span>${escapeHtml(blog.category || 'General')}</span>
            <span>${formatDate(blog.createdAt)}</span>
          </div>
          <h3>${escapeHtml(blog.title)}</h3>
          <p>${excerpt}...</p>
          ${actions}
        </div>
      `;

      if (pageDashboard) {
        const deleteBtn = card.querySelector('.delete-btn');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', () => handleDeleteBlog(blog.id));
        }
      }

      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `<p class="empty-state">${escapeHtml(err.message)}</p>`;
  }
}

async function handleDeleteBlog(blogId) {
  if (!confirm('Are you sure you want to delete this blog?')) {
    return;
  }
  if (!token) {
    alert('You must be logged in to delete a blog');
    window.location.href = 'login.html';
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/blogs/${encodeURIComponent(blogId)}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await parseJSONResponse(res);
    if (!res.ok) throw new Error(data.message || 'Unable to delete blog');
    alert('Blog deleted successfully');
    loadBlogs({ search: searchInput?.value.trim() || '', category: categoryFilter?.value || '' });
  } catch (err) {
    alert(err.message);
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

if (pageDashboard && !token) {
  window.location.href = 'login.html';
} else if (pageHome || pageDashboard) {
  loadBlogs({ search: searchInput?.value.trim() || '', category: categoryFilter?.value || '' });
}
if (pageEditor) {
  initializeEditorPage();
}
if (pageDetail) {
  loadBlogDetail();
}

loadCurrentUser();
