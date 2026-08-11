const nav = document.getElementById('nav');
const hero = document.getElementById('top');
const contactForm = document.getElementById('contact');
const formStatus = document.getElementById('form-status');
const navLinks = Array.from(document.querySelectorAll('.nav__primary a'));
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const isStaticCExSite = document.body.classList.contains('cex-static-site');
const cexScriptUrl = document.currentScript?.src || window.location.href;
const privacyPageUrl = isStaticCExSite ? new URL('datenschutz.html', cexScriptUrl).href : '/datenschutz/';
const imprintPageUrl = isStaticCExSite ? new URL('impressum.html', cexScriptUrl).href : '/impressum/';
const consentStorageKey = 'cxPrivacyConsent.v1';
const consentDefaults = {
  necessary: true,
  preferences: false,
  statistics: false,
  marketing: false,
};

function readConsent() {
  try {
    const stored = window.localStorage.getItem(consentStorageKey);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function writeConsent(categories, source) {
  const consent = {
    version: 1,
    source,
    updatedAt: new Date().toISOString(),
    categories: {
      ...consentDefaults,
      ...categories,
      necessary: true,
    },
  };

  try {
    window.localStorage.setItem(consentStorageKey, JSON.stringify(consent));
  } catch {
    return consent;
  }

  return consent;
}

function getConsentChoices() {
  return {
    necessary: true,
    preferences: Boolean(document.getElementById('privacy-preferences')?.checked),
    statistics: Boolean(document.getElementById('privacy-statistics')?.checked),
    marketing: Boolean(document.getElementById('privacy-marketing')?.checked),
  };
}

function setConsentChoices(categories = consentDefaults) {
  ['preferences', 'statistics', 'marketing'].forEach((key) => {
    const input = document.getElementById(`privacy-${key}`);
    if (input) {
      input.checked = Boolean(categories[key]);
    }
  });
}

function closeConsentDialog() {
  const dialog = document.getElementById('privacy-consent');
  if (!dialog) {
    return;
  }

  dialog.hidden = true;
  document.body.classList.remove('has-privacy-dialog');
}

function openConsentDialog() {
  const dialog = document.getElementById('privacy-consent');
  if (!dialog) {
    return;
  }

  const stored = readConsent();
  setConsentChoices(stored?.categories || consentDefaults);
  dialog.hidden = false;
  document.body.classList.add('has-privacy-dialog');
  requestAnimationFrame(() => {
    const panel = dialog.querySelector('.privacy-consent__panel');
    if (panel) panel.scrollTop = 0;
    dialog.querySelector('.privacy-consent__close')?.focus({ preventScroll: true });
  });
}

function injectConsentDialog() {
  if (document.getElementById('privacy-consent')) {
    return;
  }

  document.body.insertAdjacentHTML(
    'beforeend',
    `
      <section class="privacy-consent" id="privacy-consent" role="dialog" aria-modal="true" aria-labelledby="privacy-consent-title" aria-describedby="privacy-consent-copy" hidden>
        <div class="privacy-consent__panel">
          <button class="privacy-consent__close" type="button" aria-label="Datenschutz-Dialog schließen" data-consent-action="close">&times;</button>
          <div class="privacy-consent__content">
            <div class="privacy-consent__eyebrow">Privatsphäre</div>
            <h2 id="privacy-consent-title">Datenschutz-Einstellungen</h2>
            <p id="privacy-consent-copy">
              Wir nutzen keine Werbe- oder Analyse-Cookies. Diese Einstellungen zeigen trotzdem klar,
              welche Kategorien möglich wären. Optionale Kategorien bleiben aus, bis Sie zustimmen.
            </p>
            <div class="privacy-consent__links" aria-label="Rechtliche Links">
              <a href="${privacyPageUrl}">Datenschutz</a>
              <a href="${imprintPageUrl}">Impressum</a>
            </div>
          </div>

          <div class="privacy-consent__options" aria-label="Consent-Kategorien">
            <label class="privacy-option privacy-option--locked">
              <span>
                <strong>Notwendig</strong>
                <small>Technisch nötig, zum Beispiel diese Einwilligungsverwaltung.</small>
              </span>
              <input type="checkbox" checked disabled />
            </label>
            <label class="privacy-option">
              <span>
                <strong>Präferenzen</strong>
                <small>Merkt optionale Komfort-Einstellungen, falls später genutzt.</small>
              </span>
              <input id="privacy-preferences" type="checkbox" />
            </label>
            <label class="privacy-option">
              <span>
                <strong>Statistik</strong>
                <small>Derzeit nicht aktiv. Würde nur nach Zustimmung geladen.</small>
              </span>
              <input id="privacy-statistics" type="checkbox" />
            </label>
            <label class="privacy-option">
              <span>
                <strong>Marketing</strong>
                <small>Derzeit nicht aktiv. Keine Werbe-Pixel oder Retargeting-Skripte.</small>
              </span>
              <input id="privacy-marketing" type="checkbox" />
            </label>
          </div>

          <div class="privacy-consent__actions">
            <button class="privacy-consent__secondary" type="button" data-consent-action="necessary">Nur notwendige</button>
            <button class="privacy-consent__secondary" type="button" data-consent-action="save">Auswahl speichern</button>
            <button class="privacy-consent__primary" type="button" data-consent-action="all">Alle akzeptieren</button>
          </div>
        </div>
      </section>
    `
  );

  const dialog = document.getElementById('privacy-consent');

  dialog?.addEventListener('click', (event) => {
    const action = event.target.closest('[data-consent-action]')?.dataset.consentAction;
    if (!action) {
      return;
    }

    if (action === 'necessary' || action === 'close') {
      writeConsent(consentDefaults, action);
    }

    if (action === 'save') {
      writeConsent(getConsentChoices(), 'selection');
    }

    if (action === 'all') {
      writeConsent({ preferences: true, statistics: true, marketing: true }, 'all');
    }

    closeConsentDialog();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !dialog?.hidden) {
      writeConsent(consentDefaults, 'necessary');
      closeConsentDialog();
    }
  });
}

function toggleNavState() {
  if (!nav) {
    return;
  }

  nav.classList.toggle('is-scrolled', window.scrollY > 40);
}

function updateHeroMotion() {
  if (!hero) {
    return;
  }

  const rect = hero.getBoundingClientRect();
  const travel = Math.max(hero.offsetHeight - window.innerHeight * 0.45, 1);
  const progress = Math.min(Math.max(-rect.top / travel, 0), 1);

  hero.style.setProperty('--hero-progress', progress.toFixed(3));
}

function updateScrollProgress() {
  const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const progress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
  document.documentElement.style.setProperty('--scroll-progress', progress.toFixed(4));
}

function onScroll() {
  toggleNavState();
  updateHeroMotion();
  updateScrollProgress();
}

onScroll();
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', updateHeroMotion);

injectConsentDialog();

window.CExCookies = {
  open: openConsentDialog,
  close: closeConsentDialog,
  read: readConsent,
};

if (!readConsent() && !new URLSearchParams(window.location.search).has('embed')) {
  openConsentDialog();
}

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-privacy-settings]')) {
    event.preventDefault();
    openConsentDialog();
  }
});

