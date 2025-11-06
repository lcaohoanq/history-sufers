import {
  startAssetPreload,
  subscribeToAssetPreload,
  getAssetPreloadState,
  waitForAssetPreload,
  isAssetPreloadPrimed
} from './preload-assets.js';

const STYLE_ID = 'asset-preload-style';
const BANNER_ID = 'assetPreloadBanner';

let bannerElements = null;
let unsubscribeFromProgress = null;
let hideTimeout = null;
let initialized = false;
let renderBanner = true;

function ensureStyleSheet() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .asset-preload-banner {
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: rgba(14, 18, 36, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 14px 18px;
      color: #ffffff;
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translate(-50%, 0);
      width: min(420px, calc(100% - 32px));
      box-shadow: 0 18px 35px rgba(8, 12, 26, 0.4);
      transition: opacity 0.4s ease, transform 0.4s ease;
      z-index: 1200;
      pointer-events: none;
    }

    .asset-preload-banner[data-state='hidden'] {
      opacity: 0;
      pointer-events: none;
      transform: translate(-50%, -20px);
    }

    .asset-preload-banner[data-state='done'] .asset-preload-progress-fill {
      background: linear-gradient(90deg, #48bb78, #38a169);
    }

    .asset-preload-banner[data-state='error'] {
      border-color: rgba(255, 86, 86, 0.6);
      background: rgba(68, 16, 16, 0.85);
    }

    .asset-preload-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 500;
      letter-spacing: 0.3px;
    }

    .asset-preload-icon {
      font-size: 18px;
    }

    .asset-preload-progress {
      position: relative;
      height: 6px;
      width: 100%;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      overflow: hidden;
    }

    .asset-preload-progress-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #4fd1c5, #63b3ed);
      transition: width 0.3s ease;
    }

    .asset-preload-detail {
      font-size: 12px;
      opacity: 0.75;
    }
  `;
  document.head.appendChild(style);
}

function ensureBannerElements() {
  if (bannerElements) {
    return bannerElements;
  }

  ensureStyleSheet();

  let banner = document.getElementById(BANNER_ID);
  if (!banner) {
    banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.className = 'asset-preload-banner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.dataset.state = 'active';

    const label = document.createElement('div');
    label.className = 'asset-preload-label';

    const icon = document.createElement('span');
    icon.className = 'asset-preload-icon';
    icon.textContent = '⚡';

    const message = document.createElement('span');
    message.className = 'asset-preload-message';
    message.textContent = 'Đang chuẩn bị tài nguyên...';

    const progress = document.createElement('div');
    progress.className = 'asset-preload-progress';

    const progressFill = document.createElement('div');
    progressFill.className = 'asset-preload-progress-fill';
    progress.appendChild(progressFill);

    const detail = document.createElement('small');
    detail.className = 'asset-preload-detail';
    detail.textContent = 'Đang kiểm tra danh sách tài nguyên...';

    label.append(icon, message);
    banner.append(label, progress, detail);
    document.body.appendChild(banner);

    bannerElements = {
      banner,
      message,
      detail,
      progressFill
    };
  } else {
    bannerElements = {
      banner,
      message: banner.querySelector('.asset-preload-message'),
      detail: banner.querySelector('.asset-preload-detail'),
      progressFill: banner.querySelector('.asset-preload-progress-fill')
    };
  }

  return bannerElements;
}

function applyBannerState(state) {
  if (!state) return;

  if (!renderBanner) {
    window.__assetPreloadState = state;
    return;
  }

  const { banner, message, detail, progressFill } = ensureBannerElements();
  if (!banner || !message || !detail || !progressFill) {
    return;
  }

  const total = state.total ?? 0;
  const completed = state.completed ?? 0;
  const failures = Array.isArray(state.failures) ? state.failures : [];
  const done = state.done === true;
  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  progressFill.style.width = `${percent}%`;

  if (!done) {
    message.textContent = 'Đang chuẩn bị tài nguyên...';
    detail.textContent = total
      ? `Đã chuẩn bị ${completed}/${total} (${percent}%)`
      : 'Đang kiểm tra danh sách tài nguyên...';
  } else if (failures.length) {
    message.textContent = 'Một số tài nguyên chưa tải được';
    detail.textContent = `Hoàn tất ${completed}/${total}. Sẽ thử lại khi vào game.`;
  } else {
    message.textContent = 'Tài nguyên đã sẵn sàng!';
    detail.textContent = `Đã chuẩn bị ${completed}/${total} (${percent}%)`;
  }

  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  if (!done) {
    banner.dataset.state = 'active';
  } else if (failures.length) {
    banner.dataset.state = 'error';
  } else {
    banner.dataset.state = 'done';
    hideTimeout = setTimeout(() => {
      if (banner.dataset.state === 'done') {
        banner.dataset.state = 'hidden';
      }
    }, 2500);
  }

  window.__assetPreloadState = state;
}

function handleProgressUpdate(state) {
  applyBannerState(state);
}

/**
 * Initializes the floating asset preload banner and kicks off the shared preloading process.
 * Subsequent calls are idempotent; the banner is only created once and progress listeners are reused.
 * @param {object} [options]
 * @param {number} [options.concurrency=4] - Number of parallel fetches
 * @returns {Promise<object>} Resolves with the final preload state.
 */
export function initAssetPreloader(options = {}) {
  const { concurrency = 4, forceBanner = false } = options;
  renderBanner = forceBanner || !isAssetPreloadPrimed();

  if (renderBanner) {
    ensureBannerElements();
  }

  if (!initialized) {
    initialized = true;
    unsubscribeFromProgress = subscribeToAssetPreload(handleProgressUpdate);
    applyBannerState(getAssetPreloadState());
  }

  const preloadPromise = startAssetPreload({
    concurrency
  });

  window.__assetPreloadPromise = preloadPromise;

  preloadPromise
    .then((finalState) => {
      applyBannerState(finalState);
      return finalState;
    })
    .catch((error) => {
      console.error('Asset preload rejected:', error);
      applyBannerState({
        total: 0,
        completed: 0,
        failures: [{ url: 'asset-preload', error }],
        done: true
      });
    });

  return preloadPromise;
}

/**
 * Waits for the shared asset preload to finish (successfully or not).
 * @returns {Promise<object>} Resolves with the final preload state snapshot.
 */
export function waitForAssetPreloadCompletion() {
  return waitForAssetPreload();
}

/**
 * Removes progress listeners. Banner remains on screen (if present).
 * Useful before tearing down the page manually.
 */
export function disposeAssetPreloader() {
  if (unsubscribeFromProgress) {
    unsubscribeFromProgress();
    unsubscribeFromProgress = null;
  }
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  initialized = false;
  renderBanner = true;
}
