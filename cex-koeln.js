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

/* --------------------------------------------------------------------------
   Google Analytics 4 — nothing loads before consent
   --------------------------------------------------------------------------
   Property "cex.koeln" (549753449) in the Analytics account CEx (404533634).
   Measurement ID G-912HZYR2BC. Linked to the Search Console domain property
   sc-domain:cex.koeln, so Search queries appear in the Analytics reports.

   BEFORE CONSENT NOTHING GOES TO GOOGLE. No gtag.js, no pixel, not even a
   connection to googletagmanager.com. Consent Mode v2 has a "cookieless ping"
   mode that keeps measuring with storage denied — it is deliberately not used
   here. § 25 Abs. 1 TTDSG governs storage, but the German supervisory
   authorities treat the request itself as a transfer of the IP address, and
   this is a German company's site under the LDI NRW. A hard cut is the only
   reading that survives either view. The Consent Mode signals are still sent,
   so the day CEx adds Google Ads the plumbing is already correct.

   HOW IT LEARNS THE ANSWER. script.js writes the visitor's choice to
   localStorage under cxPrivacyConsent.v1 from a click handler bound to the
   dialog. The handler below is bound to the document, so the dialog's handler
   has already run and the stored state is current by the time this reads it.
   That is why there is no polling and no patched writeConsent: the event
   order does the work.
   -------------------------------------------------------------------------- */
(function () {
  var MEASUREMENT_ID = 'G-912HZYR2BC';
  var STORAGE_KEY = 'cxPrivacyConsent.v1';
  var LEADS_HOST = 'leads.digitalmovement.uk';

  var running = false;   // gtag.js requested — true only after consent
  var lastForm = null;   // which form is mid-flight, for generate_lead

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  // Denied by default, set before anything else is queued. gtag.js replays the
  // whole dataLayer when it loads, so this is still the first thing it sees
  // even though it is pushed long before the library exists.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted'
  });

  function categories() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && parsed.categories ? parsed.categories : null;
    } catch (error) {
      return null;
    }
  }

  function start() {
    if (running) return;
    running = true;

    var tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
    document.head.appendChild(tag);

    gtag('js', new Date());
    gtag('config', MEASUREMENT_ID, {
      // One page, eight anchors. Left alone, every jump to #leistungen is a
      // separate page in the reports and the landing-page numbers become
      // meaningless. The hash is dropped so all of it counts as one page.
      page_location: window.location.origin + window.location.pathname
    });
  }

  function apply() {
    var chosen = categories();
    if (!chosen) return;   // not answered yet — defaults stand

    gtag('consent', 'update', {
      analytics_storage: chosen.statistics ? 'granted' : 'denied',
      ad_storage: chosen.marketing ? 'granted' : 'denied',
      ad_user_data: chosen.marketing ? 'granted' : 'denied',
      ad_personalization: chosen.marketing ? 'granted' : 'denied',
      functionality_storage: chosen.preferences ? 'granted' : 'denied',
      personalization_storage: chosen.preferences ? 'granted' : 'denied'
    });

    if (chosen.statistics) start();
  }

  function track(name, params) {
    if (!running) return;
    gtag('event', name, params || {});
  }

  // Which part of the page a click came from. Every section on the homepage
  // carries an id, and those ids are the anchors in the top bar, so the
  // section id is already the name a human would use for the place. The three
  // things that sit outside the sections — top bar, sticky dock, footer — are
  // named here, because "seite" for every footer click tells you nothing and
  // those are exactly the clicks worth telling apart.
  function place(element) {
    var holder = element.closest(
      'section[id], .cta-dock, nav, header, footer');
    if (!holder) return 'seite';
    if (holder.classList.contains('cta-dock')) return 'sticky-leiste';
    if (holder.id) return holder.id;
    var tag = holder.tagName.toLowerCase();
    if (tag === 'nav' || tag === 'header') return 'kopfleiste';
    if (tag === 'footer') return 'fusszeile';
    return 'seite';
  }

  /* --- the events ---------------------------------------------------------
     Enhanced Measurement on the data stream already gives page_view, scroll,
     click (outbound), file_download, form_start and form_submit. What it
     cannot see is which of those forms actually reached the endpoint, and
     which of the two calls to action did the work. That is what is added
     here — nothing that Google already collects is collected twice.
     ---------------------------------------------------------------------- */

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;

    // Consent first: this runs after script.js has written the new answer.
    if (target.closest('#privacy-consent [data-consent-action]')) {
      apply();
      return;
    }

    var link = target.closest('a[href]');
    if (link) {
      var href = link.getAttribute('href') || '';
      if (href.indexOf('mailto:') === 0) {
        track('contact_click', { method: 'email', cta_location: place(link) });
      } else if (href.indexOf('tel:') === 0) {
        track('contact_click', { method: 'telefon', cta_location: place(link) });
      }
    }

    // The submit button carries .btn too. Counting it here would double every
    // real enquiry: once as a call to action, once as generate_lead.
    var cta = target.closest('.btn, .cta-dock__btn, .nav__cta');
    if (cta && cta.type !== 'submit') {
      track('cta_click', {
        link_text: (cta.innerText || '').trim().slice(0, 100),
        cta_location: place(cta)
      });
    }
  });

  // toggle does not bubble, so this one has to listen on the way down.
  document.addEventListener('toggle', function (event) {
    var details = event.target;
    if (!details || details.tagName !== 'DETAILS' || !details.open) return;
    var summary = details.querySelector('summary');
    track('faq_open', {
      question: summary ? summary.innerText.trim().slice(0, 100) : ''
    });
  }, true);

  document.addEventListener('submit', function (event) {
    var form = event.target && event.target.closest
      ? event.target.closest('form[data-cex-static-contact]')
      : null;
    if (form) lastForm = form;
  }, true);

  /* --- generate_lead ------------------------------------------------------
     An enquiry counts when the endpoint says ok, not when the button is
     pressed. That answer only exists inside the fetch script.js sends, so
     fetch is wrapped once, here, and filtered down to the one host. script.js
     still reads the original response; this reads a clone, which is why its
     .json() cannot steal the body out from under it.

     Wrapping rather than guessing at submit matters: the endpoint drops a
     request silently when it looks automated, and a submit-time count would
     report leads that were never delivered.
     ---------------------------------------------------------------------- */
  var nativeFetch = window.fetch;
  if (typeof nativeFetch === 'function') {
    window.fetch = function (resource) {
      var url = typeof resource === 'string'
        ? resource
        : (resource && resource.url) || '';
      var call = nativeFetch.apply(this, arguments);

      if (url.indexOf(LEADS_HOST) === -1) return call;

      var form = lastForm;
      call.then(function (response) {
        return response.clone().json();
      }).then(function (body) {
        if (!body || !body.ok) return;
        track('generate_lead', {
          form_id: (form && form.id) || 'kontakt',
          cta_location: form && form.closest('.hero') ? 'hero' : 'seitenende'
        });
      }).catch(function () {
        // A failed send is not a lead and not an error worth reporting.
      });

      return call;
    };
  }

  // A returning visitor has already answered; their answer applies at once.
  apply();
})();
