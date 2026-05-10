/**
 * OPTECH ERP — Backend Server
 * npm install  →  node server.js
 * Open: http://localhost:3000
 */
const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const crypto   = require('crypto');

const app     = express();
const PORT    = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// ── Active sessions (in-memory, resets on server restart) ──────────────
const sessions = new Map(); // token → { id, username, name, role }

// ── Empty DB schema ─────────────────────────────────────────────────────
const EMPTY_DB = {
    users: [{
        id: '1', username: 'admin', password: '1234',
        name: 'Administrator', role: 'admin', active: true,
        created: new Date().toISOString().slice(0,10)
    }],
    invoices:             [],
    receipts:             [],
    customers:            [],
    quotations:           [],
    leads:                [],
    activities:           [],
    inventory:            [],
    inventory_movements:  [],
    suppliers:            []
};

// ── DB helpers ───────────────────────────────────────────────────────────
function readDB() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY_DB, null, 2));
            return JSON.parse(JSON.stringify(EMPTY_DB));
        }
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        // ensure all collections exist
        Object.keys(EMPTY_DB).forEach(k => { if (!data[k]) data[k] = []; });
        // ensure default admin exists
        if (!data.users || data.users.length === 0) {
            data.users = EMPTY_DB.users;
            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        }
        return data;
    } catch (e) {
        console.error('readDB error:', e.message);
        return JSON.parse(JSON.stringify(EMPTY_DB));
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ── Middleware ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-auth-token');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// ── Auth middleware (soft — adds req.user if valid token present) ─────────
function withAuth(req, res, next) {
    const token = req.headers['x-auth-token'];
    if (token && sessions.has(token)) {
        req.user = sessions.get(token);
    }
    next();
}

// ── Require auth ─────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
    const token = req.headers['x-auth-token'];
    if (!token || !sessions.has(token)) {
        return res.status(401).json({ ok: false, error: 'Authentication required' });
    }
    req.user = sessions.get(token);
    next();
}

// ── Require admin ────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ ok: false, error: 'Admin access required' });
        }
        next();
    });
}

// ════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ════════════════════════════════════════════════════════════════════════

// Login
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) return res.status(400).json({ ok: false, error: 'Missing credentials' });
        const db   = readDB();
        const user = db.users.find(u =>
            u.username.toLowerCase() === username.toLowerCase() &&
            u.password === password &&
            u.active !== false
        );
        if (!user) return res.status(401).json({ ok: false, error: 'Invalid username or password' });
        const token = crypto.randomBytes(32).toString('hex');
        const session = { id: user.id, username: user.username, name: user.name, role: user.role };
        sessions.set(token, session);
        // update last login
        user.lastLogin = new Date().toISOString().slice(0,16).replace('T',' ');
        writeDB(db);
        res.json({ ok: true, token, user: session });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});

// Logout
app.post('/api/auth/logout', requireAuth, (req, res) => {
    const token = req.headers['x-auth-token'];
    sessions.delete(token);
    res.json({ ok: true });
});

// Current session
app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ ok: true, user: req.user });
});

// Verify token (lightweight ping)
app.get('/api/auth/ping', (req, res) => {
    const token = req.headers['x-auth-token'];
    if (token && sessions.has(token)) {
        res.json({ ok: true, user: sessions.get(token) });
    } else {
        res.status(401).json({ ok: false });
    }
});

// ════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT (admin only)
// ════════════════════════════════════════════════════════════════════════

app.get('/api/users', requireAdmin, (req, res) => {
    const db = readDB();
    res.json(db.users.map(u => ({ ...u, password: undefined })));
});

app.post('/api/users', requireAdmin, (req, res) => {
    const { username, name, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ ok: false, error: 'username and password required' });
    const db = readDB();
    if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(400).json({ ok: false, error: 'Username already exists' });
    }
    const user = { id: Date.now().toString(), username, name: name||username, password, role: role||'user', active: true, created: new Date().toISOString().slice(0,10) };
    db.users.push(user);
    writeDB(db);
    res.json({ ok: true, user: { ...user, password: undefined } });
});

app.put('/api/users/:id', requireAdmin, (req, res) => {
    const db = readDB();
    const i  = db.users.findIndex(u => u.id === req.params.id);
    if (i < 0) return res.status(404).json({ ok: false, error: 'User not found' });
    const { username, name, password, role, active } = req.body;
    if (username) db.users[i].username = username;
    if (name)     db.users[i].name     = name;
    if (password) db.users[i].password = password;
    if (role)     db.users[i].role     = role;
    if (active !== undefined) db.users[i].active = active;
    writeDB(db);
    res.json({ ok: true, user: { ...db.users[i], password: undefined } });
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
    if (req.params.id === '1') return res.status(400).json({ ok: false, error: 'Cannot delete default admin' });
    const db = readDB();
    db.users = db.users.filter(u => u.id !== req.params.id);
    writeDB(db);
    res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════
// DATA ROUTES (protected)
// ════════════════════════════════════════════════════════════════════════

const COLLECTIONS = Object.keys(EMPTY_DB).filter(k => k !== 'users');

// GET full DB (minus users/passwords)
app.get('/api/db', requireAuth, (req, res) => {
    const db = readDB();
    const { users, ...rest } = db;
    res.json(rest);
});

// GET single collection
app.get('/api/db/:col', requireAuth, (req, res) => {
    const db  = readDB();
    const col = req.params.col;
    if (!COLLECTIONS.includes(col)) return res.status(400).json({ error: 'Unknown collection' });
    res.json(db[col] || []);
});

// POST (replace) entire collection
app.post('/api/db/:col', requireAuth, (req, res) => {
    try {
        const db  = readDB();
        const col = req.params.col;
        if (!COLLECTIONS.includes(col)) return res.status(400).json({ error: 'Unknown collection' });
        db[col] = req.body;
        writeDB(db);
        res.json({ ok: true, count: db[col].length });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE single record
app.delete('/api/db/:col/:id', requireAuth, (req, res) => {
    try {
        const db  = readDB();
        const col = req.params.col;
        if (!COLLECTIONS.includes(col)) return res.status(400).json({ error: 'Unknown collection' });
        db[col] = db[col].filter(r => String(r.id) !== String(req.params.id));
        writeDB(db);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST activity log
app.post('/api/activities', requireAuth, (req, res) => {
    try {
        const db = readDB();
        const activity = {
            id: Date.now().toString(),
            ...req.body,
            user: req.user.username
        };
        
        if (!db.activities) db.activities = [];
        db.activities.unshift(activity);
        
        // Keep only last 100 activities
        if (db.activities.length > 100) {
            db.activities = db.activities.slice(0, 100);
        }
        
        writeDB(db);
        res.json({ ok: true, activity });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 404 Handler for API routes ───────────────────────────────────────────
app.use('/api/*splat', (req, res) => {
    res.status(404).json({ ok: false, error: 'API endpoint not found' });
});

// Catch-all route to serve frontend (for Render.com)
app.get('/*splat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════╗');
    console.log('  ║   OPTECH ERP  —  Server Running          ║');
    console.log(`  ║   http://localhost:${PORT}                 ║`);
    console.log(`  ║   Default login: admin / 1234             ║`);
    console.log(`  ║   Database: db.json                       ║`);
    console.log('  ╚══════════════════════════════════════════╝');
    console.log('');
});
