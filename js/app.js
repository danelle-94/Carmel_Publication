/**
 * Carmel Publications - Interactive Catalog Engine
 * Complete interactive logic for discovery, search, filtering, 3D preview, bookmarks & specimen inquiry
 */

(function () {
  'use strict';

  // State Management
  const state = {
    books: window.CATALOG_DATA ? window.CATALOG_DATA.books : [],
    categories: window.CATALOG_DATA ? window.CATALOG_DATA.categories : [],
    collections: window.CATALOG_DATA ? window.CATALOG_DATA.collections : [],
    activeCategory: 'all',
    activeCollection: 'all',
    activeLevel: 'all',
    searchQuery: '',
    sortBy: 'featured',
    currentView: 'grid',
    savedBookIds: JSON.parse(localStorage.getItem('carmel_saved_books') || '[]'),
    activeModalBookIndex: 0,
    modalCoverMode: 'front' // 'front' or 'spread'
  };

  // DOM Elements
  const elements = {
    // Nav & Header
    header: document.querySelector('.site-header'),
    savedCountPill: document.getElementById('savedCountBadge'),
    searchTriggerBtn: document.getElementById('searchTriggerBtn'),
    savedBooksBtn: document.getElementById('savedBooksBtn'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mobileNavDrawer: document.getElementById('mobileNavDrawer'),
    mobileNavClose: document.getElementById('mobileNavClose'),

    // Catalogue Controls
    catalogueSearchInput: document.getElementById('catalogueSearchInput'),
    searchClearBtn: document.getElementById('searchClearBtn'),
    categoryPillsStrip: document.getElementById('categoryPillsStrip'),
    collectionSelect: document.getElementById('collectionSelect'),
    levelSelect: document.getElementById('levelSelect'),
    sortSelect: document.getElementById('sortSelect'),
    viewGridBtn: document.getElementById('viewGridBtn'),
    viewListBtn: document.getElementById('viewListBtn'),
    activeFilterChips: document.getElementById('activeFilterChips'),
    resultsCountText: document.getElementById('resultsCountText'),
    booksGrid: document.getElementById('booksGrid'),

    // Modals
    previewModal: document.getElementById('previewModal'),
    previewModalDialog: document.getElementById('previewModalDialog'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalPrevBtn: document.getElementById('modalPrevBtn'),
    modalNextBtn: document.getElementById('modalNextBtn'),
    modalCoverImg: document.getElementById('modalCoverImg'),
    modalCoverToggleFront: document.getElementById('modalCoverToggleFront'),
    modalCoverToggleSpread: document.getElementById('modalCoverToggleSpread'),
    modalCatBadge: document.getElementById('modalCatBadge'),
    modalLevelBadge: document.getElementById('modalLevelBadge'),
    modalTitle: document.getElementById('modalTitle'),
    modalSubtitle: document.getElementById('modalSubtitle'),
    modalPrice: document.getElementById('modalPrice'),
    modalPages: document.getElementById('modalPages'),
    modalIsbn: document.getElementById('modalIsbn'),
    modalFormat: document.getElementById('modalFormat'),
    modalDesc: document.getElementById('modalDesc'),
    modalHighlightsList: document.getElementById('modalHighlightsList'),
    modalPdfBtn: document.getElementById('modalPdfBtn'),
    modalSaveBtn: document.getElementById('modalSaveBtn'),
    modalInquireBtn: document.getElementById('modalInquireBtn'),

    // Reading List Drawer
    readingListDrawer: document.getElementById('readingListDrawer'),
    readingListCloseBtn: document.getElementById('readingListCloseBtn'),
    savedItemsContainer: document.getElementById('savedItemsContainer'),
    savedItemsCountLabel: document.getElementById('savedItemsCountLabel'),
    clearSavedBtn: document.getElementById('clearSavedBtn'),
    inquireSavedBtn: document.getElementById('inquireSavedBtn'),

    // Inquiry Modal
    inquiryModal: document.getElementById('inquiryModal'),
    inquiryCloseBtn: document.getElementById('inquiryCloseBtn'),
    inquiryForm: document.getElementById('inquiryForm'),
    inquiryBookTitleInput: document.getElementById('inquiryBookTitleInput'),

    // Spotlight Search Modal
    spotlightModal: document.getElementById('spotlightModal'),
    spotlightCloseBtn: document.getElementById('spotlightCloseBtn'),
    spotlightInput: document.getElementById('spotlightInput'),
    spotlightResults: document.getElementById('spotlightResults'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  /**
   * Initialize Website
   */
  function init() {
    setupHeaderScroll();
    renderCategoryPills();
    renderBooks();
    updateSavedCountBadge();
    bindEvents();
    parseUrlState();
    setup3DTilt();
  }

  /**
   * Sticky Header Shadow on Scroll
   */
  function setupHeaderScroll() {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        elements.header.classList.add('scrolled');
      } else {
        elements.header.classList.remove('scrolled');
      }
    });
  }

  /**
   * Render Category Filter Pills
   */
  function renderCategoryPills() {
    if (!elements.categoryPillsStrip) return;
    const totalCount = state.books.length;

    let html = `
      <button class="category-pill active" data-category="all">
        <span>All Publications</span>
        <span class="pill-count">${totalCount}</span>
      </button>
    `;

    state.categories.forEach(cat => {
      html += `
        <button class="category-pill" data-category="${cat.id}">
          <span>${cat.name}</span>
          <span class="pill-count">${cat.count}</span>
        </button>
      `;
    });

    elements.categoryPillsStrip.innerHTML = html;
  }

  /**
   * Filter and Sort Books
   */
  function getFilteredBooks() {
    return state.books.filter(book => {
      // Category filter
      if (state.activeCategory !== 'all' && book.category_slug !== state.activeCategory) {
        return false;
      }
      // Collection filter
      if (state.activeCollection !== 'all' && book.collection_slug !== state.activeCollection) {
        return false;
      }
      // Level filter
      if (state.activeLevel !== 'all' && !book.level.toLowerCase().includes(state.activeLevel.toLowerCase())) {
        return false;
      }
      // Search Query filter
      if (state.searchQuery.trim() !== '') {
        const query = state.searchQuery.toLowerCase().trim();
        const matchTitle = book.title.toLowerCase().includes(query);
        const matchSub = (book.subtitle || '').toLowerCase().includes(query);
        const matchCat = book.category.toLowerCase().includes(query);
        const matchCollection = (book.collection || '').toLowerCase().includes(query);
        const matchIsbn = (book.isbn || '').toLowerCase().includes(query);
        const matchDesc = (book.description || '').toLowerCase().includes(query);
        if (!matchTitle && !matchSub && !matchCat && !matchCollection && !matchIsbn && !matchDesc) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (state.sortBy === 'title-asc') {
        return a.title.localeCompare(b.title);
      } else if (state.sortBy === 'title-desc') {
        return b.title.localeCompare(a.title);
      } else if (state.sortBy === 'price-low') {
        const pA = parseInt(a.price.replace(/[^\d]/g, ''), 10) || 0;
        const pB = parseInt(b.price.replace(/[^\d]/g, ''), 10) || 0;
        return pA - pB;
      } else if (state.sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      // Default 'featured'
      if (a.featured === b.featured) return 0;
      return a.featured ? -1 : 1;
    });
  }

  /**
   * Render Book Cards in Catalogue
   */
  function renderBooks() {
    const filtered = getFilteredBooks();
    updateResultsSummary(filtered.length);
    renderActiveFilterChips();

    if (!elements.booksGrid) return;

    if (filtered.length === 0) {
      elements.booksGrid.innerHTML = `
        <div class="catalogue-empty-state">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </div>
          <h3 class="empty-state-title">No Publications Found</h3>
          <p class="empty-state-text">We couldn't find any books matching your current search or filter combination. Try clearing filters to view all available titles.</p>
          <button class="btn btn-primary btn-sm" id="resetFiltersEmptyBtn">Reset All Filters</button>
        </div>
      `;
      const resetBtn = document.getElementById('resetFiltersEmptyBtn');
      if (resetBtn) resetBtn.addEventListener('click', clearAllFilters);
      return;
    }

    let html = '';
    filtered.forEach(book => {
      const isSaved = state.savedBookIds.includes(book.id);
      const isLandscape = book.aspect_type === 'landscape';

      html += `
        <article class="book-card" data-id="${book.id}" data-aspect="${book.aspect_type}">
          <div class="book-cover-container" onclick="window.CarmelApp.openBookModal('${book.id}')">
            <div class="book-cover-3d">
              <img src="${book.cover_front_webp}" alt="${book.title} Cover" loading="lazy" onerror="this.src='${book.cover_front_jpg}'" />
            </div>

            <div class="cover-hover-overlay">
              <button class="hover-action-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>Quick View</span>
              </button>
            </div>

            <button class="bookmark-icon-btn ${isSaved ? 'saved' : ''}" 
                    title="${isSaved ? 'Remove from Saved' : 'Save to Reading List'}" 
                    onclick="event.stopPropagation(); window.CarmelApp.toggleSaveBook('${book.id}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${isSaved ? '#DC2626' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>

          <div class="book-info">
            <div class="book-card-meta-row">
              <span class="book-cat-tag">${book.category}</span>
              <span class="book-level-pill">${book.level}</span>
            </div>

            <h3 class="book-card-title" title="${book.title}" onclick="window.CarmelApp.openBookModal('${book.id}')" style="cursor: pointer;">
              ${book.title}
            </h3>
            
            <p class="book-card-subtitle">${book.subtitle || book.description}</p>

            <div class="book-card-footer">
              <span class="book-price-tag">${book.price}</span>
              <div class="book-card-actions">
                <a href="${book.cover_pdf}" target="_blank" class="btn-icon" style="width: 32px; height: 32px;" title="View PDF Cover Sheet" onclick="event.stopPropagation();">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </a>
                <button class="preview-pill-btn" onclick="window.CarmelApp.openBookModal('${book.id}')">
                  Inspect &rarr;
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    });

    elements.booksGrid.innerHTML = html;
  }

  /**
   * Update Result Counter Text
   */
  function updateResultsSummary(count) {
    if (!elements.resultsCountText) return;
    elements.resultsCountText.innerHTML = `Showing <strong>${count}</strong> of <strong>${state.books.length}</strong> publications`;
  }

  /**
   * Render Active Filter Chips
   */
  function renderActiveFilterChips() {
    if (!elements.activeFilterChips) return;
    let chips = [];

    if (state.activeCategory !== 'all') {
      const cat = state.categories.find(c => c.id === state.activeCategory);
      if (cat) {
        chips.push({
          type: 'category',
          label: cat.name,
          remove: () => setCategory('all')
        });
      }
    }

    if (state.activeCollection !== 'all') {
      const col = state.collections.find(c => c.id === state.activeCollection);
      if (col) {
        chips.push({
          type: 'collection',
          label: col.name,
          remove: () => {
            state.activeCollection = 'all';
            if (elements.collectionSelect) elements.collectionSelect.value = 'all';
            renderBooks();
          }
        });
      }
    }

    if (state.activeLevel !== 'all') {
      chips.push({
        type: 'level',
        label: `Level: ${state.activeLevel.toUpperCase()}`,
        remove: () => {
          state.activeLevel = 'all';
          if (elements.levelSelect) elements.levelSelect.value = 'all';
          renderBooks();
        }
      });
    }

    if (state.searchQuery.trim() !== '') {
      chips.push({
        type: 'search',
        label: `"${state.searchQuery}"`,
        remove: () => {
          state.searchQuery = '';
          if (elements.catalogueSearchInput) elements.catalogueSearchInput.value = '';
          if (elements.searchClearBtn) elements.searchClearBtn.classList.remove('visible');
          renderBooks();
        }
      });
    }

    if (chips.length === 0) {
      elements.activeFilterChips.innerHTML = '';
      return;
    }

    let html = chips.map(chip => `
      <span class="filter-chip">
        <span>${chip.label}</span>
        <button onclick="window.CarmelApp.removeChip('${chip.type}')" title="Remove filter">&times;</button>
      </span>
    `).join('');

    html += `<span class="clear-all-filters-btn" onclick="window.CarmelApp.clearAllFilters()">Clear All</span>`;
    elements.activeFilterChips.innerHTML = html;
  }

  /**
   * Category Filter Action
   */
  function setCategory(categoryId) {
    state.activeCategory = categoryId;

    // Update Pill Active Classes
    const pills = document.querySelectorAll('.category-pill');
    pills.forEach(pill => {
      if (pill.dataset.category === categoryId) {
        pill.classList.add('active');
        // Scroll pill into view smoothly
        pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        pill.classList.remove('active');
      }
    });

    renderBooks();
    updateUrlQuery();
  }

  /**
   * Clear All Filters
   */
  function clearAllFilters() {
    state.activeCategory = 'all';
    state.activeCollection = 'all';
    state.activeLevel = 'all';
    state.searchQuery = '';
    state.sortBy = 'featured';

    if (elements.catalogueSearchInput) elements.catalogueSearchInput.value = '';
    if (elements.searchClearBtn) elements.searchClearBtn.classList.remove('visible');
    if (elements.collectionSelect) elements.collectionSelect.value = 'all';
    if (elements.levelSelect) elements.levelSelect.value = 'all';
    if (elements.sortSelect) elements.sortSelect.value = 'featured';

    const pills = document.querySelectorAll('.category-pill');
    pills.forEach(pill => {
      if (pill.dataset.category === 'all') pill.classList.add('active');
      else pill.classList.remove('active');
    });

    renderBooks();
    updateUrlQuery();
    showToast('Filters cleared');
  }

  /**
   * Open Quick View Modal for a Specific Book
   */
  function openBookModal(bookId) {
    const bookIndex = state.books.findIndex(b => b.id === bookId);
    if (bookIndex === -1) return;

    state.activeModalBookIndex = bookIndex;
    state.modalCoverMode = 'front';
    populateModalWithBook(state.books[bookIndex]);

    elements.previewModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Populate Modal UI
   */
  function populateModalWithBook(book) {
    const isSaved = state.savedBookIds.includes(book.id);

    // Update Cover
    elements.modalCoverImg.src = (state.modalCoverMode === 'spread') 
      ? (book.cover_spread_webp || book.cover_spread_jpg) 
      : (book.cover_front_webp || book.cover_front_jpg);
    elements.modalCoverImg.alt = `${book.title} Cover`;

    // Toggle Buttons Active State
    if (elements.modalCoverToggleFront && elements.modalCoverToggleSpread) {
      if (state.modalCoverMode === 'spread') {
        elements.modalCoverToggleSpread.classList.add('active');
        elements.modalCoverToggleFront.classList.remove('active');
      } else {
        elements.modalCoverToggleFront.classList.add('active');
        elements.modalCoverToggleSpread.classList.remove('active');
      }
    }

    // Text & Metadata
    elements.modalCatBadge.textContent = book.category;
    elements.modalLevelBadge.textContent = book.level;
    elements.modalTitle.textContent = book.title;
    elements.modalSubtitle.textContent = book.subtitle || '';
    elements.modalPrice.textContent = book.price;
    elements.modalPages.textContent = `${book.pages} Pages`;
    elements.modalIsbn.textContent = book.isbn || 'Available on request';
    elements.modalFormat.textContent = book.format || 'Full Color';
    elements.modalDesc.textContent = book.description;

    // Highlights
    if (elements.modalHighlightsList) {
      if (book.highlights && book.highlights.length > 0) {
        elements.modalHighlightsList.innerHTML = book.highlights.map(h => `
          <li>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>${h}</span>
          </li>
        `).join('');
      } else {
        elements.modalHighlightsList.innerHTML = '';
      }
    }

    // Links & Actions
    elements.modalPdfBtn.href = book.cover_pdf;

    elements.modalSaveBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="${isSaved ? '#DC2626' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
      <span>${isSaved ? 'Saved in Reading List' : 'Save to Reading List'}</span>
    `;
    elements.modalSaveBtn.onclick = () => {
      toggleSaveBook(book.id);
      populateModalWithBook(book);
    };

    elements.modalInquireBtn.onclick = () => {
      openInquiryModal(book.title);
    };
  }

  /**
   * Close Quick View Modal
   */
  function closeBookModal() {
    elements.previewModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  /**
   * Modal Navigation (Next / Prev)
   */
  function navigateModal(direction) {
    const total = state.books.length;
    state.activeModalBookIndex = (state.activeModalBookIndex + direction + total) % total;
    state.modalCoverMode = 'front';
    populateModalWithBook(state.books[state.activeModalBookIndex]);
  }

  /**
   * Toggle Bookmark / Saved Books
   */
  function toggleSaveBook(bookId) {
    const idx = state.savedBookIds.indexOf(bookId);
    const book = state.books.find(b => b.id === bookId);
    const title = book ? book.title : 'Book';

    if (idx > -1) {
      state.savedBookIds.splice(idx, 1);
      showToast(`Removed "${title}" from Reading List`);
    } else {
      state.savedBookIds.push(bookId);
      showToast(`Added "${title}" to Reading List`);
    }

    localStorage.setItem('carmel_saved_books', JSON.stringify(state.savedBookIds));
    updateSavedCountBadge();
    renderBooks(); // update heart icons in grid
  }

  /**
   * Update Badge Counter
   */
  function updateSavedCountBadge() {
    if (!elements.savedCountPill) return;
    const count = state.savedBookIds.length;
    elements.savedCountPill.textContent = count;
    elements.savedCountPill.style.display = count > 0 ? 'flex' : 'none';
  }

  /**
   * Open Reading List Drawer
   */
  function openReadingListDrawer() {
    renderSavedDrawerItems();
    elements.readingListDrawer.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close Reading List Drawer
   */
  function closeReadingListDrawer() {
    elements.readingListDrawer.classList.remove('active');
    document.body.style.overflow = '';
  }

  /**
   * Render Items in Saved Drawer
   */
  function renderSavedDrawerItems() {
    if (!elements.savedItemsContainer) return;
    const savedBooks = state.books.filter(b => state.savedBookIds.includes(b.id));

    if (elements.savedItemsCountLabel) {
      elements.savedItemsCountLabel.textContent = `${savedBooks.length} Books Selected`;
    }

    if (savedBooks.length === 0) {
      elements.savedItemsContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--color-text-muted);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 1rem; opacity: 0.5;">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <p style="font-weight: 600; color: var(--color-navy); margin-bottom: 0.3rem;">Your reading list is empty</p>
          <p style="font-size: 0.85rem;">Click the heart icon on any publication to bookmark titles for institution review or specimen copies.</p>
        </div>
      `;
      return;
    }

    let html = '<div class="saved-items-list">';
    savedBooks.forEach(b => {
      html += `
        <div class="saved-item-card">
          <img src="${b.cover_front_webp}" alt="${b.title}" class="saved-item-thumb" onerror="this.src='${b.cover_front_jpg}'" />
          <div class="saved-item-info">
            <h4 class="saved-item-title">${b.title}</h4>
            <div class="saved-item-cat">${b.category} &bull; ${b.price}</div>
          </div>
          <button class="saved-item-remove-btn" title="Remove" onclick="window.CarmelApp.toggleSaveBook('${b.id}'); window.CarmelApp.renderSavedDrawerItems();">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;
    });
    html += '</div>';

    elements.savedItemsContainer.innerHTML = html;
  }

  /**
   * Open Inquiry Modal
   */
  function openInquiryModal(bookTitle = '') {
    if (elements.inquiryBookTitleInput) {
      elements.inquiryBookTitleInput.value = bookTitle || 'Full 2024-2025 Carmel Publications Catalogue';
    }
    elements.inquiryModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close Inquiry Modal
   */
  function closeInquiryModal() {
    elements.inquiryModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  /**
   * Open Spotlight Search Modal
   */
  function openSpotlightModal() {
    elements.spotlightModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      if (elements.spotlightInput) elements.spotlightInput.focus();
    }, 100);
    renderSpotlightResults('');
  }

  /**
   * Close Spotlight Search Modal
   */
  function closeSpotlightModal() {
    elements.spotlightModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  /**
   * Render Spotlight Search Results
   */
  function renderSpotlightResults(query) {
    if (!elements.spotlightResults) return;
    const q = query.toLowerCase().trim();

    const matches = q === '' 
      ? state.books.slice(0, 6) 
      : state.books.filter(b => 
          b.title.toLowerCase().includes(q) || 
          b.category.toLowerCase().includes(q) || 
          (b.isbn || '').includes(q)
        ).slice(0, 8);

    if (matches.length === 0) {
      elements.spotlightResults.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--color-text-muted);">
          No matching publications found for "${query}"
        </div>
      `;
      return;
    }

    elements.spotlightResults.innerHTML = matches.map(b => `
      <div class="spotlight-result-row" onclick="window.CarmelApp.closeSpotlightModal(); window.CarmelApp.openBookModal('${b.id}')">
        <img src="${b.cover_front_webp}" alt="${b.title}" class="spotlight-result-thumb" onerror="this.src='${b.cover_front_jpg}'" />
        <div>
          <div class="spotlight-result-title">${b.title}</div>
          <div class="spotlight-result-cat">${b.category} &bull; ${b.level} &bull; ${b.price}</div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Toast System
   */
  function showToast(message) {
    if (!elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D7F45B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${message}</span>
    `;

    elements.toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  /**
   * Sync URL Parameters
   */
  function updateUrlQuery() {
    const params = new URLSearchParams();
    if (state.activeCategory !== 'all') params.set('category', state.activeCategory);
    if (state.activeCollection !== 'all') params.set('collection', state.activeCollection);
    if (state.activeLevel !== 'all') params.set('level', state.activeLevel);
    if (state.searchQuery.trim() !== '') params.set('q', state.searchQuery.trim());

    const queryString = params.toString();
    const newUrl = window.location.pathname + (queryString ? `?${queryString}` : '') + window.location.hash;
    window.history.replaceState({}, '', newUrl);
  }

  /**
   * Parse URL Query on Load
   */
  function parseUrlState() {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    const col = params.get('collection');
    const lvl = params.get('level');
    const q = params.get('q');

    if (cat && state.categories.some(c => c.id === cat)) {
      setCategory(cat);
    }
    if (col && state.collections.some(c => c.id === col)) {
      state.activeCollection = col;
      if (elements.collectionSelect) elements.collectionSelect.value = col;
    }
    if (lvl) {
      state.activeLevel = lvl;
      if (elements.levelSelect) elements.levelSelect.value = lvl;
    }
    if (q) {
      state.searchQuery = q;
      if (elements.catalogueSearchInput) elements.catalogueSearchInput.value = q;
      if (elements.searchClearBtn) elements.searchClearBtn.classList.add('visible');
    }

    if (cat || col || lvl || q) {
      renderBooks();
    }
  }

  /**
   * 3D Perspective Tilt on Mouse Move
   */
  function setup3DTilt() {
    document.addEventListener('mousemove', (e) => {
      const cards = document.querySelectorAll('.hero-visual .floating-card');
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const mouseX = (e.clientX - centerX) / centerX;
      const mouseY = (e.clientY - centerY) / centerY;

      cards.forEach((card, idx) => {
        const factor = (idx + 1) * 6;
        card.style.transform = `translate(${mouseX * factor}px, ${mouseY * factor}px)`;
      });
    });
  }

  /**
   * Bind All Event Listeners
   */
  function bindEvents() {
    // Search Input with Debounce
    let searchTimer = null;
    if (elements.catalogueSearchInput) {
      elements.catalogueSearchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (elements.searchClearBtn) {
          elements.searchClearBtn.classList.toggle('visible', val.length > 0);
        }
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          state.searchQuery = val;
          renderBooks();
          updateUrlQuery();
        }, 250);
      });
    }

    if (elements.searchClearBtn) {
      elements.searchClearBtn.addEventListener('click', () => {
        elements.catalogueSearchInput.value = '';
        elements.searchClearBtn.classList.remove('visible');
        state.searchQuery = '';
        renderBooks();
        updateUrlQuery();
      });
    }

    // Category Pills Delegation
    if (elements.categoryPillsStrip) {
      elements.categoryPillsStrip.addEventListener('click', (e) => {
        const pill = e.target.closest('.category-pill');
        if (pill) {
          setCategory(pill.dataset.category);
        }
      });
    }

    // Filter Dropdowns
    if (elements.collectionSelect) {
      elements.collectionSelect.addEventListener('change', (e) => {
        state.activeCollection = e.target.value;
        renderBooks();
        updateUrlQuery();
      });
    }

    if (elements.levelSelect) {
      elements.levelSelect.addEventListener('change', (e) => {
        state.activeLevel = e.target.value;
        renderBooks();
        updateUrlQuery();
      });
    }

    if (elements.sortSelect) {
      elements.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderBooks();
      });
    }

    // View Toggles (Grid vs List)
    if (elements.viewGridBtn) {
      elements.viewGridBtn.addEventListener('click', () => {
        state.currentView = 'grid';
        elements.viewGridBtn.classList.add('active');
        elements.viewListBtn.classList.remove('active');
        elements.booksGrid.classList.remove('list-view');
      });
    }

    if (elements.viewListBtn) {
      elements.viewListBtn.addEventListener('click', () => {
        state.currentView = 'list';
        elements.viewListBtn.classList.add('active');
        elements.viewGridBtn.classList.remove('active');
        elements.booksGrid.classList.add('list-view');
      });
    }

    // Modal Events
    if (elements.modalCloseBtn) elements.modalCloseBtn.addEventListener('click', closeBookModal);
    if (elements.modalPrevBtn) elements.modalPrevBtn.addEventListener('click', () => navigateModal(-1));
    if (elements.modalNextBtn) elements.modalNextBtn.addEventListener('click', () => navigateModal(1));

    // Cover Mode Switcher in Modal (Front vs Spread)
    if (elements.modalCoverToggleFront) {
      elements.modalCoverToggleFront.addEventListener('click', () => {
        state.modalCoverMode = 'front';
        populateModalWithBook(state.books[state.activeModalBookIndex]);
      });
    }
    if (elements.modalCoverToggleSpread) {
      elements.modalCoverToggleSpread.addEventListener('click', () => {
        state.modalCoverMode = 'spread';
        populateModalWithBook(state.books[state.activeModalBookIndex]);
      });
    }

    // Saved Books Drawer
    if (elements.savedBooksBtn) elements.savedBooksBtn.addEventListener('click', openReadingListDrawer);
    if (elements.readingListCloseBtn) elements.readingListCloseBtn.addEventListener('click', closeReadingListDrawer);
    if (elements.clearSavedBtn) {
      elements.clearSavedBtn.addEventListener('click', () => {
        state.savedBookIds = [];
        localStorage.removeItem('carmel_saved_books');
        updateSavedCountBadge();
        renderSavedDrawerItems();
        renderBooks();
        showToast('Reading List cleared');
      });
    }
    if (elements.inquireSavedBtn) {
      elements.inquireSavedBtn.addEventListener('click', () => {
        const savedBooks = state.books.filter(b => state.savedBookIds.includes(b.id));
        const titles = savedBooks.map(b => b.title).join(', ');
        closeReadingListDrawer();
        openInquiryModal(titles || 'Selected Titles from Reading List');
      });
    }

    // Inquiry Form
    if (elements.inquiryCloseBtn) elements.inquiryCloseBtn.addEventListener('click', closeInquiryModal);
    if (elements.inquiryForm) {
      elements.inquiryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        closeInquiryModal();
        showToast('Your inquiry & specimen request has been submitted successfully!');
        elements.inquiryForm.reset();
      });
    }

    // Spotlight Search (Cmd/Ctrl + K)
    if (elements.searchTriggerBtn) elements.searchTriggerBtn.addEventListener('click', openSpotlightModal);
    if (elements.spotlightCloseBtn) elements.spotlightCloseBtn.addEventListener('click', closeSpotlightModal);
    if (elements.spotlightInput) {
      elements.spotlightInput.addEventListener('input', (e) => {
        renderSpotlightResults(e.target.value);
      });
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + K for Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSpotlightModal();
      }
      // Escape closes any open modal/drawer
      if (e.key === 'Escape') {
        closeBookModal();
        closeReadingListDrawer();
        closeInquiryModal();
        closeSpotlightModal();
        if (elements.mobileNavDrawer) elements.mobileNavDrawer.classList.remove('active');
      }
      // Left / Right Arrow in Book Modal
      if (elements.previewModal.classList.contains('active')) {
        if (e.key === 'ArrowLeft') navigateModal(-1);
        if (e.key === 'ArrowRight') navigateModal(1);
      }
    });

    // Close on Backdrop Click
    [elements.previewModal, elements.readingListDrawer, elements.inquiryModal, elements.spotlightModal].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            closeBookModal();
            closeReadingListDrawer();
            closeInquiryModal();
            closeSpotlightModal();
          }
        });
      }
    });

    // Mobile Navigation Drawer Toggle
    if (elements.mobileMenuBtn && elements.mobileNavDrawer) {
      elements.mobileMenuBtn.addEventListener('click', () => {
        elements.mobileNavDrawer.classList.add('active');
      });
    }
    if (elements.mobileNavClose && elements.mobileNavDrawer) {
      elements.mobileNavClose.addEventListener('click', () => {
        elements.mobileNavDrawer.classList.remove('active');
      });
    }
  }

  // Expose API on window for inline handlers
  window.CarmelApp = {
    setCategory,
    clearAllFilters,
    openBookModal,
    closeBookModal,
    toggleSaveBook,
    openInquiryModal,
    closeSpotlightModal,
    renderSavedDrawerItems,
    removeChip: (type) => {
      if (type === 'category') setCategory('all');
      else if (type === 'collection') {
        state.activeCollection = 'all';
        if (elements.collectionSelect) elements.collectionSelect.value = 'all';
        renderBooks();
      } else if (type === 'level') {
        state.activeLevel = 'all';
        if (elements.levelSelect) elements.levelSelect.value = 'all';
        renderBooks();
      } else if (type === 'search') {
        state.searchQuery = '';
        if (elements.catalogueSearchInput) elements.catalogueSearchInput.value = '';
        if (elements.searchClearBtn) elements.searchClearBtn.classList.remove('visible');
        renderBooks();
      }
    }
  };

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
