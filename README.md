# cex.koeln

**Die Website von CEx ist `cex.koeln`.** Das ist die öffentliche Adresse der
Marke und die kanonische Domain in jedem `<head>`. `cex.digitalmovement.uk` ist
nur der WordPress-Testserver, `digitalmovementuk.github.io/cx/` nur eine alte
statische Vorschau — beides ist nicht die Website.

Hier liegt die **vorläufige Startseite**: eine einzelne Seite im vollen
CEx-Design, damit unter der Marke etwas Echtes erreichbar ist, solange die
komplette Website noch gebaut wird.

Live über GitHub Pages, Repo `digitalmovementuk/cex-koeln`, Branch `main`,
Wurzelverzeichnis. Die `CNAME`-Datei hält die Domain. HTTPS ist erzwungen; das
Zertifikat kommt von GitHub und deckt `cex.koeln` und `www.cex.koeln` ab.

## Wie die Seite entsteht

```
bash make.sh
```

Das macht drei Dinge, in genau dieser Reihenfolge:

1. `build.py` — setzt `index.html`, `impressum.html` und `datenschutz.html`
   zusammen und kopiert alle Dateien, die die Seite wirklich anfordert.
2. `scripts/render-icons.sh` — rendert den Favicon-Satz aus `favicon.svg`.
3. `scripts/render-share-cards.sh` — rendert die Vorschaubilder für Social Media
   aus `scripts/og-image-source.html`.

**`index.html` wird nie von Hand bearbeitet.** Die Abschnitte werden wörtlich aus
dem neuesten WordPress-Schnappschuss in
`../wordpress-cex/_homepage-snapshots/` übernommen — WordPress ist seit dem
5. August 2026 die einzige Quelle für CEx-Texte. Wer den Text ändern will,
ändert ihn in WordPress, zieht einen neuen Schnappschuss und baut neu.

Von Hand gepflegt werden nur:

| Datei | Was drin steht |
|---|---|
| `placeholder.css` | alles, was es nur auf dieser einen Seite gibt: die schrumpfende Kopfleiste, die untere CTA-Leiste, der FAQ-Fix |
| `cex-koeln.js` | die untere Leiste und die Markierung des aktuellen Abschnitts in der Navigation |
| `legal/impressum-body.html` | der `<main>`-Teil des Impressums |
| `legal/datenschutz-body.html` | der `<main>`-Teil der Datenschutzhinweise |
| `scripts/og-image-source.html` | die Vorlage der Social-Media-Bilder |

Alle übrigen Stylesheets, `script.js`, die Schriften und die Medien kommen aus
`../github-cx/` und werden beim Bauen kopiert. Änderungen daran gehören dorthin.

## Datenschutz

- Die Seite lädt **nichts** von fremden Servern: Schriften liegen lokal, die
  Filme liegen hier, es gibt keine Statistik, keine Werbepixel, keine Karte.
- Es werden **keine Cookies** gesetzt. Die Einwilligung liegt allein im
  `localStorage` unter `cxPrivacyConsent.v1`.
- Der Einwilligungsdialog ist der aus der großen Website, unverändert. Er öffnet
  sich beim ersten Besuch; über „Cookie-Einstellungen“ im Fußbereich und über
  den Knopf in den Datenschutzhinweisen lässt er sich jederzeit wieder öffnen.
- Impressum und Datenschutzhinweise sind **für genau diese Veröffentlichung**
  geschrieben, nicht von der großen Website kopiert: anderer Hoster, andere
  Speicherung, andere Drittländer. Beide enthalten einen Abschnitt zur
  EU-KI-Verordnung (Verordnung (EU) 2024/1689).
- Gehostet wird bewusst bei GitHub Pages und nicht bei Hostinger: der Server des
  Hostinger-Kontos steht im Rechenzentrum `dci-indonesia`, und für Indonesien
  gibt es keinen Angemessenheitsbeschluss. GitHub ist über das EU-US Data
  Privacy Framework abgedeckt.

## DNS

Die Domain liegt bei **IONOS im Konto des Kunden**. Der Apex zeigt auf die vier
GitHub-Pages-Adressen, `www` ist ein CNAME auf `digitalmovementuk.github.io`.

Wenn die Vorschau in Slack oder WhatsApp plötzlich ohne Bild erscheint, liegt es
fast immer am Zertifikat und nicht an den Meta-Angaben: Das Vorschaubild wird
über `https://` geholt, und ohne gültiges Zertifikat scheitert dieser Abruf
stillschweigend. Prüfen mit:

```
curl -sS -o /dev/null -w '%{http_code} tls=%{ssl_verify_result}\n' https://cex.koeln/media/cex-og-1200x630.jpg
```

`tls=0` heißt, das Zertifikat ist in Ordnung.

Die Einträge für die E-Mail — `MX` auf `mx00`/`mx01.ionos.de`, der SPF-Eintrag,
die DKIM- und DMARC-Einträge und `autodiscover` — gehören zum Postfach des
Kunden und dürfen nie angefasst werden.
