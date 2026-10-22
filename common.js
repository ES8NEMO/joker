/* ============================================================
   common.js  -  code partagé bin dev / client / chef
   - DB : Firestore ila config s7i7a, sinon localStorage (démo)
   - helpers : esc, applyTheme, imageToDataURL
   ============================================================ */
const PARAMS = new URLSearchParams(location.search);
const CAFE_ID = PARAMS.get('cafe') || window.DEFAULT_CAFE_ID || 'demo';

const DEFAULT_SETTINGS = {
  name: 'Mon Café',
  logo: '',
  bg: '#fbf7f0',
  text: '#2a2522',
  primary: '#b5472f',
  font: 'Poppins',
  layout: 'grid'
};

const DB = (() => {
  const cfg = window.FIREBASE_CONFIG;
  const useFB = cfg && cfg.apiKey && !String(cfg.apiKey).startsWith('PASTE') && window.firebase;
  const path = c => `cafes/${CAFE_ID}/${c}`;

  if (useFB) {
    firebase.initializeApp(cfg);
    const fs = firebase.firestore();
    const toList = s => s.docs.map(d => ({ id: d.id, ...d.data() }));
    return {
      mode: 'firebase',
      listen: (col, cb) => fs.collection(path(col)).onSnapshot(s => cb(toList(s))),
      listenDoc: (col, id, cb) => fs.collection(path(col)).doc(id).onSnapshot(d => cb(d.exists ? { id: d.id, ...d.data() } : null)),
      add: async (col, data) => (await fs.collection(path(col)).add(data)).id,
      set: (col, id, data) => fs.collection(path(col)).doc(id).set(data, { merge: true }),
      remove: (col, id) => fs.collection(path(col)).doc(id).delete()
    };
  }

  // ---------- Mode démo (localStorage) ----------
  const prefix = `cafe_${CAFE_ID}_`;
  const read = c => JSON.parse(localStorage.getItem(prefix + c) || '[]');
  const subs = {};
  const fire = c => (subs[c] || []).forEach(fn => fn());
  const write = (c, arr) => { localStorage.setItem(prefix + c, JSON.stringify(arr)); fire(c); };
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
  const sub = (c, fn) => { (subs[c] = subs[c] || []).push(fn); fn(); return () => { subs[c] = subs[c].filter(x => x !== fn); }; };

  // tabs/pages okhra f nefs navigateur
  window.addEventListener('storage', e => {
    if (e.key && e.key.startsWith(prefix)) fire(e.key.slice(prefix.length));
  });

  return {
    mode: 'demo',
    listen: (col, cb) => sub(col, () => cb(read(col))),
    listenDoc: (col, id, cb) => sub(col, () => cb(read(col).find(x => x.id === id) || null)),
    add: async (col, data) => { const id = uid(); write(col, [...read(col), { id, ...data }]); return id; },
    set: async (col, id, data) => {
      const arr = read(col);
      const i = arr.findIndex(x => x.id === id);
      if (i >= 0) arr[i] = { ...arr[i], ...data }; else arr.push({ id, ...data });
      write(col, arr);
    },
    remove: async (col, id) => write(col, read(col).filter(x => x.id !== id))
  };
})();

/* ---------- helpers ---------- */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function money(n) { return (Math.round(Number(n || 0) * 100) / 100) + ' DH'; }

function applyTheme(s) {
  s = { ...DEFAULT_SETTINGS, ...(s || {}) };
  const r = document.documentElement.style;
  r.setProperty('--bg', s.bg);
  r.setProperty('--text', s.text);
  r.setProperty('--primary', s.primary);
  r.setProperty('--font', `'${s.font}', system-ui, sans-serif`);
  return s;
}

