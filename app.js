/**
 * Nepal Constitution Explorer — app.js
 * Loads constitution.json and renders an interactive navigation UI.
 *
 * Fixes applied:
 *  1. const previewText / const contentFormatted were declared then immediately
 *     reassigned — illegal in strict mode. Converted to `let`, dead first
 *     initialisation removed.
 *  2. `const hasEnglish` was declared but never referenced. Removed.
 *  3. CSS font/layout variables were trapped inside [data-theme="dark"] so
 *     light mode had no --font-*, --radius, --sidebar-width etc. Fixed in
 *     style.css by moving them to :root.
 *
 * New features:
 *  Hash-based URL routing  (#part/3  |  #article/18)
 *  Browser back / forward navigation
 *  Share button on every article — copies a deep link to clipboard
 *  Toast notification on successful copy
 *  Deep-linked article gets a subtle pulse highlight on arrival
 */

'use strict';

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  data: null,
  currentPartIndex: null,
  searchQuery: '',
  searchTimeout: null,
  suppressHistory: false,  // prevent pushState during popstate-triggered nav
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const els = {
  partsNav:          $('partsNav'),
  welcomeScreen:     $('welcomeScreen'),
  partView:          $('partView'),
  partHeader:        $('partHeader'),
  articlesList:      $('articlesList'),
  searchView:        $('searchView'),
  searchViewTitle:   $('searchViewTitle'),
  searchResultsList: $('searchResultsList'),
  searchInput:       $('searchInput'),
  searchClear:       $('searchClear'),
  searchCount:       $('searchCount'),
  preambleText:      $('preambleText'),
  statParts:         $('statParts'),
  statArticles:      $('statArticles'),
  sidebar:           $('sidebar'),
};

// ─── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const res = await fetch('constitution.json');
    if (!res.ok) throw new Error('Failed to load constitution.json');
    state.data = await res.json();
    render();
    handleHashNavigation();
  } catch (err) {
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;
        font-family:sans-serif;text-align:center;padding:24px;color:#5a4a3a;">
        <div>
          <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
          <h2 style="margin-bottom:8px;">Could not load constitution data</h2>
          <p style="color:#9a8878;">Make sure <code>constitution.json</code> is in the same folder as <code>index.html</code></p>
          <p style="color:#c0392b;font-size:13px;margin-top:12px;">${err.message}</p>
        </div>
      </div>`;
  }
}

// ─── Render ────────────────────────────────────────────────────────────────────
function render() {
  const { data } = state;
  if (!data) return;

  els.statParts.textContent    = data.parts.length;
  els.statArticles.textContent = data.parts.reduce((a, p) => a + p.articles.length, 0);
  els.preambleText.textContent = data.preamble || '(Preamble not available)';

  els.partsNav.innerHTML = '';
  data.parts.forEach((part, idx) => {
    const item = document.createElement('div');
    item.className   = 'part-nav-item';
    item.dataset.idx = idx;
    item.innerHTML = `
      <span class="part-nav-num">${padPart(part.part_number)}</span>
      <div class="part-nav-titles">
        <span class="part-nav-np">${part.title_np}</span>
        ${part.title_en ? `<span class="part-nav-en">${part.title_en}</span>` : ''}
      </div>
      <span class="part-nav-count">${part.articles.length}</span>
    `;
    item.addEventListener('click', () => {
      showPart(idx);
      closeMobileSidebar();
    });
    els.partsNav.appendChild(item);
  });

  els.searchInput.addEventListener('input', onSearch);
  els.searchClear.addEventListener('click', clearSearch);

  setupMobileSidebar();

  // Toast container
  const toast = document.createElement('div');
  toast.id        = 'toast';
  toast.className = 'toast';
  document.body.appendChild(toast);
}

// ─── URL / Hash Routing ────────────────────────────────────────────────────────

function handleHashNavigation() {
  const hash = window.location.hash;
  if (!hash || hash === '#') {
    showWelcome(false);
    return;
  }

  const match = hash.match(/^#(part|article)\/(\d+)$/);
  if (!match) {
    showWelcome(false);
    return;
  }

  const type  = match[1];
  const value = parseInt(match[2], 10);
  const { data } = state;
  if (!data) return;

  if (type === 'part') {
    const partIdx = data.parts.findIndex(p => p.part_number === value);
    if (partIdx !== -1) showPart(partIdx, false);
    else showWelcome(false);

  } else if (type === 'article') {
    let foundPartIdx = -1;
    for (let i = 0; i < data.parts.length; i++) {
      if (data.parts[i].articles.find(a => a.article_number === value)) {
        foundPartIdx = i;
        break;
      }
    }
    if (foundPartIdx !== -1) {
      showPart(foundPartIdx, false);
      requestAnimationFrame(() => {
        const artEl = document.getElementById(`article-${value}`);
        if (artEl) {
          artEl.classList.add('expanded', 'deep-linked');
          artEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          artEl.addEventListener('animationend', () => artEl.classList.remove('deep-linked'), { once: true });
        }
      });
    } else {
      showWelcome(false);
    }
  }
}

function pushHash(hash) {
  if (state.suppressHistory) return;
  if (window.location.hash !== hash) {
    history.pushState(null, '', hash);
  }
}

window.addEventListener('popstate', () => {
  state.suppressHistory = true;
  handleHashNavigation();
  state.suppressHistory = false;
});

// ─── Show Part ─────────────────────────────────────────────────────────────────
function showPart(idx, updateHash = true) {
  const { data } = state;
  const part = data.parts[idx];
  state.currentPartIndex = idx;

  if (updateHash) pushHash(`#part/${part.part_number}`);

  document.querySelectorAll('.part-nav-item').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });

  const activeEl = els.partsNav.querySelector('.part-nav-item.active');
  if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  els.welcomeScreen.style.display = 'none';
  els.searchView.style.display    = 'none';
  els.partView.style.display      = 'block';

  if (state.searchQuery) clearSearch();

  const isFirst = idx === 0;
  const isLast  = idx === data.parts.length - 1;

  els.partHeader.innerHTML = `
    <div class="part-header-inner">
      <div class="part-breadcrumb">
        <span>नेपालको संविधान</span>
        <span class="breadcrumb-sep">›</span>
        <span>भाग ${toNepaliNum(part.part_number)}</span>
      </div>
      <h2 class="part-title-np">${part.title_np}</h2>
      ${part.title_en ? `<p class="part-title-en">${part.title_en}</p>` : ''}
      <div class="part-meta-row">
        <span class="part-meta-chip highlight">भाग ${toNepaliNum(part.part_number)} · Part ${part.part_number}</span>
        <span class="part-meta-chip">${part.articles.length} धाराहरू · Articles</span>
        <div class="part-nav-arrows">
          <button class="part-nav-arrow" onclick="showPart(${idx - 1})" ${isFirst ? 'disabled' : ''} title="Previous Part">← Prev</button>
          <button class="part-nav-arrow" onclick="showPart(${idx + 1})" ${isLast  ? 'disabled' : ''} title="Next Part">Next →</button>
        </div>
      </div>
    </div>
  `;

  els.articlesList.innerHTML = '';
  part.articles.forEach((article, aIdx) => {
    const card = buildArticleCard(article, idx, aIdx);
    els.articlesList.appendChild(card);
  });

  els.articlesList.parentElement.scrollTop = 0;
}

