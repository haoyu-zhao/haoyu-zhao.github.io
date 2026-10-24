# Haoyu Zhao's academic homepage

Live website: https://haoyu-zhao.github.io/

The editable Next.js source and the published static pages live in this repository.
GitHub Pages serves the root of `main`; `.nojekyll` lets it serve the `_next` assets.

## Editing

- `content/bio.md`: biography and useful links.
- `content/news.toml`: news and links.
- `content/publications.bib`: publication metadata and display order.
- `content/publication-details.json`: abstracts, BibTeX, and their sources.
- `content/config.toml`: profile, contacts, and navigation.
- `src/components/` and `src/app/globals.css`: layout and styles.
- `public/images/`: profile photo and paper figures.

Use Node.js 22 or newer:

```sh
npm ci
npm run dev
```

## Publishing

```sh
npm run build
npm run publish:static
```

Review and commit the source changes together with the generated static files,
then push to `main`. GitHub Pages publishes that commit automatically.
The publishing script preserves legacy image URLs, domain configuration, and the
Google verification file. Local previews, browser screenshots, and dependencies
are excluded from version control.

The site is adapted from [Innse's homepage](https://github.com/Innse/innse.github.io)
and PRISM. The original MIT license is retained in `LICENSE`; font and icon
licenses are included under `public/fonts/` and `public/icons/`.
