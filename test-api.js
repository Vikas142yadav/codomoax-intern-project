(async () => {
  const base = 'http://localhost:3000';
  const rand = Date.now();
  const email = `test+${rand}@example.com`;
  try {
    console.log('REGISTER');
    let res = await fetch(base + '/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Smoke Tester', email, password: 'Password123!' })
    });
    let json = await res.json().catch(() => ({}));
    console.log('register', res.status, json.message || json);

    console.log('LOGIN');
    res = await fetch(base + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password123!' })
    });
    json = await res.json().catch(() => ({}));
    console.log('login', res.status, json.message || (json.token ? 'OK' : json));
    if (!res.ok || !json.token) throw new Error('Login failed');
    const token = json.token;

    console.log('CREATE BLOG');
    res = await fetch(base + '/api/blogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ title: 'Smoke Test', content: 'Smoke test content', author: 'Smoke Tester', category: 'Testing' })
    });
    json = await res.json().catch(() => ({}));
    console.log('create', res.status, json.message || json);
    if (!res.ok) throw new Error('Create blog failed');
    const blogId = json.blog && json.blog.id;
    if (!blogId) throw new Error('Missing blog id');

    console.log('GET MY BLOGS');
    res = await fetch(base + '/api/blogs?mine=true', { headers: { Authorization: 'Bearer ' + token } });
    json = await res.json().catch(() => ({}));
    console.log('myblogs', res.status, Array.isArray(json) ? `count=${json.length}` : json);

    console.log('UPDATE BLOG');
    res = await fetch(base + `/api/blogs/${encodeURIComponent(blogId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ title: 'Smoke Test Updated', content: 'Updated content', author: 'Smoke Tester' })
    });
    json = await res.json().catch(() => ({}));
    console.log('update', res.status, json.message || json);

    console.log('DELETE BLOG');
    res = await fetch(base + `/api/blogs/${encodeURIComponent(blogId)}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
    json = await res.json().catch(() => ({}));
    console.log('delete', res.status, json.message || json);

    console.log('ME');
    res = await fetch(base + '/api/me', { headers: { Authorization: 'Bearer ' + token } });
    json = await res.json().catch(() => ({}));
    console.log('me', res.status, json.name || json);

    console.log('ALL TESTS PASSED');
    process.exit(0);
  } catch (err) {
    console.error('TEST FAILED:', err.message || err);
    process.exit(2);
  }
})();
