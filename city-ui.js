/* ==========================================================
   CITY UI — STEP 3
   Menu kiri atas + Presentation Overlay kanan + OPEN
   ========================================================== */

(function () {
  'use strict';

  const UI_ROOT_ID = 'city-ui';
  const PRESENTATION_ID = 'city-presentation';
  const FADE_OVERLAY_ID = 'presentation-transition';

  const PRESENTATION_MAP = {
    'city-hall': 'presentations/Balai-kota/index.html',
    'school': '',
    'lab-ipa': '',
    'inf-tower': '',
    'museum-ips': '',
    'bar': 'presentations/bar/index.html',
    'pink-house': ''
  };

  const ZOOM_DURATION = 800;
  const FADE_START_DELAY = 450;
  const FADE_DURATION = 600;
  const NAVIGATION_DELAY = 1050;

  const state = {
    root: null,
    toggleButton: null,
    panel: null,
    listEl: null,
    onSelect: null,
    isOpen: false,
    buildings: [],

    presentation: null,
    presentationGradient: null,
    presentationContent: null,
    thumbnailEl: null,
    thumbnailImg: null,
    thumbnailPlaceholder: null,
    headlineEl: null,
    descriptionEl: null,
    openButton: null,

    fadeOverlay: null,
    currentBuilding: null,
    isOpeningPresentation: false
  };

  function ensureRoot() {
    let root = document.getElementById(UI_ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = UI_ROOT_ID;
      root.className = 'city-ui';
      document.body.appendChild(root);
    }
    state.root = root;
    return root;
  }

  function buildToggle() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'city-ui__toggle';
    button.setAttribute('aria-label', 'Open building menu');
    button.setAttribute('aria-expanded', 'false');
    button.textContent = '☰';
    state.toggleButton = button;
    state.root.appendChild(button);
  }

  function buildPanel() {
    const panel = document.createElement('div');
    panel.className = 'city-ui__panel';

    const list = document.createElement('ul');
    list.className = 'city-ui__list';
    panel.appendChild(list);

    state.panel = panel;
    state.listEl = list;
    state.root.appendChild(panel);
  }

  function clearList() {
    if (state.listEl) state.listEl.innerHTML = '';
  }

  function renderList() {
    clearList();

    state.buildings.forEach(function (building) {
      const li = document.createElement('li');
      li.className = 'city-ui__list-item';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'city-ui__item';
      button.dataset.buildingId = building.id;

      const label = (building.info && building.info.headline) || building.id;
      button.textContent = label;

      button.addEventListener('click', function (event) {
        event.stopPropagation();
        closeMenu();

        if (typeof state.onSelect === 'function') {
          state.onSelect(building);
        }

        if (window.CityWorld && typeof window.CityWorld.focusBuilding === 'function') {
          window.CityWorld.focusBuilding(building.id);
        }

        // Sembunyikan side gradient (jika tersedia)
        if (window.hideSideGradient && typeof window.hideSideGradient === 'function') {
          window.hideSideGradient();
        }

        showPresentation(building);
      });

      li.appendChild(button);
      state.listEl.appendChild(li);
    });
  }

  function closeMenu() {
    if (!state.root) return;
    state.isOpen = false;
    state.root.classList.remove('is-open');
    state.toggleButton.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu() {
    if (!state.root) return;
    state.isOpen = !state.isOpen;
    state.root.classList.toggle('is-open', state.isOpen);
    state.toggleButton.setAttribute('aria-expanded', String(state.isOpen));
  }

  function attachEvents() {
    if (!state.toggleButton) return;
    state.toggleButton.addEventListener('click', function (event) {
      event.stopPropagation();
      toggleMenu();
    });
  }

  function ensureFadeOverlay() {
    if (state.fadeOverlay) return;
    const overlay = document.createElement('div');
    overlay.id = FADE_OVERLAY_ID;
    overlay.className = 'presentation-transition';
    document.body.appendChild(overlay);
    state.fadeOverlay = overlay;
  }

  function ensurePresentation() {
    if (state.presentation) return;

    const container = document.createElement('div');
    container.id = PRESENTATION_ID;
    container.className = 'city-presentation';

    const gradient = document.createElement('div');
    gradient.className = 'city-presentation__gradient';
    gradient.setAttribute('aria-hidden', 'true');
    container.appendChild(gradient);

    const content = document.createElement('div');
    content.className = 'city-presentation__content';

    const thumbnail = document.createElement('div');
    thumbnail.className = 'city-presentation__thumbnail';

    const img = document.createElement('img');
    img.className = 'city-presentation__thumbnail-img';
    img.alt = '';
    img.style.display = 'none';
    thumbnail.appendChild(img);

    const placeholder = document.createElement('div');
    placeholder.className = 'city-presentation__thumbnail-placeholder';
    placeholder.textContent = '';
    placeholder.style.display = 'none';
    thumbnail.appendChild(placeholder);

    content.appendChild(thumbnail);

    const headline = document.createElement('h2');
    headline.className = 'city-presentation__headline';
    content.appendChild(headline);

    const description = document.createElement('p');
    description.className = 'city-presentation__description';
    description.style.display = 'none';
    content.appendChild(description);

    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = 'city-presentation__open';
    openButton.textContent = 'OPEN';
    content.appendChild(openButton);

    openButton.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      handleOpenClick();
    });

    container.appendChild(content);
    document.body.appendChild(container);

    state.presentation = container;
    state.presentationGradient = gradient;
    state.presentationContent = content;
    state.thumbnailEl = thumbnail;
    state.thumbnailImg = img;
    state.thumbnailPlaceholder = placeholder;
    state.headlineEl = headline;
    state.descriptionEl = description;
    state.openButton = openButton;
  }

  function showPresentation(building) {
    ensurePresentation();
    ensureFadeOverlay();

    state.currentBuilding = building;

    const info = building.info || {};
    const headline = info.headline || building.id;
    const description = info.description || '';
    const thumbnailUrl = info.thumbnail || '';

    if (state.headlineEl) {
      state.headlineEl.textContent = headline;
    }

    if (state.descriptionEl) {
      if (description) {
        state.descriptionEl.textContent = description;
        state.descriptionEl.style.display = '';
      } else {
        state.descriptionEl.style.display = 'none';
      }
    }

    if (state.thumbnailImg) {
      if (thumbnailUrl) {
        state.thumbnailImg.src = thumbnailUrl;
        state.thumbnailImg.alt = headline;
        state.thumbnailImg.style.display = '';
        if (state.thumbnailPlaceholder) state.thumbnailPlaceholder.style.display = 'none';
      } else {
        state.thumbnailImg.style.display = 'none';
        if (state.thumbnailPlaceholder) {
          state.thumbnailPlaceholder.textContent = headline.charAt(0).toUpperCase();
          state.thumbnailPlaceholder.style.display = '';
        }
      }
    }

    state.presentation.classList.remove('is-opening');
    state.presentation.classList.add('is-visible');
  }

  function hidePresentation() {
    if (state.presentation) {
      state.presentation.classList.remove('is-visible');
      state.presentation.classList.remove('is-opening');
    }
    if (state.fadeOverlay) {
      state.fadeOverlay.classList.remove('is-active');
    }
  }

  function handleOpenClick() {
    if (state.isOpeningPresentation) return;

    const building = state.currentBuilding;
    if (!building) {
      console.warn('[CityUI] Tidak ada building yang sedang dipilih.');
      return;
    }

    const presentationUrl = PRESENTATION_MAP[building.id];
    if (!presentationUrl) {
      console.warn('[CityUI] Presentation URL tidak ditemukan untuk building:', building.id);
      return;
    }

    state.isOpeningPresentation = true;

    if (state.thumbnailEl) {
      const rect = state.thumbnailEl.getBoundingClientRect();
      const safeWidth = Math.max(rect.width, 1);
      const safeHeight = Math.max(rect.height, 1);
      const centerX = rect.left + safeWidth / 2;
      const centerY = rect.top + safeHeight / 2;
      const scaleX = Math.max(
        (2 * centerX) / safeWidth,
        (2 * (window.innerWidth - centerX)) / safeWidth
      );
      const scaleY = Math.max(
        (2 * centerY) / safeHeight,
        (2 * (window.innerHeight - centerY)) / safeHeight
      );
      const targetScale = Math.max(scaleX, scaleY, 1) * 1.05;
      state.thumbnailEl.style.setProperty('--thumbnail-target-scale', targetScale);
    }

    if (state.presentation) {
      state.presentation.classList.add('is-opening');
    }

    setTimeout(() => {
      if (state.fadeOverlay) {
        state.fadeOverlay.classList.add('is-active');
      }
    }, FADE_START_DELAY);

    setTimeout(() => {
      window.location.href = presentationUrl;
    }, NAVIGATION_DELAY);
  }

  function init(options) {
    if (!window.CityWorld || typeof window.CityWorld.getInteractiveBuildings !== 'function') {
      console.warn('[CityUI] CityWorld.getInteractiveBuildings tidak tersedia.');
      return false;
    }

    const buildings = window.CityWorld.getInteractiveBuildings();
    if (!Array.isArray(buildings)) {
      console.warn('[CityUI] getInteractiveBuildings tidak mengembalikan array.');
      return false;
    }

    state.buildings = buildings.slice();
    state.onSelect = (options && options.onSelect) || null;

    try {
      ensureRoot();

      if (!state.root.querySelector('.city-ui__toggle')) {
        buildToggle();
      }
      if (!state.root.querySelector('.city-ui__panel')) {
        buildPanel();
      }

      state.listEl = state.root.querySelector('.city-ui__list');
      if (!state.listEl) {
        throw new Error('Elemen list tidak ditemukan setelah buildPanel.');
      }

      renderList();
      attachEvents();

      ensurePresentation();
      ensureFadeOverlay();

      // Tambahkan class is-ready segera
      state.root.classList.add('is-ready');
      console.log('[CityUI] init sukses, is-ready ditambahkan');
      return true;
    } catch (error) {
      console.error('[CityUI] init error:', error);
      // Fallback: tetap coba tampilkan
      if (state.root) {
        state.root.classList.add('is-ready');
      }
      return false;
    } finally {
      // Fallback kedua jika class belum terpasang
      setTimeout(() => {
        if (state.root) {
          state.root.classList.add('is-ready');
        }
      }, 100);
    }
  }

  function refresh() {
    if (!window.CityWorld || typeof window.CityWorld.getInteractiveBuildings !== 'function') return;
    const buildings = window.CityWorld.getInteractiveBuildings();
    state.buildings = Array.isArray(buildings) ? buildings.slice() : [];
    renderList();
  }

  window.CityUI = {
    init: init,
    refresh: refresh,
    showPresentation: showPresentation,
    hidePresentation: hidePresentation
  };
})();