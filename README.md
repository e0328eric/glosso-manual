# Glosso Manual

The Glosso language manual is a static website rendered by Glosso and
[Clay](https://github.com/nicbarker/clay) in freestanding WebAssembly.

GitHub Pages publishes precompiled files from `dist/`. It does not access the
private Glosso repository or compile the project in GitHub Actions.

## Files

- `first.glo` is the compile-time build driver.
- `main.glo` is the manual compiler entry point and loads the sources under
  `src/`.
- `src/clay_bindings.glo` builds Clay and inserts its target-specific bindings.
- `src/clay_ui.glo` contains shared Clay declarations and content primitives.
- `src/section_catalog.glo` contains section state and titles.
- `src/sections_*.glo` contains the manual chapters, grouped by topic.
- `src/manual_ui.glo` contains section dispatch, navigation, layout, and the
  Wasm entry point.
- `vendor/clay/clay.h` is the pinned Clay source used during compilation.
- `index.html` is the browser host and Clay command renderer.
- `dist/index.html` and `dist/manual.wasm` are the files deployed to GitHub
  Pages.

## How the build works

Compiling `first.glo` executes its top-level `#comptime` build procedure. That
procedure:

1. Compiles `main.glo` for `wasm32-freestanding`.
2. During that compilation, builds a cached Clay static library for the active
   target and inserts matching Bindgen declarations directly into the module.
3. Links the result as `dist/manual.wasm`.
4. Copies `index.html` to `dist/index.html`.

`first.glo` marks its outer build-driver compilation as output-free and starts
the `main.glo` compilation with an explicit wasm target. This gives both the C
compiler and Bindgen the correct active target without creating a disposable
helper object or LLVM IR file. The browser binary is `dist/manual.wasm`.

## Compile locally

Keep this repository and the private Glosso repository as sibling directories:

```text
Github/
|-- glosso/
`-- glosso-manual/
```

First build the Glosso compiler.

### Windows PowerShell

```powershell
cd ..\glosso
rustc --edition=2021 -O build.rs -o build.exe
.\build.exe build

cd ..\glosso-manual
& ..\glosso\build\bin\glosso.exe first.glo --std ..\glosso\std
```

### Linux or macOS

```sh
cd ../glosso
rustc --edition=2021 -O build.rs -o build.exe
./build.exe build

cd ../glosso-manual
../glosso/build/bin/glosso first.glo --std ../glosso/std
```

After a successful build, serve `dist/` over HTTP:

```sh
python -m http.server 8000 -d dist
```

Open `http://localhost:8000`. Loading `dist/index.html` directly with a
`file:` URL will not work because the browser fetches `manual.wasm`.

## Publish

Commit the regenerated deployment files and push them:

```sh
git add dist/index.html dist/manual.wasm
git commit -m "Update compiled manual"
git push
```

The workflow in `.github/workflows/pages.yml` uploads the committed `dist/`
directory and deploys it to GitHub Pages. The generated `build/` directory is
not required for rendering or deployment and should not be committed.