// Die Formulare gehen an den echten Lead-Endpunkt der Digital Movement UK.
// Der Endpunkt erwartet JSON im Rumpf mit dem Header
// Content-Type: text/plain;charset=utf-8, damit die Anfrage eine einfache
// CORS-Anfrage bleibt und keine Vorabfrage (Preflight) ausloest.
if (isStaticCExSite) {
  const LEADS_ENDPOINT = 'https://leads.digitalmovement.uk/';

  document.querySelectorAll('form[data-cex-static-contact]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const status = form.querySelector('.cex-form-status');
      const submitBtn = form.querySelector('button[type="submit"]');
      const honeypot = form.querySelector('[name="company_website"]');

      // Honigfalle: ein Mensch fuellt dieses Feld nie aus. Ist es trotzdem
      // gefuellt, wird nichts gesendet, aber so getan, als hätte es geklappt.
      if (honeypot?.value) {
        if (status) status.textContent = 'Vielen Dank. Ihre Anfrage wurde vorbereitet.';
        return;
      }

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      // Doppeltes Absenden verhindern, auch wenn der Absendeknopf per
      // Enter-Taste statt per Klick ausgeloest wird.
      if (form.dataset.sending === 'true') {
        return;
      }
      form.dataset.sending = 'true';
      if (submitBtn) submitBtn.disabled = true;
      if (status) status.textContent = 'Ihre Anfrage wird gesendet …';

      const data = new FormData(form);
      const field = (key) => (data.get(key) ?? '').toString().trim();

      // Der Endpunkt kennt genau ein Freitextfeld, und es heisst `message`.
      // Die beiden Formularfassungen nennen ihres `situation` bzw.
      // `anliegen`; fuer den Firmennamen gibt es dort gar kein Feld. Beides
      // wird deshalb hier zusammengefuehrt, statt unter einem Namen zu
      // reisen, den der Endpunkt nie liest.
      const teile = [];
      const firma = field('unternehmen');
      if (firma) teile.push('Unternehmen: ' + firma);
      const freitext = field('situation') || field('anliegen');
      if (freitext) teile.push(freitext);

      // Die Zeile neben dem Ankreuzfeld ist der Wortlaut, dem zugestimmt
      // wurde. Der Endpunkt schreibt sie als Nachweis in die E-Mail.
      const consentFeld = form.querySelector('[name="consent"]');
      const consentLabel = consentFeld ? consentFeld.closest('label') : null;

      const payload = {
        name: field('name'),
        email: field('email'),
        phone: field('phone'),
        company_website: field('company_website'),
        consent: consentFeld?.checked === true,
        message: teile.join('\n\n'),
        // Macht die Betreffzeile der Benachrichtigung brauchbar: man sieht,
        // von welcher Seite die Anfrage kam, ohne sie zu oeffnen.
        service: document.title.replace(/^CEx\s*[|\u00b7-]\s*/, '').trim().slice(0, 120),
        page_url: location.href,
        form_id: form.id || 'kontakt',
        form_location: form.closest('.hero') ? 'Hero' : 'Seitenende',
        consent_text: consentLabel ? consentLabel.innerText.trim().slice(0, 500) : '',
        consent_timestamp: new Date().toISOString(),
      };

      // Absichtlich NICHT gesendet: form_open_seconds. Der Endpunkt verwirft
      // eine Anfrage stillschweigend, wenn der Wert unter zwei Sekunden
      // liegt — ein falsch gemessener Wert kostet einen echten Kontakt.
      if (false) {
      }

      fetch(LEADS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      })
        .then((response) =>
          response
            .json()
            .catch(() => ({ ok: false, error: 'Die Antwort des Servers konnte nicht gelesen werden.' }))
        )
        .then((result) => {
          if (result?.ok) {
            if (status) {
              status.textContent =
                'Vielen Dank. Ihre Anfrage ist angekommen. Wir melden uns werktags innerhalb von 24 Stunden.';
            }
            form.reset();
          } else if (status) {
            status.textContent =
              result?.error ||
              'Die Anfrage konnte nicht gesendet werden. Bitte pruefen Sie Ihre Angaben und versuchen Sie es erneut.';
          }
        })
        .catch(() => {
          if (status) {
            status.textContent =
              'Die Anfrage konnte nicht gesendet werden. Bitte schreiben Sie uns direkt an kontakt@cex.koeln.';
          }
        })
        .finally(() => {
          form.dataset.sending = 'false';
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  });
}

