# Gradient Lab

An image-sampled CSS gradient studio. Drop a photo, draw sampling lines across it, refine the color stops, and export Bootstrap-ready CSS gradient classes.

## Running

```bash
npm start
```

The dev server opens the app at `http://localhost:48187` (or next available port). Files are served from the project root — no build step required.

## File structure

```
gradient-lab/
├── index.html              # App shell — importmap + component tree
├── app.js                  # Entry point — imports all components
├── app.css                 # Application stylesheet
├── reactive-framework.js   # Generic reactive primitives (no dependencies)
├── utils.js                # Pure utility functions (color math, CSS generation)
├── server.js               # Zero-dependency static file server
└── components/
    ├── gradient-element.js       # GradientElement base class
    ├── gradient-lab-app.js       # Root component — owns all application state
    ├── app-shell.js              # Layout wrapper
    ├── app-hero.js               # Header section
    ├── gradient-workbench.js     # Two-column layout for sampler + editor
    ├── lux-card.js               # Styled card with title/icon/subtitle slots
    ├── sampler-toolbar.js        # File upload, sample count, angle controls
    ├── image-sampling-stage.js   # Canvas + SVG overlay, drag-to-sample
    ├── sampled-gradient-list.js  # List of sampled gradient lines
    ├── gradient-editor.js        # Stop bar, color pickers, CSS preview
    ├── library-controls.js       # Prefix / domain inputs, copy-all button
    ├── gradient-library.js       # Grid of saved gradients
    ├── library-code.js           # Collapsible full CSS output
    └── toast-zone.js             # Fixed toast notifications
```

## Module graph

```
reactive-framework.js   (no imports)
utils.js                (no imports)
  └── components/gradient-element.js  ← reactive-framework
        └── components/*.js           ← gradient-element + utils
              └── app.js              ← all components
```

The importmap in `index.html` resolves bare specifiers:

| Specifier          | File                              |
|--------------------|-----------------------------------|
| `reactive-framework` | `./reactive-framework.js`       |
| `utils`            | `./utils.js`                      |
| `gradient-element` | `./components/gradient-element.js`|

## Reactive framework overview

### `Scope`
Tracks disposables (functions, objects with `.dispose()`, `Symbol.dispose`). Disposes them in reverse order on `.dispose()`. Supports `timeout`, `interval`, `frame`, and child scopes.

### `Signal<T>`
A reactive value cell. Notifies subscribers only when the value changes (`Object.is` equality by default). Supports `.subscribe(fn)`, `.map(fn)`, `.once(fn)`, `.mutate(fn)`.

### `Concern extends Scope`
Combines a `Signal` registry with binding helpers. Key methods:
- `signal(name, value?)` — get or create a named signal
- `effect(sources, fn)` — run `fn` whenever any source changes
- `computed(name, sources, fn)` — derived signal
- `on(target, event, handler)` — event listener tracked for disposal
- `bindText / bindHTML / bindValue / bindChecked / bindStyle / bindClass / bindAttribute` — one-way or two-way DOM bindings
- `render(source, host, fn)` — render signal value into a DOM host

### `ReactiveHTMLElement extends HTMLElement`
Base class for all web components. Mounts once on first `connectedCallback`, disposes on `disconnectedCallback`. Exposes `signal`, `subscribe`, `effect`, `computed`, `on`, `delegate`, `emit`, `$`, `$$`, `html`, `appendTemplate`.

### `GradientElement extends ReactiveHTMLElement`
Thin base for app-specific components. Adds `.app`, `.state`, `.commit(mutator)`, and `.watchState(fn)`.

## Application state

All state lives in a single `Signal<AppState>` on `<gradient-lab-app>`. Components read it via `this.state` and write via `this.commit(draft => { ... })`, which deep-copies lines and library before mutating.

```js
{
  image: HTMLImageElement | null,
  imageName: string,
  sampleCount: number,       // 2–16
  direction: string,         // e.g. "90deg"
  domain: string,            // for permalink generation
  prefix: string,            // CSS class prefix, e.g. "gr-"
  selectedLineId: string | null,
  selectedEndpoint: "start" | "end" | null,
  selectedStopId: string | null,
  lines: GradientLine[],
  library: LibraryItem[],
}
```

## No build step

Everything runs as native ES modules. No bundler, no transpiler, no npm dependencies at runtime. Bootstrap and Bootstrap Icons are loaded from CDN.
