# Zuno Note

Zuno Note is a mobile-first, local-first digital notebook. It takes inspiration from the breadth of Samsung Notes while keeping its own dark teal, soft-motion visual language.

## Notebook features

- Rich multi-page notes with page reorder, duplicate, delete, page navigator and zoom
- Handwriting canvas with pressure-aware stroke points, pen/highlighter tools, multiple pen textures, eraser, lasso, laser pointer, shapes and stamps
- Text notes, floating text boxes, checklists, images and video attachments
- Voice-note data support, note tags, folders, favorites and trash/restore
- Note reminders, private-note lock, templates, focus timer and search
- Paper themes and page patterns, custom expressive controls and accent color
- IndexedDB local storage with offline support
- JSON backup/restore, file import and PWA installation

## Design direction

- Zuno identity: deep charcoal/teal surfaces, soft glass-like panels and gentle liquid interactions
- Mobile-first touch targets and responsive editor layout
- Respect system reduced-motion preference
- Keep the interface branded as Zuno Note; do not reuse the former Karanot identity

## Development

```bash
npm install
npm run dev
npm run lint
npm run build
```

The app is built with Vite + React + TypeScript and packaged as a native Android app with Capacitor. GitHub Actions builds an installable Android debug APK on every push and exposes it as a workflow artifact. The APK is not a hosted website or a PWA install prompt.

## Important update behavior

The release checker reads GitHub Releases and searches for a real APK asset. It does not manufacture a demo release or a placeholder APK. If no newer release or APK asset exists, the UI should say so rather than offer a false download. Android package installation still requires the user to open the downloaded APK and approve installation; a website cannot silently install or replace an Android app.

## Data and privacy

Notes are stored locally in the browser's IndexedDB database. Export a JSON backup before clearing site data or moving to another device. A browser-local PIN gate is a convenience lock, not a substitute for Android-level encrypted storage.

## Project goal

Build a complete, comfortable notebook workflow inspired by feature-rich handwriting apps—without sacrificing Zuno's own identity or making promises about cloud sync, OCR, handwriting recognition, or cross-device sync until those services are implemented.