if (hero && !prefersReducedMotion.matches) {
  hero.addEventListener(
    'pointermove',
    (event) => {
      if (window.innerWidth < 980) {
        return;
      }

      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

      hero.style.setProperty('--hero-pointer-x', x.toFixed(3));
      hero.style.setProperty('--hero-pointer-y', y.toFixed(3));
    },
    { passive: true }
  );

  hero.addEventListener('pointerleave', () => {
    hero.style.setProperty('--hero-pointer-x', '0');
    hero.style.setProperty('--hero-pointer-y', '0');
  });
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
);

document.querySelectorAll('.reveal').forEach((element) => {
  revealObserver.observe(element);
});

if (navLinks.length) {
  const sectionMap = new Map(
    navLinks
      .map((link) => {
        const href = link.getAttribute('href') || '';
        const hash = href.startsWith('#') ? href : '';
        return [link, hash ? document.querySelector(hash) : null];
      })
      .filter(([, section]) => section)
  );

  const activeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        navLinks.forEach((link) => {
          const isActive = sectionMap.get(link) === entry.target;
          link.classList.toggle('is-active', isActive);
          if (isActive) {
            link.setAttribute('aria-current', 'true');
          } else {
            link.removeAttribute('aria-current');
          }
        });
      });
    },
    { rootMargin: '-42% 0px -50% 0px', threshold: 0.01 }
  );

  sectionMap.forEach((section) => activeObserver.observe(section));
}

