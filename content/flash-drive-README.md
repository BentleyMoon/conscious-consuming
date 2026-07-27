# Values Commons Flash-Drive Edition

This folder is a portable copy of Values Commons: the public home, Conscious Consuming, the Open Values Standard, the example instances, the organizing tools, rendered docs, and the source files that make the commons forkable.

It is designed to be handed to a person as a physical object. It should make one honest promise: you can inspect and run the commons locally without an account, backend, tracker, or permission from us.

## Fast Start

If this is the full project folder:

1. Open `index.html` to start at the Values Commons home.
2. For the smoothest full app experience, run the local helper:
   - Windows: double-click `run.cmd`.
   - macOS or Linux: run `python run.py` from this folder.
3. Open the printed local URL. It will look like `http://localhost:8830/app/`.
4. Stop the helper with `Ctrl+C` when you are done.

If this is a built `dist/` package:

1. Open `index.html` for the public home and rendered docs.
2. If the interactive app cannot load category data from `file://`, serve the folder locally instead:

```bash
python -m http.server 8830
```

Then open `http://localhost:8830/`.

Private preview builds include the `app/data.js` fallback for double-clicked `file://` use. Public production builds omit that large fallback because the hosted app lazy-loads per-category JSON for deployment.

## What Works Without The Internet

- The public home and static docs.
- The core app when its built data is available locally.
- Saved values and notes on the same browser/device.
- Local comparisons, guides, verdict pages, and exported files.

Source links, product websites, remote APIs, and any clicked external citation need an internet connection. Nothing here uploads your values unless you explicitly export or share a file yourself.

## What Not To Promise

- Do not claim `file://` is installable as an offline PWA. It is not.
- Do not claim the service worker runs from `file://`. Browsers require a secure context for that.
- Do not claim `localhost` is the same as a public installable deployment. The local helper is for testing and sharing from the flash drive.
- Do not claim live source links work offline. The cited URLs are preserved, but the web still has to be reachable.

For installable/offline PWA behavior, deploy the static package to HTTPS on a real host. The flash drive is the resilient local copy; HTTPS hosting is the installable copy.

## Privacy Promise

The core has no account system, no backend, no tracking pixel, and no central store. Your values, saved notes, and local overlays stay on the device unless you export them. If you hand someone this drive, you are handing them files, not signing them up for a service.

## What To Try First

1. Open Conscious Consuming and compare a category by dragging value weights.
2. Open a verdict card and inspect the cited evidence.
3. Export a Values Passport from the You view.
4. Visit the Open Values Standard and read how lenses, provenance, and passports fit together.
5. Try Assembly, Workshop, and Slate with local files.

## Updating The Drive

To refresh a physical copy:

1. Pull or copy the latest project folder.
2. Run the normal verification/release gate before gifting it.
3. Replace the old folder on the drive with the new one.

Recommended checks:

```bash
npm run verify:full
npm run release:preflight
```

## License And Attribution

Code, data, guides, and docs carry their own licenses in `LICENSE` and `LICENSING.md`. Food and beauty data come from Open Food Facts and Open Beauty Facts under ODbL; curated lenses carry their own per-claim sources.
