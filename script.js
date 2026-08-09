<<<<<<< HEAD
// =============================
// Mobile Navigation
// =============================

const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

if (menuBtn) {
    menuBtn.addEventListener("click", () => {
        navLinks.classList.toggle("show");
    });
}

// =============================
// Register Form Validation
// =============================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", function (e) {

        e.preventDefault();

        const password = document.getElementById("password").value;
        const confirm = document.getElementById("confirmPassword").value;

        if (password !== confirm) {
            alert("Passwords do not match!");
            return;
        }

        alert("Registration Successful!");

        window.location.href = "login.html";

    });

}

// =============================
// Login Form
// =============================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", function (e) {

        e.preventDefault();

        alert("Login Successful!");

        window.location.href = "dashboard.html";

    });

}

// =============================
// Create Blog
// =============================

const blogForm = document.getElementById("blogForm");

if (blogForm) {

    blogForm.addEventListener("submit", function (e) {

        e.preventDefault();

        alert("Blog Published Successfully!");

        blogForm.reset();

    });

}

// =============================
// Delete Blog Button
// =============================

const deleteButtons = document.querySelectorAll(".delete-btn");

deleteButtons.forEach(button => {

    button.addEventListener("click", () => {

        if (confirm("Delete this blog?")) {

            button.closest(".blog-card").remove();

        }

    });

});

// =============================
// Edit Blog Button
// =============================

const editButtons = document.querySelectorAll(".edit-btn");

editButtons.forEach(button => {

    button.addEventListener("click", () => {

        alert("Edit feature can be implemented later.");

    });

});
=======
// =============================
// Mobile Navigation
// =============================

const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

if (menuBtn) {
    menuBtn.addEventListener("click", () => {
        navLinks.classList.toggle("show");
    });
}

// =============================
// Register Form Validation + API
// =============================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirm = document.getElementById("confirmPassword").value;

        if (password !== confirm) {
            alert("Passwords do not match!");
            return;
        }

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Registration failed');

            alert('Registration successful');
            window.location.href = 'login.html';

        } catch (err) {
            alert(err.message);
        }

    });

}

// =============================
// Login Form + API
// =============================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Login failed');

            // Save token for subsequent requests
            localStorage.setItem('token', data.token);
            window.location.href = 'dashboard.html';

        } catch (err) {
            alert(err.message);
        }

    });

}

// =============================
// Create Blog + API
// =============================

const blogForm = document.getElementById("blogForm");

if (blogForm) {

    blogForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const title = document.getElementById('title').value.trim();
        const author = document.getElementById('author').value.trim();
        const category = document.getElementById('category').value;
        const image = document.getElementById('image').value.trim();
        const content = document.getElementById('content').value.trim();

        const token = localStorage.getItem('token');
        if (!token) {
            alert('You must be logged in to create a blog');
            window.location.href = 'login.html';
            return;
        }

        try {
            const res = await fetch('/api/blogs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ title, author, category, image, content })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Create blog failed');

            alert('Blog Published Successfully!');
            blogForm.reset();
            window.location.href = 'dashboard.html';

        } catch (err) {
            alert(err.message);
        }

    });

}

// =============================
// Delete Blog Button
// =============================

const deleteButtons = document.querySelectorAll(".delete-btn");

deleteButtons.forEach(button => {

    button.addEventListener("click", () => {

        if (confirm("Delete this blog?")) {

            button.closest(".blog-card").remove();

        }

    });

});

// =============================
// Edit Blog Button
// =============================

const editButtons = document.querySelectorAll(".edit-btn");

editButtons.forEach(button => {

    button.addEventListener("click", () => {

        alert("Edit feature can be implemented later.");

    });

});

// =============================
// Dashboard: Load blogs and add logout
// =============================

async function loadBlogs() {
    const grid = document.getElementById('blogGrid');
    if (!grid) return;

    try {
        const res = await fetch('/api/blogs');
        const blogs = await res.json();

        grid.innerHTML = '';

        blogs.forEach(b => {
            const card = document.createElement('div');
            card.className = 'blog-card';

            card.innerHTML = `
                <img src="${b.image || 'https://picsum.photos/400/250'}" alt="Blog">
                <div class="blog-content">
                    <h3>${escapeHtml(b.title)}</h3>
                    <p>${escapeHtml(b.content.substring(0, 150))}...</p>
                    <div class="card-buttons">
                        <button class="edit-btn"> <i class="fa-solid fa-pen"></i> Edit</button>
                        <button class="delete-btn"> <i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                </div>
            `;

            grid.appendChild(card);
        });

    } catch (err) {
        console.error('Load blogs failed', err);
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Load blogs on dashboard
if (document.getElementById('blogGrid')) {
    loadBlogs();
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });
}
>>>>>>> 18b7660 (feat: add Express backend and frontend API integration)
