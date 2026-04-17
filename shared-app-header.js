(() => {
  function ensureCompactHeader() {
    const topNav = document.querySelector('.top-nav');
    if (!topNav) return;

    let mobileHeader = document.querySelector('.mobile-fixed-header');
    if (!mobileHeader) {
      mobileHeader = document.createElement('div');
      mobileHeader.className = 'mobile-fixed-header';
      mobileHeader.setAttribute('role', 'navigation');
      mobileHeader.setAttribute('aria-label', 'Mobile site navigation');
      mobileHeader.innerHTML = `
        <a class="mobile-fixed-brand" href="/">paiden.com</a>
        <div class="mobile-fixed-nav">
          <a href="/photos" aria-label="Photos"><i class="fa-solid fa-image" aria-hidden="true"></i></a>
          <a href="/blog" aria-label="Blog"><i class="fa-solid fa-comment-dots" aria-hidden="true"></i></a>
          <a href="/contactme" aria-label="Contact"><i class="fa-solid fa-envelope" aria-hidden="true"></i></a>
        </div>
      `;
      topNav.insertAdjacentElement('afterend', mobileHeader);
    }
  }

  function syncCompactHeaderMode() {
    const topNav = document.querySelector('.top-nav');
    const navInner = document.querySelector('.top-nav-inner');
    const navLinks = document.querySelector('.top-nav .nav-links');
    if (!topNav || !navInner || !navLinks) return;

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    if (viewportWidth <= 768) {
      document.body.classList.add('use-compact-header');
      return;
    }

    const leftGap = navInner.getBoundingClientRect().left;
    const rightGap = viewportWidth - navLinks.getBoundingClientRect().right;
    document.body.classList.toggle('use-compact-header', rightGap <= leftGap + 2);
  }

  function initSharedAppHeader() {
    ensureCompactHeader();
    syncCompactHeaderMode();
    setTimeout(syncCompactHeaderMode, 250);
    setTimeout(syncCompactHeaderMode, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSharedAppHeader, { once: true });
  } else {
    initSharedAppHeader();
  }

  window.addEventListener('resize', syncCompactHeaderMode);
  window.addEventListener('load', syncCompactHeaderMode);
})();