// ─── Build Article Card ────────────────────────────────────────────────────────
function buildArticleCard(article, partIdx, aIdx, highlight = '') {
  const card    = document.createElement('div');
  card.className = 'article-card';
  card.id        = `article-${article.article_number}`;

  // FIX: was `const` with immediate reassignment — illegal in strict mode.
  const enTitle        = article.title_en   || '';
  const enContent      = article.content_en || '';
  const displayContent = enContent || article.content || '';

  let previewText = displayContent
    ? displayContent.substring(0, 140).replace(/\n/g, ' ') + (displayContent.length > 140 ? '…' : '')
    : '';

  let contentFormatted = formatArticleContent(displayContent, highlight);

  const articleURL = `${location.href.split('#')[0]}#article/${article.article_number}`;

  card.innerHTML = `
    <div class="article-header" role="button" aria-expanded="false">
      <div class="article-num-badge">
        <span class="np-num">${article.article_number_np || article.article_number}</span>
        <span class="art-num">Art. ${article.article_number}</span>
      </div>
      <div class="article-title-block">
        <div class="article-title-en">${highlight ? highlightText(enTitle || article.title_np, highlight) : (enTitle || escapeHTML(article.title_np))}</div>
        ${article.title_np ? `<div class="article-title-np-sub">${highlight ? highlightText(article.title_np, highlight) : escapeHTML(article.title_np)}</div>` : ''}
        <div class="article-title-preview">${highlight ? highlightText(previewText, highlight) : escapeHTML(previewText)}</div>
      </div>
      <span class="article-expand-icon">▾</span>
    </div>
    <div class="article-body">
      <div class="article-content">${contentFormatted}</div>
      <div class="article-footer">
        <span class="article-ref-label">Reference</span>
        <span class="article-dharaa">धारा ${article.article_number_np || article.article_number}</span>
        <span class="article-dharaa">Article ${article.article_number}</span>
        <button class="article-share-btn" data-url="${escapeHTML(articleURL)}" title="Copy link to this article">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Copy link
        </button>
      </div>
    </div>
  `;

  const header = card.querySelector('.article-header');
  header.addEventListener('click', () => {
    const expanded = card.classList.toggle('expanded');
    header.setAttribute('aria-expanded', expanded);
    if (expanded) {
      pushHash(`#article/${article.article_number}`);
    } else {
      const { data } = state;
      if (state.currentPartIndex !== null) {
        pushHash(`#part/${data.parts[state.currentPartIndex].part_number}`);
      }
    }
  });

  card.querySelector('.article-share-btn').addEventListener('click', e => {
    e.stopPropagation();
    copyToClipboard(e.currentTarget.dataset.url);
  });

  card.style.animationDelay = `${Math.min(aIdx * 0.03, 0.4)}s`;
  return card;
}

