/**
 * OPTECH DB Client v2
 * - Server mode  : reads/writes via /api/db (db.json on disk), requires auth token
 * - Local mode   : uses localStorage only (fallback when no server)
 */
const DbClient = (() => {

    // ── Token helpers ────────────────────────────────────────────────────
    function getToken()        { return sessionStorage.getItem('optech_token') || ''; }
    function setToken(t)       { sessionStorage.setItem('optech_token', t); }
    function clearToken()      { sessionStorage.removeItem('optech_token'); sessionStorage.removeItem('optech_user'); }
    function getCurrentUser()  { try { return JSON.parse(sessionStorage.getItem('optech_user') || 'null'); } catch { return null; } }
    function setCurrentUser(u) { sessionStorage.setItem('optech_user', JSON.stringify(u)); }

    // ── Mode detection ───────────────────────────────────────────────────
    const IS_SERVER = (location.protocol === 'http:' || location.protocol === 'https:');

    function headers(extra) {
        return { 'Content-Type': 'application/json', 'x-auth-token': getToken(), ...(extra||{}) };
    }

    // ── Auth ─────────────────────────────────────────────────────────────
    async function login(username, password) {
        if (!IS_SERVER) return { ok: false, error: 'No server — open via http://server-ip:3000' };
        try {
            const r = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await r.json();
            if (data.ok) { setToken(data.token); setCurrentUser(data.user); }
            return data;
        } catch (e) { return { ok: false, error: 'Cannot reach server: ' + e.message }; }
    }

    async function logout() {
        if (IS_SERVER && getToken()) {
            try { await fetch('/api/auth/logout', { method:'POST', headers: headers() }); } catch {}
        }
        clearToken();
    }

    async function ping() {
        if (!IS_SERVER) return false;
        try {
            const r = await fetch('/api/auth/ping', { headers: headers(), cache: 'no-store' });
            if (r.status === 401) { clearToken(); return false; }
            const d = await r.json();
            if (d.ok && d.user) setCurrentUser(d.user);
            return d.ok;
        } catch { return false; }
    }

    // ── Data ─────────────────────────────────────────────────────────────
    async function loadAll() {
        if (!IS_SERVER || !getToken()) return null;
        try {
            const r = await fetch('/api/db', { headers: headers(), cache: 'no-store' });
            if (r.status === 401) { clearToken(); return null; }
            if (!r.ok) return null;
            return await r.json();
        } catch { return null; }
    }

    async function saveCollection(collection, data) {
        // always mirror to localStorage as cache
        try { localStorage.setItem('optech_' + collection, JSON.stringify(data)); } catch {}

        if (!IS_SERVER || !getToken()) return;
        try {
            await fetch('/api/db/' + collection, {
                method:  'POST',
                headers: headers(),
                body:    JSON.stringify(data)
            });
        } catch (e) {
            console.warn('[DbClient] API save failed, localStorage-only:', e.message);
        }
    }

    // ── Users (admin only) ───────────────────────────────────────────────
    async function getUsers() {
        if (!IS_SERVER) return [];
        const r = await fetch('/api/users', { headers: headers() });
        if (!r.ok) return [];
        return await r.json();
    }

    async function createUser(userData) {
        const r = await fetch('/api/users', {
            method: 'POST', headers: headers(), body: JSON.stringify(userData)
        });
        return await r.json();
    }

    async function updateUser(id, userData) {
        const r = await fetch('/api/users/' + id, {
            method: 'PUT', headers: headers(), body: JSON.stringify(userData)
        });
        return await r.json();
    }

    async function deleteUser(id) {
        const r = await fetch('/api/users/' + id, {
            method: 'DELETE', headers: headers()
        });
        return await r.json();
    }

    return {
        IS_SERVER,
        login, logout, ping,
        getToken, setToken, clearToken, getCurrentUser,
        loadAll, saveCollection,
        getUsers, createUser, updateUser, deleteUser
    };
})();
