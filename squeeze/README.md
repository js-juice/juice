# Juice Extractor

Electron app to extract selected files from `vendor/juice` with minimal dependencies.

## Output Layout

- Selected files are copied under `juice/...`
- Combined dependency bundle is written to `Pulp/pulp.mjs` (when enabled)
- Manifest is written to `extract-manifest.json`

Manifest includes:
- Selected files
- Output file mappings
- Dependency files included directly
- Dependency source files folded into `Pulp/pulp.mjs`
- Juice git snapshot (`head`, branch, remote)
- SHA-256 hash map of source files used in the extract

## Updater In Export

Each exported zip includes `scripts/resqueeze.mjs`.

Check for upstream/code drift:

```bash
node scripts/resqueeze.mjs
```

Apply updates into extracted `juice/...` files:

```bash
node scripts/resqueeze.mjs --apply
```

Optional override:

```bash
node scripts/resqueeze.mjs --juice <path-to-juice> [--apply]
```

If `--juice` is omitted, updater uses manifest remote URL (public Juice repo) and falls back to local `./juice` when needed.  
If `esbuild` is installed in the extracted package environment, `--apply` also attempts to rebuild `Pulp/pulp.mjs`.

## Run

```bash
cd vendor/juice-extractor
npm install
npm start
```

## Build Executables (Electron Forge)

From `vendor/juice-extractor`:

```bash
npm install
npm run make
```

Optional clean rebuild:

```bash
rmdir /s /q out
npm run make
```

Output artifacts:

- Installer: `out/make/squirrel.windows/x64/juice-extractor-<version> Setup.exe`
- Unpacked app folder: `out/juice-extractor-win32-x64`
- Direct exe: `out/juice-extractor-win32-x64/juice-extractor.exe`

If you need a new installer version, bump `"version"` in `package.json` before running `npm run make`.

## Notes

- Dependency tracing is static (import/require string literals).
- Dynamic import paths and runtime-generated requires are not guaranteed.