const caseStudies = [
  {
    title: 'Wenn Digitalisierung starten soll, aber Zielbild, Architektur und Prozesse noch nicht zusammenpassen.',
    challenge:
      'Fachbereiche erwarten schnelle Ergebnisse, IT muss bestehende Systeme schützen, mehrere Initiativen konkurrieren um Ressourcen und der konkrete Nutzen ist noch nicht messbar.',
    focus:
      'CEx klärt Zielbild, Ist-IT-Architektur und Prozesslandschaft, priorisiert Maßnahmen im Backlog und plant die Umsetzung in Sprints mit Reviews und Hypercare.',
    change:
      'Aus einem großen Vorhaben wird ein steuerbares Programm mit klarer Reihenfolge, Verantwortlichen und messbaren Zwischenergebnissen.',
    stats: [
      ['Zielbild', 'entscheidbar'],
      ['Backlog', 'nach Nutzen priorisiert'],
      ['Sprints', 'reviewfähig geplant'],
    ],
    principleTitle: 'Erst Zielbild, dann Sprint',
    principleCopy:
      'Jeder Sprint bekommt Nutzen, Entscheidungspunkt, Verantwortliche und Übergabe. So bleibt Transformation groß genug im Ziel und klein genug in der Umsetzung.',
  },
  {
    title: 'Wenn KI-Piloten laufen, aber Nutzen, Daten, Governance und Betrieb unklar bleiben.',
    challenge:
      'Einzelne Teams testen Tools, aber Datenzugriff, Rechte, Qualität, Haftung, Prozessintegration und Akzeptanz sind noch nicht belastbar geklärt.',
    focus:
      'CEx bewertet Anwendungsfälle, Datenbasis, Berechtigungen, Risiken, Governance und Betriebsmodell und übersetzt geeignete Ideen in Pilot, Rollout und Change-Plan.',
    change:
      'KI wird vom Experiment zu einer nutzbaren Arbeitsweise mit klaren Grenzen, messbarem Nutzen und realistischen Voraussetzungen.',
    stats: [
      ['Use Cases', 'fachlich bewertet'],
      ['Daten', 'zugänglich geprüft'],
      ['Governance', 'mitgeführt'],
    ],
    principleTitle: 'KI braucht Prozessklarheit',
    principleCopy:
      'Ein Modell allein verbessert noch keinen Ablauf. Erst wenn Aufgabe, Daten, Rechte, Übergabe und Verantwortung stimmen, entsteht verlässlicher Nutzen.',
  },
  {
    title: 'Wenn Prozesse stocken oder Projekte laufen, aber Steuerung und Verantwortung fehlen.',
    challenge:
      'Abläufe dauern zu lange, Entscheidungen wandern durch zu viele Schleifen, Risiken werden spät sichtbar und Teams sind beschäftigt, ohne dass Fortschritt sicher greifbar wird.',
    focus:
      'CEx verbindet Prozessaufnahme, Kennzahlen, Rollen, PMO, Projektstruktur, Backlog, Eskalationswege und Review-Takt zu einem arbeitsfähigen Steuerungsmodell.',
    change:
      'Prozesse werden messbar verbessert, Projekte werden lesbarer geführt und Entscheidungen können früher getroffen werden.',
    stats: [
      ['Prozesse', 'messbar gemacht'],
      ['Projekte', 'klarer gesteuert'],
      ['Entscheidungen', 'früher getroffen'],
    ],
    principleTitle: 'Steuerung beginnt im Alltag',
    principleCopy:
      'Methodik hilft nur, wenn Rollen, Daten, Termine und Entscheidungen im täglichen Arbeiten greifen. Genau dort wird die Struktur angesetzt.',
  },
  {
    title: 'Wenn Anwendungen, Daten, Rollen und Veränderung auseinanderlaufen.',
    challenge:
      'Neue Systeme, alte Schnittstellen, ungeklärte Verantwortlichkeiten und hohe Change-Belastung treffen aufeinander. Strategie und Alltag passen nicht mehr sauber zusammen.',
    focus:
      'CEx verbindet Enterprise Architecture, Change Management und Governance: Zielarchitektur, Roadmap, Stakeholder, Kommunikation, Training und Betriebsübergabe.',
    change:
      'Architekturentscheidungen, Veränderungsarbeit und Umsetzung folgen derselben Richtung. Das reduziert Reibung zwischen Fachseite, IT, Führung und Betrieb.',
    stats: [
      ['Architektur', 'geordnet'],
      ['Change', 'geplant'],
      ['Betrieb', 'früh einbezogen'],
    ],
    principleTitle: 'Architektur muss getragen werden',
    principleCopy:
      'Eine Zielarchitektur wirkt erst, wenn Menschen, Rollen und Prozesse mitziehen. Deshalb werden technische und organisatorische Entscheidungen gemeinsam geführt.',
  },
];