// ─── Format Article Content ────────────────────────────────────────────────────
function formatArticleContent(content, highlight = '') {
  if (!content) return '';
  let formatted = escapeHTML(content);
  if (highlight) formatted = highlightText(formatted, highlight);
  formatted = formatted.replace(/(\([\s\S]{1,4}?\))/g, (match) => {
    if (/^\([०-९क-ह\d]+\)$/.test(match.trim())) return `\n${match}`;
    return match;
  });
  return formatted;
}

// ─── Clipboard & Toast ────────────────────────────────────────────────────────
function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('✓  Link copied to clipboard'))
      .catch(() => showToast('Copy failed — please copy the URL manually'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('✓  Link copied to clipboard');
    } catch {
      showToast('Copy failed — please copy the URL manually');
    }
    document.body.removeChild(ta);
  }
}

let toastTimer = null;
function showToast(message) {
  const toast = $('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

// ─── Search ────────────────────────────────────────────────────────────────────
function onSearch(e) {
  const query = e.target.value.trim();
  state.searchQuery = query;
  els.searchClear.classList.toggle('visible', query.length > 0);
  clearTimeout(state.searchTimeout);

  if (!query) {
    els.searchCount.textContent = '';
    if (state.currentPartIndex !== null) showPart(state.currentPartIndex);
    else showWelcome();
    return;
  }
  state.searchTimeout = setTimeout(() => performSearch(query), 200);
}

function performSearch(query) {
  const { data } = state;
  const q       = query.toLowerCase();
  const results = [];

  data.parts.forEach((part, partIdx) => {
    part.articles.forEach((article, aIdx) => {
      if (
        article.title_np?.toLowerCase().includes(q) ||
        article.title_en?.toLowerCase().includes(q) ||
        article.content?.toLowerCase().includes(q) ||
        article.content_en?.toLowerCase().includes(q) ||
        part.title_en?.toLowerCase().includes(q)
      ) {
        results.push({ part, partIdx, article, aIdx });
      }
    });
  });

  els.searchCount.textContent = results.length > 0
    ? `${results.length} result${results.length === 1 ? '' : 's'} found`
    : '';

  els.welcomeScreen.style.display = 'none';
  els.partView.style.display      = 'none';
  els.searchView.style.display    = 'block';

  els.searchViewTitle.textContent = results.length
    ? `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`
    : `No results for "${query}"`;

  els.searchResultsList.innerHTML = '';

  if (results.length === 0) {
    els.searchResultsList.innerHTML = `
      <div class="no-results">
        <div style="font-size:32px;margin-bottom:12px;">🔍</div>
        No articles found for "<strong>${escapeHTML(query)}</strong>"<br/>
        <span style="font-size:13px;margin-top:8px;display:block;">
          Try searching in Nepali (Devanagari) or English
        </span>
      </div>`;
    return;
  }

  results.forEach(({ part, partIdx, article }, rIdx) => {
    const card = document.createElement('div');
    card.className = 'search-result-card';
    card.style.animationDelay = `${Math.min(rIdx * 0.03, 0.3)}s`;

    const excerpt = (article.content_en || article.content)
      ? getExcerpt(article.content_en || article.content, query, 160)
      : '';

    card.innerHTML = `
      <div class="search-result-header">
        <span class="search-result-part">Part ${part.part_number} · ${part.title_en || part.title_np}</span>
        <span class="search-result-article">Art. ${article.article_number}</span>
      </div>
      <div class="search-result-title">${highlightText(article.title_en || article.title_np, query)}</div>
      ${article.title_np ? `<div class="search-result-np">${escapeHTML(article.title_np)}</div>` : ''}
      <div class="search-result-excerpt">${highlightText(excerpt, query)}</div>
    `;

    card.addEventListener('click', () => {
      clearSearch();
      showPart(partIdx);
      setTimeout(() => {
        const artEl = document.getElementById(`article-${article.article_number}`);
        if (artEl) {
          artEl.classList.add('expanded');
          artEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          pushHash(`#article/${article.article_number}`);
        }
      }, 100);
    });

    els.searchResultsList.appendChild(card);
  });
}

function getExcerpt(text, query, maxLen) {
  const q   = query.toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text.substring(0, maxLen) + (text.length > maxLen ? '…' : '');
  const start   = Math.max(0, idx - 60);
  const end     = Math.min(text.length, idx + maxLen - 60);
  return (start > 0 ? '…' : '') + text.substring(start, end) + (end < text.length ? '…' : '');
}

function clearSearch() {
  els.searchInput.value       = '';
  state.searchQuery           = '';
  els.searchClear.classList.remove('visible');
  els.searchCount.textContent = '';
  if (state.currentPartIndex !== null) showPart(state.currentPartIndex);
  else showWelcome();
}

// ─── Welcome ───────────────────────────────────────────────────────────────────
function showWelcome(updateHash = true) {
  els.welcomeScreen.style.display = 'block';
  els.partView.style.display      = 'none';
  els.searchView.style.display    = 'none';
  document.querySelectorAll('.part-nav-item').forEach(el => el.classList.remove('active'));
  state.currentPartIndex = null;
  if (updateHash) pushHash('#');
}

// ─── Mobile Sidebar ────────────────────────────────────────────────────────────
function setupMobileSidebar() {
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id        = 'sidebarOverlay';
  document.body.appendChild(overlay);

  const toggleBtn = $('sidebarToggle');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleMobileSidebar);
  overlay.addEventListener('click', closeMobileSidebar);

  const headerInner = document.querySelector('.header-inner');
  if (headerInner) {
    const mobileMenuBtn = document.createElement('button');
    mobileMenuBtn.className = 'mobile-menu-btn';
    mobileMenuBtn.setAttribute('aria-label', 'Open navigation');
    mobileMenuBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>`;
    mobileMenuBtn.style.cssText = `
      display:none; border:none; background:rgba(255,255,255,0.1);
      border-radius:6px; padding:7px; cursor:pointer; color:#f0e8dc;
      margin-right:8px; order:-1;
    `;
    mobileMenuBtn.addEventListener('click', toggleMobileSidebar);

    const checkMobile = () => {
      mobileMenuBtn.style.display = window.innerWidth <= 720 ? 'flex' : 'none';
    };
    window.addEventListener('resize', checkMobile);
    checkMobile();
    headerInner.insertBefore(mobileMenuBtn, headerInner.firstChild);
  }
}

function toggleMobileSidebar() {
  els.sidebar.classList.toggle('open');
  const overlay = $('sidebarOverlay');
  if (overlay) overlay.classList.toggle('active');
}

function closeMobileSidebar() {
  els.sidebar.classList.remove('open');
  const overlay = $('sidebarOverlay');
  if (overlay) overlay.classList.remove('active');
}

// ─── Utilities ─────────────────────────────────────────────────────────────────
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function highlightText(text, query) {
  if (!query || !text) return escapeHTML(text);
  const escaped = escapeHTML(text);
  const q       = escapeHTML(query);
  const regex   = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escaped.replace(regex, '<mark>$1</mark>');
}

function padPart(num) { return String(num).padStart(2, '0'); }

function toNepaliNum(num) {
  const nepali = ['०','१','२','३','४','५','६','७','८','९'];
  return String(num).split('').map(d => nepali[parseInt(d)] || d).join('');
}

// ─── Keyboard Navigation ───────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    els.searchInput.focus();
    els.searchInput.select();
  }

  if (e.key === 'Escape') {
    if (state.searchQuery) clearSearch();
    else if (document.activeElement === els.searchInput) els.searchInput.blur();
  }

  if (!state.searchQuery && state.currentPartIndex !== null &&
      document.activeElement !== els.searchInput) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      const next = state.currentPartIndex + 1;
      if (next < state.data.parts.length) showPart(next);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      const prev = state.currentPartIndex - 1;
      if (prev >= 0) showPart(prev);
    }
  }
});

// ─── Theme ─────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('np-const-theme', theme); } catch (e) {}
}

function toggleTheme() {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
}

function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('np-const-theme'); } catch (e) {}
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));

  const btn = document.getElementById('themeToggle');
  if (btn) btn.addEventListener('click', toggleTheme);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ev => {
    let s = null;
    try { s = localStorage.getItem('np-const-theme'); } catch (e) {}
    if (!s) applyTheme(ev.matches ? 'dark' : 'light');
  });
}

// ─── Boot ──────────────────────────────────────────────────────────────────────
(function () {
  let saved = null;
  try { saved = localStorage.getItem('np-const-theme'); } catch (e) {}
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
}());

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  init();
});
