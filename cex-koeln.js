/* ==========================================================================
   CEx — cex.koeln, the bits that are only on this one-page site
   --------------------------------------------------------------------------
   Hand-authored. build.py does not touch this file.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Sticky bottom call to action
   --------------------------------------------------------------------------
   The dock is tied to the top bar, not to its own scroll threshold. script.js
   puts .is-scrolled on the bar, the bar halves, its button fades out and the
   dock fades in — one signal, so all three happen on the same frame. Watching
   the class rather than re-reading scrollY is what guarantees that: a second
   scroll listener with its own copy of the 40px threshold would drift by a
   frame and read as two separate movements.

   The one exception is the contact section. There the dock would sit on top of
   the form it is pointing at, so it steps aside — the bar stays small, the
   dock goes.
   -------------------------------------------------------------------------- */
(function () {
  var dock = document.querySelector('.cta-dock');
  var nav = document.getElementById('nav');
  var contact = document.getElementById('kontakt');
  if (!dock || !nav) return;

  var atContact = false;

  function apply() {
    dock.classList.toggle(
      'is-visible', nav.classList.contains('is-scrolled') && !atContact);
  }

  new MutationObserver(apply).observe(nav, {
    attributes: true,
    attributeFilter: ['class']
  });

  if (contact && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      atContact = entries[0].isIntersecting;
      apply();
    }, { threshold: 0 }).observe(contact);
  }

  // A reload part-way down the page starts already scrolled.
  apply();
})();

/* --------------------------------------------------------------------------
   Which section am I in
   --------------------------------------------------------------------------
   polish.css styles .nav__primary a.is-active but nothing ever sets it, so on
   the production site the underline never appears. On a single page where
   every link is an anchor, it is the only thing telling you where you are.
   -------------------------------------------------------------------------- */
(function () {
  var links = Array.prototype.slice.call(
    document.querySelectorAll('.nav__primary a[href^="#"]'));
  if (!links.length || !('IntersectionObserver' in window)) return;

  var map = new Map();
  links.forEach(function (link) {
    var target = document.getElementById(link.getAttribute('href').slice(1));
    if (target) map.set(target, link);
  });
  if (!map.size) return;

  var visible = new Set();

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });

    // Topmost visible section wins, so scrolling up does not leave the mark
    // on the section below.
    var winner = null;
    map.forEach(function (_link, section) {
      if (!visible.has(section)) return;
      if (!winner || section.getBoundingClientRect().top < winner.getBoundingClientRect().top) {
        winner = section;
      }
    });

    links.forEach(function (link) { link.classList.remove('is-active'); });
    if (winner) map.get(winner).classList.add('is-active');
  }, { rootMargin: '-25% 0px -60% 0px', threshold: 0 });

  map.forEach(function (_link, section) { observer.observe(section); });
})();

/* --------------------------------------------------------------------------
   The second layer of the consent sheet
   --------------------------------------------------------------------------
   placeholder.css section 8 shortens the consent dialog on a phone to a sheet
   at the bottom, so that the hero and the headline are visible while the
   question is being asked. The four categories move out of that short sheet,
   and this puts back the way into them: one link, "Einstellungen", sitting
   with Datenschutz and Impressum.

   The dialog itself is written by script.js, which build.py overwrites from
   ../github-cx on every build — so it is left alone and decorated from here.
   Both files are deferred and run in order, but script.js may inject on
   DOMContentLoaded rather than immediately, so this waits for the dialog to
   appear instead of assuming it already has.
   -------------------------------------------------------------------------- */
(function () {
  function wire() {
    var dialog = document.getElementById('privacy-consent');
    if (!dialog || dialog.dataset.sheetWired) return !!dialog;

    var links = dialog.querySelector('.privacy-consent__links');
    var options = dialog.querySelector('.privacy-consent__options');
    if (!links || !options) return false;

    dialog.dataset.sheetWired = '1';
    options.id = 'privacy-consent-options';

    var more = document.createElement('button');
    more.type = 'button';
    more.className = 'privacy-consent__more';
    more.textContent = 'Einstellungen';
    more.setAttribute('aria-expanded', 'false');
    more.setAttribute('aria-controls', 'privacy-consent-options');

    more.addEventListener('click', function () {
      dialog.classList.add('is-details-open');
      more.setAttribute('aria-expanded', 'true');
      var first = dialog.querySelector('.privacy-option input:not([disabled])');
      if (first) first.focus({ preventScroll: true });
    });

    links.appendChild(more);
    return true;
  }

  if (wire()) return;

  var observer = new MutationObserver(function () {
    if (wire()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('DOMContentLoaded', function () {
    if (wire()) observer.disconnect();
  });
})();