function renderPanel(index) {
  const panel = document.getElementById(`outcomes-panel-${index}`);
  const data = caseStudies[index];

  if (!panel || !data) {
    return;
  }

  panel.innerHTML = `
    <div class="outcomes__panel-inner">
      <div class="outcomes__story">
        <h3 class="outcomes__story-title">${data.title}</h3>
        <div class="outcomes__blocks">
          <div class="outcomes__block">
            <div class="outcomes__block-label">Ausgangslage</div>
            <p class="outcomes__block-copy">${data.challenge}</p>
          </div>
          <div class="outcomes__block">
            <div class="outcomes__block-label">Arbeitsfokus</div>
            <p class="outcomes__block-copy">${data.focus}</p>
          </div>
          <div class="outcomes__block">
            <div class="outcomes__block-label">Was besser wird</div>
            <p class="outcomes__block-copy outcomes__block-copy--emphasis">${data.change}</p>
          </div>
        </div>
      </div>
      <div class="outcomes__aside">
        <div class="outcomes__stats">
          ${data.stats
            .map(
              ([value, copy]) => `
            <div class="outcomes__stat">
              <div class="outcomes__stat-value">${value}</div>
              <div class="outcomes__stat-copy">${copy}</div>
            </div>
          `
            )
            .join('')}
        </div>
        <div class="outcomes__principle">
          <div class="outcomes__principle-label">Prinzip</div>
          <div class="outcomes__principle-title">${data.principleTitle}</div>
          <p class="outcomes__principle-copy">${data.principleCopy}</p>
        </div>
      </div>
    </div>
  `;
}

