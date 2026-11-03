/**
 * Carmel Publications - catalogue site
 * Discovery (finder, search, filters), 3D book viewer, reading list sharing and enquiries.
 */
(function () {
  'use strict';

  const DATA = window.CATALOG_DATA || { books: [], categories: [], collections: [], publisher: {} };
  const BOOKS = DATA.books;
  const GRADE_ORDER = ['Nursery', 'LKG', 'UKG'].concat(Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`));
  const PRE_PRIMARY = ['Nursery', 'LKG', 'UKG'];
  const FEATURED_IDS = ['alphabet-galaxy', 'rhymes-balgeet-a', 'art-craft-1'];
  const STORAGE_KEY = 'carmel_saved_books';
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CAT_COLORS = {
    'early-childhood': '#3155E7',
    'handwriting': '#7928CA',
    'mathematics': '#0369A1',
    'hindi-literature': '#B91C1C',
    'rhymes-poetry': '#C2410C',
    'art-craft': '#047857'
  };

  const ICONS = {
    'early-childhood': '<path d="M12 2l2.4 6.9H22l-6 4.4 2.3 7-6.3-4.4-6.3 4.4 2.3-7-6-4.4h7.6z"/>',
    'handwriting': '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/>',
    'mathematics': '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>',
    'hindi-literature': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    'rhymes-poetry': '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    'art-craft': '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-4.9-4.5-9-10-9z"/>'
  };

  const svg = (inner, size = 22, extra = '') =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${inner}</svg>`;
  const HEART = '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>';
  const ARROW = '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '\u20B9' + n.toLocaleString('en-IN');
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const priceOf = (b) => parseInt(String(b.price).replace(/[^\d]/g, ''), 10) || 0;
  const bookById = (id) => BOOKS.find((b) => b.id === id);
  const catById = (id) => DATA.categories.find((c) => c.id === id);
  const collById = (id) => DATA.collections.find((c) => c.id === id);
  const catColor = (id) => (catById(id) || {}).accent || CAT_COLORS[id] || '#3155E7';

  // A level such as "Nursery / LKG", "Grade 5" or "Grade 6-8" expands to its individual grades.
  const levelTokens = (b) => b.level.split('/').flatMap((part) => {
    const t = part.trim();
    const range = t.match(/^Grade\s*(\d+)\s*(?:-|\u2013|to)\s*(?:Grade\s*)?(\d+)$/i);
    if (!range) return [t];
    const from = parseInt(range[1], 10);
    const to = parseInt(range[2], 10);
    return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => `Grade ${from + i}`);
  });
  const matchesGrade = (b, grade) => {
    const t = levelTokens(b);
    return t.includes(grade) || (t.includes('Pre-Primary') && PRE_PRIMARY.includes(grade));
  };
  const gradeRank = (b) => {
    const ranks = levelTokens(b).map((t) => (t === 'Pre-Primary' ? 0 : GRADE_ORDER.indexOf(t))).filter((i) => i >= 0);
    return ranks.length ? Math.min(...ranks) : 99;
  };
  // Only grades that actually have books are offered in the finder and filters.
  const GRADES = GRADE_ORDER.filter((g) => BOOKS.some((b) => matchesGrade(b, g)));

  const haystacks = new Map(BOOKS.map((b) => [b.id, [
    b.title, b.subtitle, b.category, b.collection, b.level, b.age_group, b.isbn,
    (b.isbn || '').replace(/-/g, ''), b.description, (b.highlights || []).join(' ')
  ].join(' ').toLowerCase()]));

  function loadSaved() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter((id) => bookById(id)) : [];
    } catch (e) {
      return [];
    }
  }

  const state = {
    category: 'all',
    collection: 'all',
    level: 'all',
    q: '',
    sort: 'featured',
    view: 'grid',
    saved: loadSaved(),
    sharedIds: null,
    finder: { grade: null, focus: new Set() },
    modal: { id: null, list: [], mode: 'front' }
  };

  const el = {
    header: $('#siteHeader'),
    progress: $('#scrollProgress'),
    backToTop: $('#backToTop'),
    savedBadge: $('#savedCountBadge'),
    grid: $('#booksGrid'),
    pills: $('#categoryPillsStrip'),
    search: $('#catalogueSearchInput'),
    searchClear: $('#searchClearBtn'),
    collectionSelect: $('#collectionSelect'),
    levelSelect: $('#levelSelect'),
    sortSelect: $('#sortSelect'),
    filtersToggle: $('#filtersToggle'),
    filterPanel: $('#filterPanel'),
    filtersCount: $('#filtersCount'),
    resultsCount: $('#resultsCountText'),
    chips: $('#activeFilterChips'),
    toasts: $('#toastContainer')
  };

  /* ------------------------------------------------------------------
     Layers: modals, drawers, menus (focus trap, scroll lock, Esc)
     ------------------------------------------------------------------ */
  const layers = [];
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function openLayer(layer, trigger, focusTarget) {
    if (layers.some((l) => l.el === layer)) return;
    layers.push({ el: layer, trigger: trigger || document.activeElement });
    layer.classList.add('active');
    layer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    const target = focusTarget || $(FOCUSABLE, layer);
    setTimeout(() => target && target.focus({ preventScroll: true }), 60);
  }

  function closeLayer(layer) {
    const idx = layers.findIndex((l) => l.el === layer);
    if (idx === -1) return;
    const [record] = layers.splice(idx, 1);
    layer.classList.remove('active');
    layer.setAttribute('aria-hidden', 'true');
    if (!layers.length) document.body.classList.remove('no-scroll');
    if (layer.id === 'previewModal') onModalClosed();
    if (layer.id === 'mobileNavDrawer') $('#mobileMenuBtn').setAttribute('aria-expanded', 'false');
    if (idx === layers.length && record.trigger && document.contains(record.trigger)) {
      record.trigger.focus({ preventScroll: true });
    }
  }

  const topLayer = () => (layers.length ? layers[layers.length - 1].el : null);

  function trapFocus(e) {
    const layer = topLayer();
    if (!layer || e.key !== 'Tab') return;
    const items = $$(FOCUSABLE, layer).filter((n) => n.getClientRects().length > 0);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ------------------------------------------------------------------
     Toasts & clipboard
     ------------------------------------------------------------------ */
  function showToast(message) {
    if (!el.toasts) return;
    while (el.toasts.children.length >= 3) el.toasts.firstElementChild.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `${svg('<polyline points="20 6 9 17 4 12"/>', 18, 'stroke="#D7F45B" stroke-width="2.5"')}<span>${esc(message)}</span>`;
    el.toasts.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      area.remove();
      return ok;
    }
  }

  /* ------------------------------------------------------------------
     URL state
     ------------------------------------------------------------------ */
  function baseUrl() {
    return location.origin !== 'null' ? location.origin + location.pathname : location.href.split(/[?#]/)[0];
  }

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.category !== 'all') p.set('category', state.category);
    if (state.collection !== 'all') p.set('collection', state.collection);
    if (state.level !== 'all') p.set('level', state.level);
    if (state.q.trim()) p.set('q', state.q.trim());
    if (state.sort !== 'featured') p.set('sort', state.sort);
    if (state.modal.id && layers.some((l) => l.el.id === 'previewModal')) p.set('book', state.modal.id);
    const qs = p.toString();
    try {
      history.replaceState({}, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    } catch (e) { /* file:// and sandboxed frames block replaceState */ }
  }

  /* ------------------------------------------------------------------
     Saved books (reading list)
     ------------------------------------------------------------------ */
  const isSaved = (id) => state.saved.includes(id);

  function persistSaved() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.saved)); } catch (e) { /* storage unavailable */ }
  }

  function toggleSave(id, silent) {
    const book = bookById(id);
    if (!book) return;
    const idx = state.saved.indexOf(id);
    if (idx > -1) {
      state.saved.splice(idx, 1);
      if (!silent) showToast(`Removed "${book.title}" from your list`);
    } else {
      state.saved.push(id);
      if (!silent) showToast(`Saved "${book.title}" to your list`);
    }
    persistSaved();
    syncSaved();
  }

  function saveMany(ids) {
    let added = 0;
    ids.forEach((id) => {
      if (!isSaved(id) && bookById(id)) {
        state.saved.push(id);
        added += 1;
      }
    });
    persistSaved();
    syncSaved();
    return added;
  }

  function applySaveState(btn) {
    const saved = isSaved(btn.dataset.save);
    btn.classList.toggle('saved', saved);
    btn.setAttribute('aria-pressed', String(saved));
    const title = btn.dataset.title || 'this book';
    if (btn.classList.contains('icon-only')) {
      btn.setAttribute('aria-label', saved ? `Remove ${title} from reading list` : `Save ${title} to reading list`);
    }
    const label = $('[data-save-label]', btn);
    if (label) label.textContent = btn.dataset.labelSaved && saved ? btn.dataset.labelSaved : (btn.dataset.labelIdle || label.textContent);
  }

  function syncSaved() {
    const count = state.saved.length;
    el.savedBadge.textContent = count;
    el.savedBadge.hidden = count === 0;
    $$('[data-save]:not(.saved-item-remove-btn)').forEach(applySaveState);
    renderFinderResults();
    if ($('#readingListDrawer').classList.contains('active')) renderDrawer();
  }

  /* ------------------------------------------------------------------
     Static section renderers (from catalogue data)
     ------------------------------------------------------------------ */
  function gradeRangeLabel() {
    if (!GRADES.length) return '-';
    const last = GRADES[GRADES.length - 1];
    return `${GRADES[0]}\u2013${last.replace('Grade ', '')}`;
  }

  function renderStats() {
    $('#statBooks').textContent = BOOKS.length;
    $('#statCategories').textContent = DATA.categories.length;
    $('#browseAllLabel').textContent = `Browse all ${BOOKS.length} books`;
    $('#statGrades').textContent = gradeRangeLabel();
    $('#aboutTitleCount').textContent = plural(BOOKS.length, 'book', 'books');
    $('#footerYear').textContent = new Date().getFullYear();
  }

  function renderCategories() {
    $('#categoriesGrid').innerHTML = DATA.categories.map((cat) => {
      const n = BOOKS.filter((b) => b.category_slug === cat.id).length;
      return `
        <a class="category-card reveal" href="#catalogue" data-goto-category="${esc(cat.id)}" style="--cat:${catColor(cat.id)}">
          <div class="cat-top">
            <span class="cat-icon-box">${svg(ICONS[cat.id] || ICONS['early-childhood'], 24)}</span>
            <span class="cat-count-pill">${plural(n, 'book', 'books')}</span>
          </div>
          <div class="cat-body">
            <h3 class="cat-title">${esc(cat.name)}</h3>
            <div class="cat-tagline">${esc(cat.tagline)}</div>
            <p class="cat-desc">${esc(cat.description)}</p>
          </div>
          <span class="cat-explore-link">View books ${svg(ARROW, 16)}</span>
        </a>`;
    }).join('');
  }

  function renderSpotlight() {
    $('#spotlightGrid').innerHTML = FEATURED_IDS.map(bookById).filter(Boolean).map((b, i) => {
      const tone = ['badge-primary', 'badge-secondary', 'badge-accent'][i % 3];
      return `
        <a class="spotlight-card reveal" href="?book=${esc(b.id)}" data-open-book="${esc(b.id)}">
          <span class="spotlight-cover-wrap">
            <img src="${esc(b.cover_front_webp)}" alt="" class="spotlight-cover-img" loading="lazy" decoding="async" data-fallback="${esc(b.cover_front_jpg)}">
          </span>
          <span class="spotlight-meta-pill">
            <span class="badge ${tone}">${esc(b.category)}</span>
            <span class="spotlight-age">${esc(b.age_group)}</span>
          </span>
          <span class="spotlight-title">${esc(b.title)}</span>
          <span class="spotlight-sub">${esc(b.subtitle)}</span>
          <span class="spotlight-footer">
            <span class="spotlight-price">${esc(b.price)}</span>
            <span class="spotlight-cta">View book ${svg(ARROW, 16)}</span>
          </span>
        </a>`;
    }).join('');
  }

  function renderCollections() {
    $('#collectionsGrid').innerHTML = DATA.collections.map((col) => {
      const books = BOOKS.filter((b) => b.collection_slug === col.id);
      const covers = books.slice(0, 3).map((b) =>
        `<img src="${esc(b.cover_front_webp)}" alt="" loading="lazy" decoding="async" data-fallback="${esc(b.cover_front_jpg)}">`).join('');
      return `
        <a class="collection-banner-card reveal" href="#catalogue" data-goto-collection="${esc(col.id)}">
          <div class="collection-covers" aria-hidden="true">${covers}</div>
          <span class="collection-badge-tag">${esc(col.badge)}</span>
          <div>
            <h3 class="collection-title">${esc(col.name)}</h3>
            <div class="collection-tagline">${esc(col.tagline)}</div>
            <p class="collection-desc">${esc(col.description)}</p>
          </div>
          <span class="collection-footer-cta">View ${plural(books.length, 'book', 'books')} ${svg(ARROW, 16)}</span>
        </a>`;
    }).join('');
  }

  function renderFooter() {
    $('#footerCategories').innerHTML = DATA.categories.map((c) =>
      `<li><a class="footer-link" href="#catalogue" data-goto-category="${esc(c.id)}">${esc(c.name)}</a></li>`).join('');
    $('#footerCollections').innerHTML = DATA.collections.map((c) =>
      `<li><a class="footer-link" href="#catalogue" data-goto-collection="${esc(c.id)}">${esc(c.name)}</a></li>`).join('');

    const p = DATA.publisher;
    const tel = (n) => `<a class="footer-link" href="tel:${esc(n.replace(/[^\d+]/g, ''))}">${esc(n)}</a>`;
    $('#footerContact').innerHTML = `
      <div class="contact-block"><strong>Head office</strong><span>${esc(p.head_office)}</span></div>
      <div class="contact-block"><strong>Branch office</strong><span>${esc(p.branch_office)}</span></div>
      <div class="contact-block"><strong>Call</strong><span>${tel(p.phone)} &middot; ${tel(p.phone_alt)}</span></div>
      <div class="contact-block"><strong>Email</strong><a class="footer-link" href="mailto:${esc(p.email)}">${esc(p.email)}</a></div>`;
    $('#inquiryEmailText').textContent = p.email;
  }

  /* ------------------------------------------------------------------
     Book Finder
     ------------------------------------------------------------------ */
  function renderFinderControls() {
    $('#gradePath').style.setProperty('--grades', GRADES.length);
    $('#gradePath').innerHTML = GRADES.map((g) => {
      const n = BOOKS.filter((b) => matchesGrade(b, g)).length;
      return `<button type="button" class="grade-node" role="radio" aria-checked="false" data-grade="${esc(g)}">
          <span class="grade-dot" aria-hidden="true"></span>
          <span class="grade-name">${esc(g)}</span>
          <span class="grade-count">${plural(n, 'book', 'books')}</span>
        </button>`;
    }).join('');

    $('#focusChips').innerHTML = DATA.categories.map((c) =>
      `<button type="button" class="focus-chip" aria-pressed="false" data-focus="${esc(c.id)}" style="--cat:${catColor(c.id)}">
        ${svg(ICONS[c.id] || ICONS['hindi-literature'], 16)}<span>${esc(c.name)}</span></button>`).join('');
  }

  function finderBooks() {
    const { grade, focus } = state.finder;
    if (!grade) return [];
    const order = DATA.categories.map((c) => c.id);
    return BOOKS
      .filter((b) => matchesGrade(b, grade) && (focus.size === 0 || focus.has(b.category_slug)))
      .sort((a, b) => order.indexOf(a.category_slug) - order.indexOf(b.category_slug) || gradeRank(a) - gradeRank(b) || a.title.localeCompare(b.title));
  }

  function renderFinderResults() {
    const box = $('#finderResults');
    if (!box) return;
    const { grade, focus } = state.finder;

    $$('.grade-node').forEach((n) => {
      const on = n.dataset.grade === grade;
      n.setAttribute('aria-checked', String(on));
      n.classList.toggle('active', on);
      n.tabIndex = on || (!grade && n === $('.grade-node')) ? 0 : -1;
    });
    $$('.focus-chip').forEach((c) => {
      const on = focus.has(c.dataset.focus);
      c.setAttribute('aria-pressed', String(on));
      c.classList.toggle('active', on);
    });

    if (!grade) {
      box.innerHTML = `<div class="finder-empty">${svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>', 28)}
        <p>Choose a grade above to see the books that fit.</p></div>`;
      return;
    }

    const list = finderBooks();
    if (!list.length) {
      box.innerHTML = `<div class="finder-empty"><p>No ${esc(grade)} books match those focus areas yet. Try removing one.</p></div>`;
      return;
    }

    const total = list.reduce((s, b) => s + priceOf(b), 0);
    const unsaved = list.filter((b) => !isSaved(b.id)).length;
    box.innerHTML = `
      <div class="finder-summary">
        <div class="finder-summary-text">
          <strong>${plural(list.length, 'book', 'books')} for ${esc(grade)}</strong>
          <span>Full set: ${money(total)}</span>
        </div>
        <div class="finder-actions">
          <button class="btn btn-primary btn-sm" type="button" data-action="finder-save-all" ${unsaved ? '' : 'disabled'}>
            ${unsaved ? `Save all ${list.length}` : 'All saved'}
          </button>
          <button class="btn btn-outline btn-sm" type="button" data-action="finder-view">Open in catalogue</button>
        </div>
      </div>
      <ul class="finder-shelf">
        ${list.map((b) => `
          <li class="shelf-item" style="--cat:${catColor(b.category_slug)}">
            <a class="shelf-cover" href="?book=${esc(b.id)}" data-open-book="${esc(b.id)}" aria-label="View ${esc(b.title)}">
              <img src="${esc(b.cover_front_webp)}" alt="" loading="lazy" decoding="async" data-fallback="${esc(b.cover_front_jpg)}">
            </a>
            <span class="shelf-cat">${esc(b.category)}</span>
            <span class="shelf-title">${esc(b.title)}</span>
            <span class="shelf-bottom">
              <span class="shelf-price">${esc(b.price)}</span>
              <button class="shelf-add icon-only" type="button" data-save="${esc(b.id)}" data-title="${esc(b.title)}"
                aria-pressed="${isSaved(b.id)}" aria-label="${isSaved(b.id) ? 'Remove' : 'Save'} ${esc(b.title)}">${svg(HEART, 16)}</button>
            </span>
          </li>`).join('')}
      </ul>`;
    $$('[data-save]', box).forEach(applySaveState);
  }

  function bindFinder() {
    const path = $('#gradePath');
    path.addEventListener('click', (e) => {
      const node = e.target.closest('.grade-node');
      if (!node) return;
      state.finder.grade = state.finder.grade === node.dataset.grade ? null : node.dataset.grade;
      renderFinderResults();
    });
    path.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      const nodes = $$('.grade-node', path);
      const current = nodes.findIndex((n) => n.dataset.grade === state.finder.grade);
      const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const next = nodes[(Math.max(current, 0) + dir + nodes.length) % nodes.length];
      e.preventDefault();
      state.finder.grade = next.dataset.grade;
      renderFinderResults();
      next.focus();
    });
    $('#focusChips').addEventListener('click', (e) => {
      const chip = e.target.closest('.focus-chip');
      if (!chip) return;
      const id = chip.dataset.focus;
      if (state.finder.focus.has(id)) state.finder.focus.delete(id);
      else state.finder.focus.add(id);
      renderFinderResults();
    });
  }

  /* ------------------------------------------------------------------
     Catalogue: filters, search, cards
     ------------------------------------------------------------------ */
  function getFiltered() {
    const tokens = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    return BOOKS.filter((b) => {
      if (state.category !== 'all' && b.category_slug !== state.category) return false;
      if (state.collection !== 'all' && b.collection_slug !== state.collection) return false;
      if (state.level !== 'all' && !matchesGrade(b, state.level)) return false;
      if (tokens.length) {
        const hay = haystacks.get(b.id);
        if (!tokens.every((t) => hay.includes(t))) return false;
      }
      return true;
    }).sort((a, b) => {
      switch (state.sort) {
        case 'title-asc': return a.title.localeCompare(b.title);
        case 'title-desc': return b.title.localeCompare(a.title);
        case 'price-low': return priceOf(a) - priceOf(b) || a.title.localeCompare(b.title);
        case 'price-high': return priceOf(b) - priceOf(a) || a.title.localeCompare(b.title);
        case 'grade': return gradeRank(a) - gradeRank(b) || a.title.localeCompare(b.title);
        default: return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      }
    });
  }

  function bookCardHtml(b, i) {
    const w = b.aspect_type === 'landscape' ? 540 : 480;
    const h = b.aspect_type === 'landscape' ? 432 : 632;
    return `
      <article class="book-card" data-id="${esc(b.id)}" style="--cat:${catColor(b.category_slug)};--i:${Math.min(i, 12)}">
        <a class="book-cover-container" href="?book=${esc(b.id)}" data-open-book="${esc(b.id)}" aria-label="View ${esc(b.title)}">
          <span class="book-cover-frame" data-aspect="${esc(b.aspect_type)}">
            <img src="${esc(b.cover_front_webp)}" alt="" width="${w}" height="${h}" loading="lazy" decoding="async" data-fallback="${esc(b.cover_front_jpg)}">
          </span>
          <span class="level-chip">${esc(b.level)}</span>
          <span class="cover-hover-overlay"><span class="hover-action-btn">${svg('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>', 16)} Quick view</span></span>
        </a>
        <button class="bookmark-icon-btn icon-only" type="button" data-save="${esc(b.id)}" data-title="${esc(b.title)}" aria-pressed="false">${svg(HEART, 18)}</button>
        <div class="book-info">
          <span class="book-cat-tag">${esc(b.category)}</span>
          <h3 class="book-card-title"><a href="?book=${esc(b.id)}" data-open-book="${esc(b.id)}">${esc(b.title)}</a></h3>
          <p class="book-card-subtitle">${esc(b.subtitle || b.description)}</p>
          <div class="book-card-footer">
            <span class="book-price-tag">${esc(b.price)}</span>
            <a class="preview-pill-btn" href="?book=${esc(b.id)}" data-open-book="${esc(b.id)}" aria-label="Details for ${esc(b.title)}">Details ${svg(ARROW, 14)}</a>
          </div>
        </div>
      </article>`;
  }

  function renderBooks() {
    const list = getFiltered();
    el.resultsCount.innerHTML = `Showing <strong>${list.length}</strong> of <strong>${BOOKS.length}</strong> books`;
    renderChips();
    updateFilterControls();

    if (!list.length) {
      el.grid.innerHTML = `
        <div class="catalogue-empty-state">
          <div class="empty-state-icon">${svg('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>', 32)}</div>
          <h3 class="empty-state-title">No books found</h3>
          <p class="empty-state-text">Nothing matches your search and filters. Try fewer filters or a different word.</p>
          <button class="btn btn-primary btn-sm" type="button" data-action="reset-filters">Reset filters</button>
        </div>`;
      return;
    }
    el.grid.innerHTML = list.map(bookCardHtml).join('');
    $$('[data-save]', el.grid).forEach(applySaveState);
  }

  function renderChips() {
    const chips = [];
    if (state.category !== 'all') chips.push(['category', (catById(state.category) || {}).name]);
    if (state.collection !== 'all') chips.push(['collection', (collById(state.collection) || {}).name]);
    if (state.level !== 'all') chips.push(['level', state.level]);
    if (state.q.trim()) chips.push(['q', `"${state.q.trim()}"`]);
    el.chips.innerHTML = chips.length
      ? chips.map(([type, label]) => `<span class="filter-chip"><span>${esc(label)}</span><button type="button" data-remove-chip="${type}" aria-label="Remove filter ${esc(label)}">&times;</button></span>`).join('')
        + '<button class="clear-all-filters-btn" type="button" data-action="reset-filters">Clear all</button>'
      : '';
  }

  function updateFilterControls() {
    $$('.category-pill', el.pills).forEach((p) => {
      const on = p.dataset.category === state.category;
      p.classList.toggle('active', on);
      p.setAttribute('aria-pressed', String(on));
    });
    el.collectionSelect.value = state.collection;
    el.levelSelect.value = state.level;
    el.sortSelect.value = state.sort;
    if (el.search.value !== state.q) el.search.value = state.q;
    el.searchClear.hidden = !state.q;
    const active = (state.collection !== 'all') + (state.level !== 'all') + (state.sort !== 'featured');
    el.filtersCount.textContent = active;
    el.filtersCount.hidden = active === 0;
  }

  function buildFilterControls() {
    el.pills.innerHTML = `<button type="button" class="category-pill" data-category="all" aria-pressed="true"><span>All books</span><span class="pill-count">${BOOKS.length}</span></button>`
      + DATA.categories.map((c) => {
        const n = BOOKS.filter((b) => b.category_slug === c.id).length;
        return `<button type="button" class="category-pill" data-category="${esc(c.id)}" aria-pressed="false" style="--cat:${catColor(c.id)}"><span>${esc(c.name)}</span><span class="pill-count">${n}</span></button>`;
      }).join('');

    el.collectionSelect.innerHTML = '<option value="all">All collections</option>'
      + DATA.collections.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    el.levelSelect.innerHTML = '<option value="all">All grades</option>'
      + GRADES.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
  }

  function applyFilters(changes, scroll) {
    Object.assign(state, changes);
    renderBooks();
    syncUrl();
    if (scroll) {
      const target = $('#catalogue');
      target.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'start' });
    }
  }

  const resetFilters = () => applyFilters({ category: 'all', collection: 'all', level: 'all', q: '', sort: 'featured' });

  function bindCatalogue() {
    let timer = null;
    el.search.addEventListener('input', () => {
      clearTimeout(timer);
      el.searchClear.hidden = !el.search.value;
      timer = setTimeout(() => applyFilters({ q: el.search.value }), 200);
    });
    el.searchClear.addEventListener('click', () => {
      applyFilters({ q: '' });
      el.search.focus();
    });
    el.pills.addEventListener('click', (e) => {
      const pill = e.target.closest('.category-pill');
      if (!pill) return;
      applyFilters({ category: pill.dataset.category });
      pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
    el.collectionSelect.addEventListener('change', () => applyFilters({ collection: el.collectionSelect.value }));
    el.levelSelect.addEventListener('change', () => applyFilters({ level: el.levelSelect.value }));
    el.sortSelect.addEventListener('change', () => applyFilters({ sort: el.sortSelect.value }));

    el.filtersToggle.addEventListener('click', () => {
      const open = el.filterPanel.classList.toggle('open');
      el.filtersToggle.setAttribute('aria-expanded', String(open));
    });

    [['grid', $('#viewGridBtn')], ['list', $('#viewListBtn')]].forEach(([mode, btn]) => {
      btn.addEventListener('click', () => {
        state.view = mode;
        el.grid.classList.toggle('list-view', mode === 'list');
        $('#viewGridBtn').classList.toggle('active', mode === 'grid');
        $('#viewListBtn').classList.toggle('active', mode === 'list');
        $('#viewGridBtn').setAttribute('aria-pressed', String(mode === 'grid'));
        $('#viewListBtn').setAttribute('aria-pressed', String(mode === 'list'));
      });
    });
  }

  /* ------------------------------------------------------------------
     Book modal with 3D viewer
     ------------------------------------------------------------------ */
  const modalEl = $('#previewModal');
  const stage = $('#coverStage');
  const scene = $('#book3dScene');
  const book3d = $('#book3d');
  const rot = { x: -8, y: -28, dragging: false, auto: true, raf: 0, lastX: 0, lastY: 0 };

  function openBook(id, trigger) {
    const book = bookById(id);
    if (!book) return;
    const filtered = getFiltered();
    const list = filtered.some((b) => b.id === id) ? filtered : BOOKS;
    state.modal = { id, list: list.map((b) => b.id), mode: 'front' };
    renderModal();
    if (layers.some((l) => l.el === modalEl)) return;
    layers.filter((l) => l.el !== modalEl && l.el.id === 'spotlightModal').forEach((l) => closeLayer(l.el));
    openLayer(modalEl, trigger, $('#modalCloseBtn'));
    syncUrl();
  }

  function renderModal() {
    const b = bookById(state.modal.id);
    if (!b) return;
    const idx = state.modal.list.indexOf(b.id);
    const mode = state.modal.mode;

    $('#modalCatBadge').textContent = b.category;
    $('#modalLevelBadge').textContent = b.level;
    $('#modalTitle').textContent = b.title;
    $('#modalSubtitle').textContent = b.subtitle || '';
    $('#modalPrice').textContent = b.price;
    $('#modalPages').textContent = b.pages ? `${b.pages} pages` : '-';
    $('#modalAge').textContent = b.age_group || '-';
    $('#modalIsbn').textContent = b.isbn || 'On request';
    $('#modalDesc').textContent = b.description;
    $('#modalHighlightsList').innerHTML = (b.highlights || []).map((h) =>
      `<li>${svg('<polyline points="20 6 9 17 4 12"/>', 16)}<span>${esc(h)}</span></li>`).join('');
    $('#modalPagerLabel').textContent = `${idx + 1} of ${state.modal.list.length}`;

    const img = $('#modalCoverImg');
    img.src = mode === 'spread' ? (b.cover_spread_webp || b.cover_spread_jpg) : (b.cover_front_webp || b.cover_front_jpg);
    img.alt = mode === 'spread' ? `${b.title} - full cover jacket (back, spine and front)` : `${b.title} front cover`;
    img.dataset.fallback = mode === 'spread' ? b.cover_spread_jpg : b.cover_front_jpg;

    stage.dataset.mode = mode;
    stage.dataset.aspect = b.aspect_type;
    $$('.view-switch-btn').forEach((btn) => {
      const on = btn.dataset.mode === mode;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', String(on));
    });
    setup3D(b);

    const save = $('#modalSaveBtn');
    save.dataset.save = b.id;
    save.dataset.title = b.title;
    save.dataset.labelIdle = 'Save to list';
    save.dataset.labelSaved = 'Saved to list';
    save.innerHTML = `${svg(HEART, 16)}<span data-save-label>Save to list</span>`;
    applySaveState(save);

    const dl = $('#modalDownloadBtn');
    dl.href = b.cover_spread_jpg;
    dl.setAttribute('download', `${b.id}-cover.jpg`);

    const related = BOOKS.filter((x) => x.collection_slug === b.collection_slug && x.id !== b.id).slice(0, 6);
    $('#modalRelated').innerHTML = related.length
      ? `<h3 class="modal-desc-heading">More in ${esc(b.collection)}</h3>
         <div class="related-row">${related.map((r) => `<button type="button" class="related-item" data-modal-go="${esc(r.id)}" aria-label="${esc(r.title)}" title="${esc(r.title)}"><img src="${esc(r.cover_front_webp)}" alt="" loading="lazy" decoding="async" data-fallback="${esc(r.cover_front_jpg)}"></button>`).join('')}</div>`
      : '';

    syncUrl();
  }

  function setMode(mode) {
    state.modal.mode = mode;
    renderModal();
    rot.auto = !REDUCED_MOTION;
    if (mode === '3d') startSpin();
    else stopSpin();
  }

  function navigateModal(dir) {
    const list = state.modal.list;
    const idx = list.indexOf(state.modal.id);
    state.modal.id = list[(idx + dir + list.length) % list.length];
    renderModal();
    $('#previewModalDialog').scrollTop = 0;
    if (state.modal.mode === '3d') startSpin();
  }

  function onModalClosed() {
    stopSpin();
    state.modal.id = null;
    syncUrl();
  }

  function setup3D(b) {
    const landscape = b.aspect_type === 'landscape';
    const w = landscape ? 300 : 230;
    const h = landscape ? 240 : 303;
    book3d.style.setProperty('--bw', w + 'px');
    book3d.style.setProperty('--bh', h + 'px');
    book3d.style.setProperty('--bd', '26px');
    const front = b.cover_front_webp;
    const spread = b.cover_spread_webp;
    $('.b3-front', book3d).style.backgroundImage = `url("${front}")`;
    $('.b3-back', book3d).style.backgroundImage = `url("${spread}")`;
    $('.b3-spine', book3d).style.backgroundImage = `url("${front}")`;
    applyRotation();
  }

  function applyRotation() {
    book3d.style.transform = `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`;
  }

  function spinLoop() {
    if (!rot.auto || rot.dragging || state.modal.mode !== '3d') { rot.raf = 0; return; }
    rot.y += 0.35;
    applyRotation();
    rot.raf = requestAnimationFrame(spinLoop);
  }

  function startSpin() {
    rot.x = -8;
    rot.y = -28;
    applyRotation();
    if (rot.auto && !rot.raf) rot.raf = requestAnimationFrame(spinLoop);
  }

  function stopSpin() {
    cancelAnimationFrame(rot.raf);
    rot.raf = 0;
  }

  function bind3D() {
    scene.addEventListener('pointerdown', (e) => {
      rot.dragging = true;
      rot.auto = false;
      rot.lastX = e.clientX;
      rot.lastY = e.clientY;
      scene.setPointerCapture(e.pointerId);
      scene.classList.add('dragging');
      $('#book3dHint').classList.add('hidden');
    });
    scene.addEventListener('pointermove', (e) => {
      if (!rot.dragging) return;
      rot.y += (e.clientX - rot.lastX) * 0.6;
      rot.x = Math.max(-30, Math.min(30, rot.x - (e.clientY - rot.lastY) * 0.3));
      rot.lastX = e.clientX;
      rot.lastY = e.clientY;
      applyRotation();
    });
    const end = () => {
      rot.dragging = false;
      scene.classList.remove('dragging');
    };
    scene.addEventListener('pointerup', end);
    scene.addEventListener('pointercancel', end);
    scene.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.stopPropagation();
      e.preventDefault();
      rot.auto = false;
      rot.y += e.key === 'ArrowLeft' ? -20 : 20;
      applyRotation();
    });
  }

  async function shareBook() {
    const b = bookById(state.modal.id);
    if (!b) return;
    const url = `${baseUrl()}?book=${encodeURIComponent(b.id)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${b.title} - Carmel Publications`, text: b.subtitle || b.title, url });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    showToast((await copyText(url)) ? 'Link to this book copied' : 'Could not copy the link');
  }

  /* ------------------------------------------------------------------
     Reading list drawer, sharing and printing
     ------------------------------------------------------------------ */
  const drawerEl = $('#readingListDrawer');

  function listIds() { return state.sharedIds || state.saved; }

  function listText(ids) {
    const books = ids.map(bookById).filter(Boolean);
    const total = books.reduce((s, b) => s + priceOf(b), 0);
    return [
      'Carmel Publications - reading list',
      '',
      ...books.map((b, i) => `${i + 1}. ${b.title} (${b.level}) - ${b.price}`),
      '',
      `Total: ${money(total)}`,
      `View online: ${listUrl(ids)}`
    ].join('\n');
  }

  const listUrl = (ids) => `${baseUrl()}?list=${ids.map(encodeURIComponent).join(',')}#catalogue`;

  function renderDrawer() {
    const shared = Boolean(state.sharedIds);
    const ids = listIds();
    const books = ids.map(bookById).filter(Boolean);
    const total = books.reduce((s, b) => s + priceOf(b), 0);

    $('#drawerTitle').textContent = shared ? 'Shared reading list' : 'My reading list';
    $('#savedItemsCountLabel').textContent = plural(books.length, 'book', 'books');
    $('#drawerTotal').hidden = !books.length;
    $('#drawerTotalValue').textContent = money(total);
    $('#drawerShareRow').hidden = !books.length;
    $('#clearSavedBtn').hidden = shared || !books.length;
    $('#inquireSavedBtn').disabled = !books.length;
    $('#inquireSavedBtn').innerHTML = shared ? '<span>Add all to my list</span>' : '<span>Request these books</span>';
    $('#inquireSavedBtn').dataset.mode = shared ? 'adopt' : 'inquire';

    const box = $('#savedItemsContainer');
    if (!books.length) {
      box.innerHTML = `<div class="drawer-empty">${svg(HEART, 44)}<p class="drawer-empty-title">Your reading list is empty</p>
        <p>Tap the heart on any book to collect it here, then share the list or request specimen copies.</p>
        <a class="btn btn-outline btn-sm" href="#finder" data-action="close-drawer">Try the Book Finder</a></div>`;
      return;
    }
    box.innerHTML = (shared ? '<p class="drawer-banner">Someone shared this list with you.</p>' : '')
      + '<ul class="saved-items-list">' + books.map((b) => `
        <li class="saved-item-card">
          <img src="${esc(b.cover_front_webp)}" alt="" class="saved-item-thumb" loading="lazy" decoding="async" data-fallback="${esc(b.cover_front_jpg)}">
          <div class="saved-item-info">
            <button type="button" class="saved-item-title" data-open-book="${esc(b.id)}">${esc(b.title)}</button>
            <div class="saved-item-cat">${esc(b.level)} &middot; ${esc(b.price)}</div>
          </div>
          ${shared ? '' : `<button class="saved-item-remove-btn" type="button" data-save="${esc(b.id)}" data-title="${esc(b.title)}" aria-label="Remove ${esc(b.title)}">${svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', 18)}</button>`}
        </li>`).join('') + '</ul>';
  }

  function openDrawer(trigger) {
    renderDrawer();
    openLayer(drawerEl, trigger, $('#readingListCloseBtn'));
  }

  function closeDrawer() {
    closeLayer(drawerEl);
    if (state.sharedIds) {
      state.sharedIds = null;
    }
  }

  function printList() {
    const ids = listIds();
    const books = ids.map(bookById).filter(Boolean);
    if (!books.length) return;
    const total = books.reduce((s, b) => s + priceOf(b), 0);
    const w = window.open('', '_blank');
    if (!w) { showToast('Allow pop-ups to print your list'); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Carmel Publications - reading list</title>
      <style>body{font-family:Arial,sans-serif;margin:32px;color:#171923}h1{font-size:22px;margin:0 0 4px}p{color:#555;margin:0 0 20px}
      table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #ddd;font-size:14px}
      td:last-child,th:last-child{text-align:right}tfoot td{font-weight:bold;border-bottom:0}</style></head><body>
      <h1>Carmel Publications</h1><p>Reading list &middot; ${esc(new Date().toLocaleDateString('en-IN'))}</p>
      <table><thead><tr><th>#</th><th>Title</th><th>Grade</th><th>ISBN</th><th>Price</th></tr></thead><tbody>
      ${books.map((b, i) => `<tr><td>${i + 1}</td><td>${esc(b.title)}</td><td>${esc(b.level)}</td><td>${esc(b.isbn || '')}</td><td>${esc(b.price)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="4">Total</td><td>${money(total)}</td></tr></tfoot></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  async function shareList() {
    const ids = listIds();
    if (!ids.length) return;
    const url = listUrl(ids);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Carmel Publications reading list', text: listText(ids), url });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    showToast((await copyText(url)) ? 'Shareable link copied' : 'Could not copy the link');
  }

  function bindDrawer() {
    $('#savedBooksBtn').addEventListener('click', (e) => openDrawer(e.currentTarget));
    $('#readingListCloseBtn').addEventListener('click', closeDrawer);
    $('#clearSavedBtn').addEventListener('click', () => {
      state.saved = [];
      persistSaved();
      syncSaved();
      showToast('Reading list cleared');
    });
    $('#copyListBtn').addEventListener('click', async () => {
      showToast((await copyText(listText(listIds()))) ? 'List copied to clipboard' : 'Could not copy the list');
    });
    $('#printListBtn').addEventListener('click', printList);
    $('#shareListBtn').addEventListener('click', shareList);
    $('#inquireSavedBtn').addEventListener('click', (e) => {
      if (e.currentTarget.dataset.mode === 'adopt') {
        const n = saveMany(state.sharedIds);
        state.sharedIds = null;
        showToast(n ? `Added ${plural(n, 'book', 'books')} to your list` : 'Those books are already on your list');
        renderDrawer();
        return;
      }
      const books = state.saved.map(bookById).filter(Boolean);
      closeDrawer();
      openInquiry(books.map((b) => `${b.title} (${b.level})`).join('\n'), e.currentTarget);
    });
  }

  /* ------------------------------------------------------------------
     Enquiry form (composes an email; nothing is stored)
     ------------------------------------------------------------------ */
  const inquiryEl = $('#inquiryModal');

  function openInquiry(booksText, trigger) {
    $('#inquiryBooks').value = booksText || '';
    openLayer(inquiryEl, trigger, $('#inqName'));
  }

  function bindInquiry() {
    $('#inquiryCloseBtn').addEventListener('click', () => closeLayer(inquiryEl));
    $('#inquiryForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const body = [
        'Hello Carmel Publications,',
        '',
        'I would like to request specimen copies / a catalogue.',
        '',
        'Books requested:',
        f.get('books') || 'Full catalogue',
        '',
        `Name: ${f.get('name')}`,
        `Role: ${f.get('role')}`,
        `Organisation: ${f.get('org')}`,
        `Phone: ${f.get('phone')}`,
        `Email: ${f.get('email')}`,
        `Delivery address: ${f.get('address') || '-'}`
      ].join('\n');
      const copied = await copyText(body);
      const mail = DATA.publisher.email;
      window.location.href = `mailto:${mail}?subject=${encodeURIComponent('Specimen copy request - ' + f.get('org'))}&body=${encodeURIComponent(body)}`;
      closeLayer(inquiryEl);
      showToast(copied ? 'Opening your email app. The request is also copied.' : 'Opening your email app...');
    });
  }

  /* ------------------------------------------------------------------
     Quick search (Ctrl/Cmd + K)
     ------------------------------------------------------------------ */
  const spotEl = $('#spotlightModal');
  const spotInput = $('#spotlightInput');
  const spot = { items: [], active: 0 };

  function openSpotlight(trigger) {
    spotInput.value = '';
    renderSpotlight2('');
    openLayer(spotEl, trigger, spotInput);
  }

  function renderSpotlight2(query) {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = tokens.length
      ? BOOKS.filter((b) => tokens.every((t) => haystacks.get(b.id).includes(t)))
        .sort((a, b) => Number(b.title.toLowerCase().includes(tokens[0])) - Number(a.title.toLowerCase().includes(tokens[0])))
      : BOOKS.filter((b) => b.featured).slice(0, 6);
    spot.items = matches.slice(0, 7).map((b) => ({ type: 'book', book: b }));
    if (tokens.length && matches.length > 7) spot.items.push({ type: 'all', count: matches.length, query });
    spot.active = 0;
    const box = $('#spotlightResults');

    if (!spot.items.length) {
      box.innerHTML = `<div class="spotlight-empty">No books found for "${esc(query)}"</div>`;
      return;
    }
    box.innerHTML = (tokens.length ? '' : '<div class="spotlight-group">Popular books</div>')
      + spot.items.map((it, i) => it.type === 'book'
        ? `<button type="button" role="option" id="sp-${i}" class="spotlight-result-row" data-spot="${i}" aria-selected="${i === 0}">
            <img src="${esc(it.book.cover_front_webp)}" alt="" class="spotlight-result-thumb" data-fallback="${esc(it.book.cover_front_jpg)}">
            <span><span class="spotlight-result-title">${esc(it.book.title)}</span>
            <span class="spotlight-result-cat">${esc(it.book.category)} &middot; ${esc(it.book.level)} &middot; ${esc(it.book.price)}</span></span>
          </button>`
        : `<button type="button" role="option" id="sp-${i}" class="spotlight-result-row spotlight-all" data-spot="${i}" aria-selected="${i === 0}">
            <span class="spotlight-result-title">See all ${it.count} results in the catalogue ${svg(ARROW, 16)}</span></button>`).join('');
    spotInput.setAttribute('aria-activedescendant', 'sp-0');
  }

  function moveSpot(dir) {
    if (!spot.items.length) return;
    spot.active = (spot.active + dir + spot.items.length) % spot.items.length;
    $$('.spotlight-result-row').forEach((r, i) => r.setAttribute('aria-selected', String(i === spot.active)));
    const row = $(`#sp-${spot.active}`);
    spotInput.setAttribute('aria-activedescendant', `sp-${spot.active}`);
    if (row) row.scrollIntoView({ block: 'nearest' });
  }

  function chooseSpot(i) {
    const item = spot.items[i];
    if (!item) return;
    closeLayer(spotEl);
    if (item.type === 'book') {
      openBook(item.book.id, $('#searchTriggerBtn'));
    } else {
      applyFilters({ category: 'all', collection: 'all', level: 'all', q: item.query }, true);
    }
  }

  function bindSpotlight() {
    $('#searchTriggerBtn').addEventListener('click', (e) => openSpotlight(e.currentTarget));
    $('#spotlightCloseBtn').addEventListener('click', () => closeLayer(spotEl));
    spotInput.addEventListener('input', () => renderSpotlight2(spotInput.value));
    spotInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSpot(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveSpot(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); chooseSpot(spot.active); }
    });
    $('#spotlightResults').addEventListener('click', (e) => {
      const row = e.target.closest('[data-spot]');
      if (row) chooseSpot(Number(row.dataset.spot));
    });
    $('#kbdHint').textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '\u2318 K' : 'Ctrl K';
  }

  /* ------------------------------------------------------------------
     Page behaviour: scroll, nav, hero parallax, reveal
     ------------------------------------------------------------------ */
  function bindScroll() {
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.header.classList.toggle('scrolled', y > 10);
      el.progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
      el.backToTop.hidden = y < 900;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();

    const toTop = () => window.scrollTo({ top: 0, behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
    el.backToTop.addEventListener('click', toTop);
    $('#footerTopBtn').addEventListener('click', toTop);
  }

  function bindScrollSpy() {
    const links = new Map($$('.nav-link').map((a) => [a.dataset.section, a]));
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a, id) => {
          const on = id === entry.target.id;
          a.classList.toggle('active', on);
          if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    links.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  function bindReveal() {
    const items = $$('.reveal');
    if (!('IntersectionObserver' in window) || REDUCED_MOTION) {
      items.forEach((n) => n.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const node = entry.target;
          node.classList.add('in-view');
          io.unobserve(node);
          // Drop the reveal classes once settled so hover transforms/transitions work normally.
          setTimeout(() => node.classList.remove('reveal', 'in-view'), 1200);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach((n, i) => {
      n.style.setProperty('--reveal-delay', `${(i % 3) * 70}ms`);
      io.observe(n);
    });
  }

  function bindHeroParallax() {
    const box = $('#heroShowcase');
    if (!box || REDUCED_MOTION || !window.matchMedia('(hover: hover)').matches) return;
    let raf = 0;
    box.parentElement.addEventListener('pointermove', (e) => {
      const r = box.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        box.style.setProperty('--mx', mx.toFixed(3));
        box.style.setProperty('--my', my.toFixed(3));
      });
    });
    box.parentElement.addEventListener('pointerleave', () => {
      box.style.setProperty('--mx', 0);
      box.style.setProperty('--my', 0);
    });
  }

  /* ------------------------------------------------------------------
     Global events (delegated)
     ------------------------------------------------------------------ */
  function bindGlobal() {
    document.addEventListener('click', (e) => {
      const open = e.target.closest('[data-open-book]');
      if (open && !(e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1)) {
        e.preventDefault();
        if (open.closest('#readingListDrawer')) closeDrawer();
        openBook(open.dataset.openBook, open);
        return;
      }

      const saveBtn = e.target.closest('[data-save]');
      if (saveBtn) {
        toggleSave(saveBtn.dataset.save);
        return;
      }

      const goCat = e.target.closest('[data-goto-category]');
      const goCol = e.target.closest('[data-goto-collection]');
      if (goCat || goCol) {
        e.preventDefault();
        if (layers.length && layers[layers.length - 1].el === $('#mobileNavDrawer')) closeLayer($('#mobileNavDrawer'));
        applyFilters({
          category: goCat ? goCat.dataset.gotoCategory : 'all',
          collection: goCol ? goCol.dataset.gotoCollection : 'all',
          level: 'all',
          q: ''
        }, true);
        return;
      }

      const inq = e.target.closest('[data-open-inquiry]');
      if (inq) {
        closeLayer($('#mobileNavDrawer'));
        openInquiry('', inq);
        return;
      }

      const go = e.target.closest('[data-modal-go]');
      if (go) {
        state.modal.id = go.dataset.modalGo;
        if (!state.modal.list.includes(state.modal.id)) state.modal.list = BOOKS.map((b) => b.id);
        renderModal();
        $('#previewModalDialog').scrollTop = 0;
        return;
      }

      const chip = e.target.closest('[data-remove-chip]');
      if (chip) {
        const map = { category: { category: 'all' }, collection: { collection: 'all' }, level: { level: 'all' }, q: { q: '' } };
        applyFilters(map[chip.dataset.removeChip]);
        return;
      }

      const action = e.target.closest('[data-action]');
      if (action) {
        switch (action.dataset.action) {
          case 'reset-filters': resetFilters(); break;
          case 'close-drawer': closeDrawer(); break;
          case 'finder-save-all': {
            const n = saveMany(finderBooks().map((b) => b.id));
            if (n) showToast(`Saved ${plural(n, 'book', 'books')} to your list`);
            break;
          }
          case 'finder-view': {
            const g = state.finder.grade;
            const cats = Array.from(state.finder.focus);
            applyFilters({ category: cats.length === 1 ? cats[0] : 'all', collection: 'all', level: g || 'all', q: '' }, true);
            break;
          }
          default: break;
        }
        return;
      }

      const backdrop = e.target;
      if (backdrop.classList && backdrop.classList.contains('modal-backdrop') && backdrop.id) closeLayer(backdrop);
      if (backdrop.classList && backdrop.classList.contains('drawer-backdrop')) closeDrawer();
      if (backdrop.classList && backdrop.classList.contains('mobile-nav-backdrop')) closeLayer(backdrop);

      const anchor = e.target.closest('a[href^="#"]');
      if (anchor && anchor.closest('#mobileNavDrawer')) closeLayer($('#mobileNavDrawer'));
    });

    document.addEventListener('error', (e) => {
      const img = e.target;
      if (img.tagName === 'IMG' && img.dataset.fallback && img.src.indexOf(img.dataset.fallback) === -1) {
        img.src = img.dataset.fallback;
      }
    }, true);

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (topLayer() === spotEl) closeLayer(spotEl); else openSpotlight(document.activeElement);
        return;
      }
      if (e.key === 'Escape' && layers.length) {
        const layer = topLayer();
        if (layer === drawerEl) closeDrawer(); else closeLayer(layer);
        return;
      }
      if (e.key === 'Tab') trapFocus(e);
      if (topLayer() === modalEl && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const tag = (e.target.tagName || '').toLowerCase();
        if (['input', 'select', 'textarea'].includes(tag)) return;
        navigateModal(e.key === 'ArrowLeft' ? -1 : 1);
      }
    });

    $('#modalCloseBtn').addEventListener('click', () => closeLayer(modalEl));
    $('#modalPrevBtn').addEventListener('click', () => navigateModal(-1));
    $('#modalNextBtn').addEventListener('click', () => navigateModal(1));
    $$('.view-switch-btn').forEach((btn) => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
    $('#modalShareBtn').addEventListener('click', shareBook);
    $('#modalInquireBtn').addEventListener('click', (e) => {
      const b = bookById(state.modal.id);
      openInquiry(b ? `${b.title} (${b.level})` : '', e.currentTarget);
    });

    const menuBtn = $('#mobileMenuBtn');
    menuBtn.addEventListener('click', () => {
      menuBtn.setAttribute('aria-expanded', 'true');
      openLayer($('#mobileNavDrawer'), menuBtn, $('#mobileNavClose'));
    });
    $('#mobileNavClose').addEventListener('click', () => closeLayer($('#mobileNavDrawer')));
  }

  /* ------------------------------------------------------------------
     Init
     ------------------------------------------------------------------ */
  function parseUrl() {
    const p = new URLSearchParams(location.search);
    const cat = p.get('category');
    const col = p.get('collection');
    const lvl = GRADES.find((g) => g.toLowerCase() === (p.get('level') || '').toLowerCase());
    if (cat && catById(cat)) state.category = cat;
    if (col && collById(col)) state.collection = col;
    if (lvl) state.level = lvl;
    if (p.get('q')) state.q = p.get('q').slice(0, 80);
    if (['grade', 'title-asc', 'title-desc', 'price-low', 'price-high'].includes(p.get('sort'))) state.sort = p.get('sort');

    const shared = (p.get('list') || '').split(',').filter((id) => bookById(id));
    return { book: p.get('book'), shared };
  }

  function init() {
    renderStats();
    renderCategories();
    renderSpotlight();
    renderCollections();
    renderFooter();
    renderFinderControls();
    buildFilterControls();

    const url = parseUrl();
    renderFinderResults();
    renderBooks();
    syncSaved();

    bindFinder();
    bindCatalogue();
    bind3D();
    bindDrawer();
    bindInquiry();
    bindSpotlight();
    bindScroll();
    bindScrollSpy();
    bindReveal();
    bindHeroParallax();
    bindGlobal();

    if (url.shared.length) {
      state.sharedIds = url.shared;
      openDrawer(null);
    } else if (url.book && bookById(url.book)) {
      openBook(url.book, null);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
