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