caseStudies.forEach((_, index) => renderPanel(index));

document.querySelectorAll('.outcomes__tab').forEach((button) => {
  button.addEventListener('click', () => {
    const selectedIndex = Number(button.dataset.panel);

    document.querySelectorAll('.outcomes__tab').forEach((tab) => {
      const isActive = tab === button;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('.outcomes__panel').forEach((panel, index) => {
      panel.classList.toggle('is-active', index === selectedIndex);
    });
  });

  button.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return;
    }

    const tabs = Array.from(document.querySelectorAll('.outcomes__tab'));
    const currentIndex = tabs.indexOf(button);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    }

    if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }

    if (event.key === 'Home') {
      nextIndex = 0;
    }

    if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    event.preventDefault();
    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  });
});

/* ============================================================
 * Trust band: duplicate items so the marquee loops seamlessly
 * ========================================================== */
(function setupMarquee() {
  const inner = document.querySelector('.trustband__inner');
  const items = document.querySelector('.trustband__items');
  if (!inner || !items) return;

  // Only marquee on screens where the items would otherwise wrap into a long row
  if (window.matchMedia('(min-width: 700px)').matches) {
    inner.classList.add('has-marquee');
    // Duplicate items for seamless loop
    const clone = items.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    items.parentNode.appendChild(clone);
  }
})();

// Hero video plays from the first paint (src + autoplay live in the markup).
// This only nudges autoplay along where a browser stalled it, and stops the
// video for reduced-motion or data-saver users.
(function () {
  const video = document.querySelector('.hero__video');
  if (!video) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData) {
    video.autoplay = false;
    video.pause();
    return;
  }
  const play = function () {
    if (video.paused) video.play().catch(function () {});
  };
  play();
  video.addEventListener('canplay', play, { once: true });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) play();
  });
})();

// Load decorative capability-card video only shortly before its card enters
// view. This avoids downloading several large files during the first paint.
(function () {
  const videos = Array.from(document.querySelectorAll('.cap-card__video'));
  if (!videos.length) return;
  const mayAnimate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !navigator.connection?.saveData;
  // Every card has a real poster, so motion- or data-sensitive visitors do
  // not need to download decorative video files at all.
  if (!mayAnimate) return;
  const load = function (video) {
    const source = video.querySelector('source[data-src]');
    if (!source || !source.dataset.src) return;
    source.src = source.dataset.src;
    source.removeAttribute('data-src');
    video.load();
    video.play().catch(function () {});
  };
  if (!('IntersectionObserver' in window)) {
    videos.forEach(load);
    return;
  }
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      load(entry.target);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '500px 0px' });
  videos.forEach(function (video) { observer.observe(video); });
})();

/* ============================================================
 * Scroll-driven animation FALLBACK for browsers without
 * native CSS scroll-timeline (Safari today). Uses
 * IntersectionObserver + transform/opacity directly.
 * ========================================================== */
