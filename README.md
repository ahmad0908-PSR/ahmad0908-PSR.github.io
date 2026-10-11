# Ahmad Akbary: product website

A website that shows businesses and NGOs what you can **build for them**:
custom management systems, web apps, dashboards and data services, in
**English, Dari and Pashto**. The systems in the catalog are **demos**
(working examples visitors can open and add test data to), not ready-made
products: every visitor is invited to have their own built. It's pure HTML,
CSS and JavaScript: no build step, no server, no database, hosted free on
GitHub Pages. Quote requests go to your Google Sheet through a free Google
Apps Script.

> **Status:** all 5 build phases are complete. Before going live, work through
> the **Launch checklist** below.

## Contents

1. [Launch checklist](#launch-checklist)
2. [Your social and contact links](#your-social-and-contact-links)
3. [Folder structure](#folder-structure)
4. [Run it locally](#run-it-locally)
5. [Editing content](#editing-content)
6. [Product and service pages](#product-and-service-pages)
7. [Quote form](#quote-form)
8. [Translations](#translations)
9. [Search engines and share previews](#search-engines-and-share-previews)
10. [Animation (GSAP)](#animation-gsap)
11. [Deploy to GitHub Pages](#deploy-to-github-pages)

---

## Launch checklist

Tick these off before you share the site publicly:

- [x] **Your hero photo** at `assets/me.png` (cut-out PNG, transparent background).
- [x] **Your About photo** at `assets/about-placeholder.jpg`.
- [x] **Tech stack** (`stack` in `data/config.json`) lists the tools you really use.
- [x] **Demo screenshots** and covers in `assets/projects/<demo>/`.
- [x] **Contact and social links**: WhatsApp, Telegram, Email, Facebook, Instagram, X, GitHub.
- [ ] **LinkedIn:** add your profile link, or leave it empty and do the next step.
- [x] **`social.previewMode` set to `false`** in `data/config.json`, so any
      channel still without a link disappears instead of showing "coming soon".
- [ ] **Testimonials:** set `showExamples` to `false` in `data/testimonials.json`
      (the section then hides until you add real ones).
- [ ] **Quote form connected** to your Google Sheet ([Quote form](#quote-form)),
      and one test request sent from the live site.
- [x] **Share-preview image** (`assets/brand/og-image.jpg`, 1200 x 630) in the
      new cream design, with your photo.
- [ ] **Review the FAQ answers** in `data/faq.json`.
- [ ] **Native-speaker check** of the Dari and Pashto text ([Translations](#translations)).
- [ ] **"Back to Portfolio" links** in each demo app's own `data/config.json`
      (`portfolioUrl`: `https://ahmad0908-psr.github.io/`).
- [ ] **Repository named `ahmad0908-PSR.github.io`** so the address matches `site.url`.
- [ ] **Old files removed** from the previous version of the site (see [Deploy](#deploy-to-github-pages)).

---

## Your social and contact links

All links live in `data/config.json`. The site builds the buttons from them:
the round icons in the footer, and the WhatsApp / Telegram / Email buttons in
the contact section and on every product page.

**Preview mode:** while `"previewMode": true`, buttons whose link is still
empty are shown anyway (dimmed, dashed outline, "Link coming soon") so you
can see the design. They do nothing when clicked. Set it to `false` at launch.

### Where to find each link

| Channel | What to put in config.json | How to find it |
|---|---|---|
| **WhatsApp** | `"contact" > "whatsapp"`: your number in international format, digits only, e.g. `93700123456` | Your phone number without the leading 0, with the country code in front (93 for Afghanistan). A WhatsApp Business account is a good idea: it lets you set a greeting and business hours. |
| **Telegram** | `"contact" > "telegram"`: your username, e.g. `ahmadakbary` | Telegram → **Settings → Username**. If you don't have one, create one there (5 or more letters, numbers or _). |
| **Email** | `"contact" > "email"` | Already set to your Gmail address. |
| **Facebook** | `"social" > "facebook"`: full address | Open your Facebook **Page** (a business page looks more professional than a personal profile), then copy the address from the browser, e.g. `https://www.facebook.com/ahmadakbary.dev`. On the phone app: Page → **⋯ → Share → Copy link**. |
| **Instagram** | `"social" > "instagram"`: full address | `https://www.instagram.com/` followed by your username, e.g. `https://www.instagram.com/ahmadakbary.dev`. |
| **X (Twitter)** | `"social" > "x"`: full address | `https://x.com/` followed by your username (without @). |
| **LinkedIn** | `"social" > "linkedin"`: full address | Open your profile → **Contact info** → copy "Your profile", e.g. `https://www.linkedin.com/in/ahmad-akbary`. Tip: set a custom short address under **Edit public profile & URL**. |
| **GitHub** | `"social" > "github"`: full address | `https://github.com/` followed by your username. Currently set to `https://github.com/ahmad0908-PSR`. |

Social links must start with `https://`. Anything else is ignored, so a
mistyped link can never produce a broken button.

---

## Folder structure

```
index.html              homepage
product.html            ONE template for every product and service page
404.html                shown by GitHub Pages for addresses that don't exist
sitemap.xml, robots.txt for search engines (made by tools/update-site-files.py)
css/style.css           all styling: design tokens, dark/light themes, RTL
js/
  common.js             startup shared by every page (data, language, nav, footer)
  main.js               homepage entry point
  product-page.js       product / service page entry point
  i18n.js               language engine (English / Dari / Pashto + right-to-left)
  links.js              every contact and social link (+ preview mode)
  catalog.js            product catalog: audience switch, need tiles, cards
  cards.js              the product card (catalog + related items)
  services.js           services section
  stack.js              tech stack section + the code card in the hero
  testimonials.js       "What clients say" carousel
  sections.js           hero photo/email, about stats, FAQ, contact buttons
  quote-form.js         the "Request a quote" form
  gallery.js            full-size screenshot viewer
  hero.js               the rotating "Built for ..." line
  particles.js          animated network background
  motion.js             all GSAP animation (safe to remove: site still works)
  theme.js              dark / light toggle
  nav.js                navigation, mobile menu, language buttons
  icons.js              every icon, as inline SVG
  state.js, utils.js    shared data and small helpers
data/
  config.json           site address, contact + social links, photo, tools list
  products.json         every product and service, in all three languages
  faq.json              frequently asked questions, in all three languages
  testimonials.json     client testimonials (section hidden while empty)
i18n/
  en.json  fa.json  ps.json    interface text (buttons, headings, labels)
vendor/gsap/            GSAP 3.15 (core, ScrollTrigger, Flip), stored locally
google-apps-script/
  Code.gs               receives quote requests: saves them to your Google
                        Sheet and emails you (runs on Google, not GitHub)
tools/
  serve.py              local preview server (always shows your latest edits)
  update-site-files.py  rebuilds sitemap.xml / robots.txt, updates the site address
assets/
  brand/                favicon, phone home-screen icon, share-preview image
  ...                   your own images (keep your existing folder)
```

---

## Run it locally

The site loads JSON files, which browsers block when you open `index.html`
directly from disk. Serve the folder instead:

```bash
python tools/serve.py
```

Use this rather than `python -m http.server`: the built-in server lets the
browser keep old copies of the JavaScript and CSS, so after an edit you may
still see the previous version. `tools/serve.py` always sends fresh files.

Then open `http://localhost:8000`. Useful test addresses:

- `http://localhost:8000/?lang=fa`: opens in Dari (`?lang=ps` for Pashto)
- `http://localhost:8000/?for=ngo#products`: catalog filtered for NGOs
- `http://localhost:8000/product.html?id=dental-clinic`: one product page
- `http://localhost:8000/?item=pharmacy-pos#contact`: quote form with a product selected

---

## Editing content

| To change... | Edit |
|---|---|
| Hero, section titles, buttons, labels | `i18n/en.json`, `i18n/fa.json`, `i18n/ps.json` |
| Products and services | `data/products.json` (instructions at the top of the file) |
| FAQ questions and answers | `data/faq.json` |
| Contact and social links | `data/config.json` (see above) |
| Hero portrait (cut-out PNG) | `person.heroPhoto` in `data/config.json` |
| Your photo (About section) | `person.photo` in `data/config.json` |
| "Available for new projects" badge | `person.available` in `data/config.json` |
| Code card in the hero | `person.codeCard` in `data/config.json` |
| Tech stack section | `stack` in `data/config.json` (group titles in `i18n/*.json` under `stack.groups`) |
| Testimonials | `data/testimonials.json` (instructions at the top of the file) |
| "Works with" tool names | `tools` in `data/config.json` |
| Colors and fonts | `css/style.css`, section 1 (light theme first, then dark) |
| Particle animation | `particles` in `data/config.json` |

**Adding a product?** Copy an existing item in `data/products.json`, give it a
new `id`, fill in the `en`, `fa` and `ps` text, then run
`python tools/update-site-files.py` so search engines learn about the new page.

## Product and service pages

Every item in `data/products.json` automatically gets a page at
`product.html?id=<id>`, for example `product.html?id=dental-clinic`. Sections
appear only when their data exists, so a page grows as you add media:

| Add this to the item... | ...and the page shows |
|---|---|
| `media.cover` | the image in the page header and on cards |
| `media.previewVideo` | a silent looping preview in the header instead of the image |
| `media.youtubeId` | a "See it in action" video with subtitles in the visitor's language |
| `media.screenshots` | a screenshot gallery with a full-size viewer |
| `samples` (services) | "Examples of my work" |
| `tech.stack`, `tech.notes`, `links.repo` | the collapsed "Under the hood" panel |

**Suggested folder for media:** `assets/products/<id>/` (for example
`assets/products/dental-clinic/1.jpg`). Screenshots look best at 16:10
(e.g. 1600 x 1000 pixels), saved as JPG or WebP under ~300 KB each.

**YouTube subtitles:** upload subtitle tracks for English (`en`), Dari
(`fa`) and Pashto (`ps`). The player automatically shows the one matching
the visitor's language.

---

## Quote form

The contact section's form sends each request to a free Google Apps Script,
which adds it as a row in a Google Sheet and emails you. Until you set it up,
the form still works: it opens the visitor's email app with the request ready
to send.

### Set it up (about 10 minutes, once)

1. **Create the sheet.** Go to [sheets.google.com](https://sheets.google.com),
   create a blank spreadsheet and name it, for example, `Website quote requests`.
2. **Open the script editor.** In the sheet: **Extensions → Apps Script**.
3. **Paste the script.** Delete everything in `Code.gs`, paste in the whole of
   `google-apps-script/Code.gs` from this project, and press **Save**.
4. **Run the setup once.** In the toolbar, choose the function **`setup`** and
   press **Run**. Google asks for permission:
   - **Review permissions →** choose your account.
   - You'll see "Google hasn't verified this app". That's normal for your own
     script: **Advanced → Go to (project name) (unsafe) → Allow**.
   - A **Requests** tab appears in your sheet, and you receive a test email.
5. **Publish it.** **Deploy → New deployment →** the gear icon → **Web app**:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone** (needed so the website can send to it; the
     script can only add rows, it never shows your sheet to anyone)
   - Press **Deploy** and copy the **Web app URL** (it ends in `/exec`).
6. **Connect the website.** In `data/config.json`, paste the URL:
   ```json
   "formEndpoint": "https://script.google.com/macros/s/XXXXXXXX/exec"
   ```
7. **Test it** by sending a request from your live site. A row with
   Status "New" should appear, and the notification email should arrive.
   Replying to that email answers the client directly.

> **After any change to the script**, publish again:
> **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy.**
> Saving alone does not update the live form. The URL stays the same.

### Good to know

- **The Status column** is for you: change "New" to Replied, Won or Lost to
  keep track of your leads.
- **Settings** at the top of `Code.gs`: send notifications to a different
  address (`NOTIFY_EMAIL`) or turn them off (`SEND_NOTIFICATIONS`).
- **Spam protection:** a hidden field that only bots fill in, plus a minimum
  time on the page. Bots get a fake "thank you" and nothing is saved.
- **Pre-selected products:** any "Request a quote" button on the site selects
  its product in the form automatically. You can also share a link that does
  this: `index.html?item=pharmacy-pos#contact`.
- **Unsent drafts** are kept in the visitor's own browser for 14 days, so a
  dropped connection doesn't lose their message.
- **Phone numbers** typed with Persian digits (۰۷۰۰...) are converted to
  0700... automatically.

---

## Translations

Every piece of text exists in English, Dari and Pashto:

- **Interface text** (buttons, headings, labels, error messages): `i18n/*.json`
- **Product and service text**: the `fa` and `ps` blocks of each item in `data/products.json`
- **FAQ**: the `fa` and `ps` blocks in `data/faq.json`

Anything left empty in Dari or Pashto automatically shows the English text,
so a half-finished translation never leaves a blank on the page.

**Product names stay in English** in all three languages, as brand names.

**Please have a native speaker review** the Dari and Pashto, especially the
Pashto, before launch. They were written carefully, with Afghan vocabulary
(دواخانه، گدام، معاش، ولسوالی), but a local reader catches what fits your
audience best.

**Numbers** appear in Eastern Arabic digits (۱۲۳) on Dari and Pashto pages,
automatically.

---

## Search engines and share previews

- **Share previews:** when someone shares your link on WhatsApp, Facebook,
  LinkedIn, Telegram or X, a card appears with `assets/brand/og-image.jpg`
  (1200 x 630), your name and description. All product links share this same
  card, because preview apps don't run JavaScript.
- **Google:** the homepage tells Google who you are (structured data), which
  languages exist (`hreflang`), and where every page is (`sitemap.xml`).
- **Favicon:** `assets/brand/favicon.svg`, with a PNG copy and a home-screen
  icon for phones.

### When your site address changes, or you add products

1. Set `"site" > "url"` in `data/config.json` to the full address, ending in
   `/`. For a GitHub user site that's `https://<username>.github.io/`; for a
   project site it's `https://<username>.github.io/<repository-name>/`.
2. Run, from the site folder:
   ```bash
   python tools/update-site-files.py
   ```
   It rebuilds `sitemap.xml` and `robots.txt`, and updates the address inside
   `index.html`, `product.html` and `404.html`.

### Tell Google about the site (once, after launch)

1. Open [Google Search Console](https://search.google.com/search-console) and
   add your site address as a **URL prefix** property.
2. Verify ownership with the **HTML tag** method: Google gives you a
   `<meta name="google-site-verification" ...>` line; paste it into the
   `<head>` of `index.html`, push, then press **Verify**.
3. Go to **Sitemaps**, enter `sitemap.xml`, and press **Submit**.

To check how share cards look, paste your address into the
[Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/).
It also refreshes Facebook's and WhatsApp's stored copy after you change the image.

---

## Design

The look follows a warm, friendly designer style with developer touches:

- **Colors:** cream background, deep teal, navy text, with mustard, coral and
  mint accents. The site opens in this light theme; visitors can switch to a
  matching dark theme with the moon button.
- **Fonts:** Outfit (headings), DM Sans (text) and JetBrains Mono for the
  code touches. Dari and Pashto use Vazirmatn throughout.
- **Developer touches:** `// section` labels above headings, the `<Ahmad Akbary/>`
  logo, the `>_` prompt before the typing line, the code card in the hero, and
  technology names set like code.

## Animation (GSAP)

GSAP is free for commercial use under its standard license and is stored in
`vendor/gsap/`, so the site never depends on an outside server. All animation
lives in `js/motion.js`. If GSAP fails to load, or a visitor's device asks for
reduced motion, the site shows everything without animation.

---

## Deploy to GitHub Pages

1. Replace the old files in your repository with this folder's contents.
   **Keep your `assets/` folder**, and add the new `assets/brand/` folder to it.
2. Delete the old files the new site no longer uses: `data/experience.json`,
   `data/certifications.json`, `data/tech-stack.json`, and the old root-level
   `style.css` and `script.js`.
3. Commit and push. GitHub Pages publishes the new version within a minute
   or two.
4. Open the live site and check: the language switch, a product page, and a
   test quote request.

## Accessibility

The site was checked with the axe-core accessibility audit (WCAG 2.1 AA) in
both themes and all three languages, with no issues found. Every text color
meets the 4.5:1 contrast minimum, everything works with a keyboard, and
motion switches off for visitors who ask for less of it.