// Sghghr taswira (max 480px) w rddha texte base64 => kat-tkhzzen direct f Firestore bla Storage
function imageToDataURL(file, max = 480, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const FONTS = ['Poppins', 'Cairo', 'Tajawal', 'Montserrat', 'Playfair Display'];
const FONTS_LINK = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&family=Montserrat:wght@400;600;700&family=Playfair+Display:wght@500;700&display=swap';


/* ============================================================
   LOGIN  (dev w shef)
   - Firebase: email + mot de passe (Firebase Authentication)
     w doc  cafes/{cafeId}/staff/{uid} = { role: "dev" | "shef" }
   - Démo: ghir mot de passe (DEMO_PASSWORDS f firebase-config.js)
   ============================================================ */
function requireLogin(role, start) {
  const fb = DB.mode === 'firebase';
  const demoPw = window.DEMO_PASSWORDS || { dev: 'dev123', shef: 'shef123' };
  const label = role === 'dev' ? 'Espace Dev' : 'Espace Chef';
  let started = false;
  const go = () => { if (!started) { started = true; wrap.remove(); start(); } };

  const wrap = document.createElement('div');
  wrap.innerHTML = `
  <style>
    #loginWrap{position:fixed;inset:0;background:#10141c;display:flex;align-items:center;justify-content:center;z-index:999;padding:20px;font-family:system-ui,sans-serif}
    #loginWrap form{background:#fff;color:#1d2330;border-radius:14px;padding:26px;width:100%;max-width:340px;display:grid;gap:12px}
    #loginWrap h2{margin:0 0 4px;font-size:19px}
    #loginWrap input{padding:11px;border:1px solid #d5d9e4;border-radius:8px;font:inherit;width:100%}
    #loginWrap button{padding:12px;border:0;border-radius:8px;background:#2f5bea;color:#fff;font:inherit;font-weight:600;cursor:pointer}
    #loginWrap .err{color:#c93a3a;font-size:13px;min-height:16px;margin:0}
    #loginWrap input:focus-visible,#loginWrap button:focus-visible{outline:2px solid #2f5bea;outline-offset:2px}
  </style>
  <div id="loginWrap"><form>
    <h2>${label}</h2>
    ${fb ? '<input type="email" id="lgEmail" placeholder="Email" autocomplete="username" required>' : ''}
    <input type="password" id="lgPw" placeholder="Mot de passe" autocomplete="current-password" required>
    <p class="err" id="lgErr"></p>
    <button type="submit">Se connecter</button>
  </form></div>`;
  document.body.appendChild(wrap);
  const $l = id => wrap.querySelector('#' + id);
  const err = m => { $l('lgErr').textContent = m; };

  window.logout = async () => {
    if (fb) await firebase.auth().signOut(); else sessionStorage.removeItem('auth_' + CAFE_ID);
    location.reload();
  };

  const okRole = r => r === 'dev' || r === role;

  if (fb) {
    const check = async u => {
      const d = await firebase.firestore().doc(`cafes/${CAFE_ID}/staff/${u.uid}`).get();
      return d.exists && okRole(d.data().role);
    };
    firebase.auth().onAuthStateChanged(async u => {
      if (!u) return;
      try { if (await check(u)) go(); else { await firebase.auth().signOut(); err('Accès refusé pour ce compte.'); } }
      catch (e) { err('Erreur de vérification.'); }
    });
    wrap.querySelector('form').onsubmit = async e => {
      e.preventDefault(); err('');
      try { await firebase.auth().signInWithEmailAndPassword($l('lgEmail').value.trim(), $l('lgPw').value); }
      catch (e2) { err('Email wla mot de passe ghalat.'); }
    };
  } else {
    if (okRole(sessionStorage.getItem('auth_' + CAFE_ID))) { go(); return; }
    wrap.querySelector('form').onsubmit = e => {
      e.preventDefault();
      const pw = $l('lgPw').value;
      if (pw === demoPw.dev) sessionStorage.setItem('auth_' + CAFE_ID, 'dev');
      else if (pw === demoPw[role]) sessionStorage.setItem('auth_' + CAFE_ID, role);
      else return err('Mot de passe ghalat.');
      go();
    };
  }
}
