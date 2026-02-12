/**
 * Nepal Constitution Explorer — app.js
 * Loads constitution.json and renders an interactive navigation UI
 */

'use strict';

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  data: null,
  currentPartIndex: null,
  expandedArticles: new Set(),
  searchQuery: '',
  searchTimeout: null,
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const els = {
  partsNav:         $('partsNav'),
  welcomeScreen:    $('welcomeScreen'),
  partView:         $('partView'),
  partHeader:       $('partHeader'),
  articlesList:     $('articlesList'),
  searchView:       $('searchView'),
  searchViewTitle:  $('searchViewTitle'),
  searchResultsList:$('searchResultsList'),
  searchInput:      $('searchInput'),
  searchClear:      $('searchClear'),
  searchCount:      $('searchCount'),
  preambleText:     $('preambleText'),
  statParts:        $('statParts'),
  statArticles:     $('statArticles'),
  sidebar:          $('sidebar'),
};

// ─── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const res = await fetch('constitution.json');
    if (!res.ok) throw new Error('Failed to load constitution.json');
    state.data = await res.json();
    render();
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

  // Stats
  els.statParts.textContent = data.parts.length;
  els.statArticles.textContent = data.parts.reduce((a, p) => a + p.articles.length, 0);

  // Preamble
  els.preambleText.textContent = data.preamble || '(Preamble not available)';

  // Build sidebar nav
  els.partsNav.innerHTML = '';
  data.parts.forEach((part, idx) => {
    const item = document.createElement('div');
    item.className = 'part-nav-item';
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

  // Search
  els.searchInput.addEventListener('input', onSearch);
  els.searchClear.addEventListener('click', clearSearch);

  // Mobile sidebar
  setupMobileSidebar();
}

// ─── Show Part ─────────────────────────────────────────────────────────────────
function showPart(idx) {
  const { data } = state;
  const part = data.parts[idx];
  state.currentPartIndex = idx;
  state.expandedArticles.clear();

  // Update sidebar active state
  document.querySelectorAll('.part-nav-item').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });

  // Scroll sidebar item into view
  const activeEl = els.partsNav.querySelector('.part-nav-item.active');
  if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  // Switch views
  els.welcomeScreen.style.display = 'none';
  els.searchView.style.display = 'none';
  els.partView.style.display = 'block';

  // Clear search
  if (state.searchQuery) clearSearch();

  // Render part header
  const isFirst = idx === 0;
  const isLast = idx === data.parts.length - 1;

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
          <button class="part-nav-arrow" onclick="showPart(${idx + 1})" ${isLast ? 'disabled' : ''} title="Next Part">Next →</button>
        </div>
      </div>
    </div>
  `;

  // Render articles
  els.articlesList.innerHTML = '';
  part.articles.forEach((article, aIdx) => {
    const card = buildArticleCard(article, idx, aIdx);
    els.articlesList.appendChild(card);
  });

  // Scroll to top
  els.articlesList.parentElement.scrollTop = 0;
}

// ─── Build Article Card ────────────────────────────────────────────────────────
function buildArticleCard(article, partIdx, aIdx, highlight = '') {
  const card = document.createElement('div');
  card.className = 'article-card';
  card.id = `article-${article.article_number}`;

  const previewText = article.content
    ? article.content.substring(0, 120).replace(/\n/g, ' ') + (article.content.length > 120 ? '…' : '')
    : '';

  const contentFormatted = formatArticleContent(article.content, highlight);

  const enTitle = article.title_en || '';
  const enContent = article.content_en || '';
  const displayContent = enContent || article.content || '';
  previewText = displayContent
    ? displayContent.substring(0, 140).replace(/\n/g, ' ') + (displayContent.length > 140 ? '…' : '')
    : '';

  contentFormatted = formatArticleContent(displayContent, highlight);
  const hasEnglish = !!enContent;  card.innerHTML = `
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
      </div>
    </div>
  `;

  // Toggle expand
  const header = card.querySelector('.article-header');
  header.addEventListener('click', () => {
    const expanded = card.classList.toggle('expanded');
    header.setAttribute('aria-expanded', expanded);
  });

  // Apply staggered animation
  card.style.animationDelay = `${Math.min(aIdx * 0.03, 0.4)}s`;

  return card;
}

// ─── Format Article Content ────────────────────────────────────────────────────
function formatArticleContent(content, highlight = '') {
  if (!content) return '';

  // Split by clause markers like (१), (२), (क), (ख)
  let formatted = escapeHTML(content);

  // Highlight search terms
  if (highlight) {
    formatted = highlightText(formatted, highlight);
  }

  // Wrap numbered clauses for better readability
  formatted = formatted.replace(/(\([\s\S]{1,4}?\))/g, (match) => {
    // Only if it looks like a clause indicator
    if (/^\([०-९क-ह\d]+\)$/.test(match.trim())) {
      return `\n${match}`;
    }
    return match;
  });

  return formatted;
}

// ─── Search ────────────────────────────────────────────────────────────────────
function onSearch(e) {
  const query = e.target.value.trim();
  state.searchQuery = query;

  // Show/hide clear button
  els.searchClear.classList.toggle('visible', query.length > 0);

  clearTimeout(state.searchTimeout);

  if (!query) {
    els.searchCount.textContent = '';
    // Go back to previous view
    if (state.currentPartIndex !== null) {
      showPart(state.currentPartIndex);
    } else {
      showWelcome();
    }
    return;
  }

  // Debounce
  state.searchTimeout = setTimeout(() => performSearch(query), 200);
}

function performSearch(query) {
  const { data } = state;
  const q = query.toLowerCase();
  const results = [];

  data.parts.forEach((part, partIdx) => {
    part.articles.forEach((article, aIdx) => {
      const titleMatch = article.title_np?.toLowerCase().includes(q);
      const titleEnMatch = article.title_en?.toLowerCase().includes(q);
      const contentMatch = article.content?.toLowerCase().includes(q);
      const contentEnMatch = article.content_en?.toLowerCase().includes(q);
      const enTitle = part.title_en?.toLowerCase().includes(q);

      if (titleMatch || titleEnMatch || contentMatch || contentEnMatch || enTitle) {
        results.push({ part, partIdx, article, aIdx });
      }
    });
  });

  // Update count
  els.searchCount.textContent = results.length > 0
    ? `${results.length} result${results.length === 1 ? '' : 's'} found`
    : '';

  // Switch to search view
  els.welcomeScreen.style.display = 'none';
  els.partView.style.display = 'none';
  els.searchView.style.display = 'block';

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

  results.forEach(({ part, partIdx, article, aIdx }, rIdx) => {
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
      // Expand the article after rendering
      setTimeout(() => {
        const artEl = document.getElementById(`article-${article.article_number}`);
        if (artEl) {
          artEl.classList.add('expanded');
          artEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    });

    els.searchResultsList.appendChild(card);
  });
}

function getExcerpt(text, query, maxLen) {
  const q = query.toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text.substring(0, maxLen) + (text.length > maxLen ? '…' : '');

  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + maxLen - 60);
  const excerpt = (start > 0 ? '…' : '') + text.substring(start, end) + (end < text.length ? '…' : '');
  return excerpt;
}

function clearSearch() {
  els.searchInput.value = '';
  state.searchQuery = '';
  els.searchClear.classList.remove('visible');
  els.searchCount.textContent = '';

  if (state.currentPartIndex !== null) {
    showPart(state.currentPartIndex);
  } else {
    showWelcome();
  }
}

// ─── Welcome ───────────────────────────────────────────────────────────────────
function showWelcome() {
  els.welcomeScreen.style.display = 'block';
  els.partView.style.display = 'none';
  els.searchView.style.display = 'none';
  document.querySelectorAll('.part-nav-item').forEach(el => el.classList.remove('active'));
  state.currentPartIndex = null;
}

// ─── Mobile Sidebar ────────────────────────────────────────────────────────────
function setupMobileSidebar() {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id = 'sidebarOverlay';
  document.body.appendChild(overlay);

  const toggleBtn = $('sidebarToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleMobileSidebar);
  }

  overlay.addEventListener('click', closeMobileSidebar);

  // Also add a hamburger button to header for mobile
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

    // Show only on mobile via JS resize
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
  const q = escapeHTML(query);
  // Case-insensitive highlight
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escaped.replace(regex, '<mark>$1</mark>');
}

function padPart(num) {
  return String(num).padStart(2, '0');
}

function toNepaliNum(num) {
  const nepali = ['०','१','२','३','४','५','६','७','८','९'];
  return String(num).split('').map(d => nepali[parseInt(d)] || d).join('');
}

// ─── Keyboard Navigation ───────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + K → focus search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    els.searchInput.focus();
    els.searchInput.select();
  }

  // Escape → clear search or go home
  if (e.key === 'Escape') {
    if (state.searchQuery) {
      clearSearch();
    } else if (document.activeElement === els.searchInput) {
      els.searchInput.blur();
    }
  }

  // Arrow keys for part navigation (when not in search)
  if (!state.searchQuery && state.currentPartIndex !== null) {
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

// ─── Theme (Dark/Light Mode) ───────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('np-const-theme', theme); } catch(e) {}
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('np-const-theme'); } catch(e) {}
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));

  // Attach toggle button — runs after DOM is ready
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', toggleTheme);
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    let s = null;
    try { s = localStorage.getItem('np-const-theme'); } catch(e2) {}
    if (!s) applyTheme(e.matches ? 'dark' : 'light');
  });
}

// ─── Boot ──────────────────────────────────────────────────────────────────────
// Apply theme immediately (before full init) to avoid flash
(function() {
  let saved = null;
  try { saved = localStorage.getItem('np-const-theme'); } catch(e) {}
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
})();

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  init();
});