(function scrollMotionFallback() {
  if (CSS.supports && CSS.supports('animation-timeline: view()')) {
    return; // Native handles it
  }
  if (prefersReducedMotion.matches) return;

  // Hero parallax: subtle scale on video as user scrolls past hero
  const heroVideoShell = document.querySelector('.hero__video-shell');
  const heroCopy = document.querySelector('.hero__copy');
  const heroFormWrap = document.querySelector('.hero__form-wrap');

  function updateHeroParallax() {
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    const heroH = hero.offsetHeight;
    const progress = Math.min(Math.max(-rect.top / heroH, 0), 1);
    if (heroVideoShell) {
      heroVideoShell.style.transform = `scale(${1 + progress * 0.12}) translateY(${-progress * 8}%)`;
    }
    if (heroCopy) {
      heroCopy.style.opacity = String(1 - progress * 0.95);
      heroCopy.style.transform = `translateY(${-progress * 60}px)`;
    }
    if (heroFormWrap) {
      heroFormWrap.style.opacity = String(1 - progress * 0.9);
      heroFormWrap.style.transform = `translateY(${-progress * 40}px) scale(${1 - progress * 0.04})`;
    }
  }
  window.addEventListener('scroll', updateHeroParallax, { passive: true });
  updateHeroParallax();

  // Capability cards: scrub scale-down on scroll past
  const capCards = Array.from(document.querySelectorAll('.cap-card'));
  function updateCapCards() {
    capCards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const vh = window.innerHeight;
      // Once card top is near viewport top, start scaling down
      const exitProgress = Math.min(Math.max(-(rect.top - vh * 0.3) / (vh * 0.5), 0), 1);
      card.style.transformOrigin = '50% 100%';
      card.style.transform = `scale(${1 - exitProgress * 0.025}) translateY(${-exitProgress * 10}px)`;
      card.style.opacity = String(1 - exitProgress * 0.5);
      // Image scrub-in
      const video = card.querySelector('.cap-card__video');
      if (video) {
        const enterProgress = Math.min(Math.max(1 - rect.top / vh, 0), 1);
        video.style.transform = `scale(${1.18 - enterProgress * 0.18})`;
      }
    });
  }
  window.addEventListener('scroll', updateCapCards, { passive: true });
  updateCapCards();

  // Generic IntersectionObserver-based reveal for sections
  const revealClasses = ['.h-section', '.h-lead', '.journey-step', '.benefit', '.faq-item', '.final-cta__headline', '.outcomes__panel-inner', '.footer__brand-wrap', '.footer__col'];
  const fallbackObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('motion-in');
          fallbackObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  revealClasses.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.classList.add('motion-pending');
      fallbackObserver.observe(el);
    });
  });

  // Final CTA glyph rotation on enter
  const finalGlyph = document.querySelector('.final-cta__headline-glyph');
  const finalSection = document.querySelector('.final-cta');
  if (finalGlyph && finalSection) {
    const glyphObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          finalGlyph.style.animation = 'acn-headline-V 900ms var(--acn-ease-hero-2) 200ms backwards';
          glyphObserver.unobserve(finalSection);
        }
      },
      { threshold: 0.25 }
    );
    glyphObserver.observe(finalSection);
  }
})();

/* ==========================================================================
   Hauptmenü-Drawer — einziger Handler (Topbar v2)
   ========================================================================== */
(function () {
  const btn = document.getElementById('cxMenuToggle');
  const drawer = document.getElementById('cxServicesDrawer');
  const scrim = document.getElementById('cxDrawerScrim');
  if (!btn || !drawer || !scrim) return;

  const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const isOpen = () => drawer.classList.contains('is-open');

  function open() {
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Menü schließen');
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    scrim.classList.add('is-open');
    scrim.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    const first = drawer.querySelector(FOCUSABLE);
    if (first) first.focus();
  }

  function close(returnFocus) {
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Menü öffnen');
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    scrim.classList.remove('is-open');
    scrim.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    if (returnFocus) btn.focus();
  }

  btn.addEventListener('click', () => { isOpen() ? close(false) : open(); });
  scrim.addEventListener('click', () => close(true));

  document.addEventListener('keydown', (event) => {
    if (!isOpen()) return;
    if (event.key === 'Escape') { close(true); return; }
    if (event.key !== 'Tab') return;
    const items = [btn, ...drawer.querySelectorAll(FOCUSABLE)].filter(
      (el) => el.offsetWidth || el.offsetHeight || el === document.activeElement
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  drawer.querySelectorAll('.cx-drawer__link, .cx-drawer__cta, .cx-drawer__jump')
    .forEach((a) => a.addEventListener('click', () => setTimeout(() => close(false), 0)));
})();
