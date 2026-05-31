(function() {
  // 1. Inject Stylesheet
  const style = document.createElement('style');
  style.textContent = `
    .top-nav-search {
      position: relative;
      margin: 0 20px;
      flex: 1;
      max-width: 320px;
    }
    .top-nav-search input {
      width: 100%;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 8px 16px 8px 36px;
      border-radius: 20px;
      color: #fff;
      font-size: 0.9rem;
      outline: none;
      transition: all 0.3s ease;
      font-family: inherit;
    }
    .top-nav-search input:focus {
      background: rgba(255, 255, 255, 0.12);
      border-color: #6c5ce7;
      box-shadow: 0 0 10px rgba(108, 92, 231, 0.2);
    }
    .top-nav-search::before {
      content: '🔍';
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.9rem;
      opacity: 0.5;
      pointer-events: none;
    }
    .search-suggestions {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #0f131a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      margin-top: 5px;
      max-height: 320px;
      overflow-y: auto;
      z-index: 2000;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      display: none;
    }
    .suggestion-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 15px;
      text-decoration: none;
      color: #a0aec0;
      transition: all 0.2s ease;
      border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    }
    .suggestion-item:last-child {
      border-bottom: none;
    }
    .suggestion-item:hover {
      background: rgba(255, 255, 255, 0.04);
      color: #fff;
    }
    .suggestion-item img {
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: 4px;
      background: #1a202c;
    }
    .suggestion-title {
      font-weight: 600;
      font-size: 0.9rem;
      color: #fff;
    }
    .suggestion-genre {
      font-size: 0.75rem;
      opacity: 0.7;
      margin-top: 2px;
    }
    @media (max-width: 768px) {
      .top-navbar {
        height: auto !important;
        padding: 10px 0;
      }
      .top-nav-container {
        flex-wrap: wrap;
      }
      .top-nav-search {
        margin: 10px 0 0;
        width: 100%;
        max-width: none;
        order: 3;
      }
    }
  `;
  document.head.appendChild(style);

  // 2. Search Logic
  document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchSuggestions = document.getElementById('searchSuggestions');
    let gamesDb = null;
    let fetchPromise = null;

    const loadGamesDb = () => {
      if (gamesDb) return Promise.resolve(gamesDb);
      if (fetchPromise) return fetchPromise;
      fetchPromise = fetch('games1.json')
        .then(res => {
          if (!res.ok) throw new Error('Network response not ok');
          return res.json();
        })
        .then(data => {
          gamesDb = data;
          return gamesDb;
        })
        .catch(err => {
          console.warn('Failed to load games database:', err);
          fetchPromise = null;
        });
      return fetchPromise;
    };

    if (searchInput && searchSuggestions) {
      searchInput.addEventListener('focus', () => {
        loadGamesDb();
      });

      searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (!query) {
          searchSuggestions.style.display = 'none';
          searchSuggestions.innerHTML = '';
          restoreDashboard();
          return;
        }

        const db = await loadGamesDb();
        if (!db) return;

        const filtered = db.filter(game => 
          game.title.toLowerCase().includes(query) ||
          (game.description && game.description.toLowerCase().includes(query)) ||
          (game.genre && game.genre.toLowerCase().includes(query))
        );

        renderSuggestions(filtered.slice(0, 10));
        filterDashboardGrid(filtered);
      });

      // Close suggestions when clicking outside
      document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
          searchSuggestions.style.display = 'none';
        }
      });
    }

    function renderSuggestions(games) {
      if (games.length === 0) {
        searchSuggestions.innerHTML = '<div style="padding:12px;color:#a0aec0;font-size:0.9rem;text-align:center;">No games found</div>';
        searchSuggestions.style.display = 'block';
        return;
      }

      searchSuggestions.innerHTML = games.map(game => `
        <a href="${game.id}.html" class="suggestion-item">
          <img src="${game.thumbnail}" alt="${game.title}">
          <div>
            <div class="suggestion-title">${game.title}</div>
            <div class="suggestion-genre">${game.genre}</div>
          </div>
        </a>
      `).join('');
      searchSuggestions.style.display = 'block';
    }

    // Dashboard grid interaction helper
    let originalGridHtml = null;
    let originalPaginationHtml = null;

    function filterDashboardGrid(games) {
      const grid = document.querySelector('.container > .grid');
      if (!grid) return; // Not on dashboard page

      const pagination = document.querySelector('.container > .pagination');

      // Save original state once
      if (originalGridHtml === null) {
        originalGridHtml = grid.innerHTML;
      }
      if (originalPaginationHtml === null && pagination) {
        originalPaginationHtml = pagination.innerHTML;
      }

      if (pagination) {
        pagination.style.display = 'none';
      }

      if (games.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#a0aec0;font-size:1.2rem;">No games found matching your search.</div>';
        return;
      }

      grid.innerHTML = games.map(game => {
        const match = game.thumbnail.match(/images\/(\d+)\.webp/);
        const numericId = match ? match[1] : '300';
        const tagBadges = game.genre ? game.genre.split(',').slice(0, 3).map(t => `<span class="tag">${t.trim()}</span>`).join('\n') : '';

        return `
          <article class="card">
            <div class="thumbnail-wrapper">
              <img src="images/${numericId}.webp" alt="${game.title} Cover" loading="lazy">
            </div>
            <div class="card-body">
              <h2 class="card-title">${game.title}</h2>
              <p class="card-description">${game.description || ''}</p>
              <div class="tag-container">
                ${tagBadges}
              </div>
              <a href="${game.id}.html" class="play-btn">Play Now &rarr;</a>
            </div>
          </article>
        `;
      }).join('');
    }

    function restoreDashboard() {
      const grid = document.querySelector('.container > .grid');
      if (!grid || originalGridHtml === null) return;

      grid.innerHTML = originalGridHtml;
      originalGridHtml = null;

      const pagination = document.querySelector('.container > .pagination');
      if (pagination && originalPaginationHtml !== null) {
        pagination.innerHTML = originalPaginationHtml;
        pagination.style.display = 'flex';
        originalPaginationHtml = null;
      }
    }
  });
})();
