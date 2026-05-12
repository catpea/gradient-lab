# AGENTS.md — Guide for AI agents working on Gradient Lab

## Quick orientation

This is a zero-build, zero-dependency web app. Everything is native ES modules served by a small Node.js static file server. No bundler, no transpiler, no npm packages at runtime.

## Module layout

| File | Purpose |
|------|---------|
| `reactive-framework.js` | Generic reactive primitives — `Scope`, `Signal`, `Concern`, `ReactiveHTMLElement`. **No app-specific code here.** |
| `utils.js` | Pure functions — color math, CSS string generation, data helpers. No DOM, no side effects. |
| `components/gradient-element.js` | App-specific base class that adds `.app`, `.state`, `.commit()`, `.watchState()` on top of `ReactiveHTMLElement`. |
| `components/gradient-lab-app.js` | Root component. Owns the single `Signal<AppState>`. All mutations go through `commit(draft => ...)`. |
| `components/*.js` | One file per custom element. Each file registers its element at the bottom with `customElements.define(...)`. |
| `app.js` | Entry point — imports every component file to trigger registration. No other logic here. |
| `app.css` | All application CSS. No CSS-in-JS. |
| `index.html` | Static HTML tree of web components + importmap + CDN links for Bootstrap. |

## Importmap (bare specifier aliases)

Defined in `index.html`:

```json
{
  "imports": {
    "reactive-framework": "./reactive-framework.js",
    "utils": "./utils.js",
    "gradient-element": "./components/gradient-element.js"
  }
}
```

Use bare specifiers in component imports:
```js
import { ReactiveHTMLElement } from "reactive-framework";  // correct
import { escapeHtml } from "utils";                         // correct
import { GradientElement } from "gradient-element";         // correct
```

Do **not** use relative paths for these three — it defeats the importmap's purpose.

## How to add a new web component

1. Create `components/my-element.js`:

```js
import { GradientElement } from "gradient-element";
import { escapeHtml } from "utils";  // import only what you need

class MyElement extends GradientElement {
  mount() {
    this.innerHTML = `<div>Hello</div>`;
    this.watchState(state => this.render(state));
  }

  render(state) {
    // update DOM from state — keep it declarative
  }
}

customElements.define("my-element", MyElement);
export { MyElement };
```

2. Add the import to `app.js`:
```js
import "./components/my-element.js";
```

3. Add to `index.html` body where it belongs in the component tree.

4. Add `my-element { display: block; margin-bottom: 1rem; }` to `app.css` if it needs block layout.

## How to add a new utility function

Add it to `utils.js` as a named export. No side effects, no DOM access, no imports from framework files.

## How to modify application state shape

1. Add the new field with its default value in `GradientLabApp` constructor (`components/gradient-lab-app.js`).
2. If the field needs deep-copying on commit, update the `commit()` method's draft construction.
3. Update `copyLine` or `copyLibraryItem` in `utils.js` if the new field lives inside a line or library item.

## State mutation rules

- **Never mutate `this.state` directly.** Always use `this.commit(draft => { draft.field = value; })`.
- `commit()` deep-copies `lines` and `library` before passing the draft, so mutations are safe.
- `commit()` sets the signal, which triggers all `watchState` subscribers synchronously.

## Reactive framework rules

### Scope / lifecycle
- `Scope.collect(fn)` registers a cleanup function.
- `ReactiveHTMLElement` creates a `Concern` (a `Scope` subclass) in the constructor.
- `mount()` is called once when the element first connects to the DOM.
- `disconnectedCallback()` disposes the concern — all subscriptions, listeners, timers.
- Always register listeners via `this.concern.on(...)` or `this.on(...)`, **not** `addEventListener` directly, so they are disposed automatically.

### Signal
- `signal.value = x` triggers subscribers only if `x !== signal.value` (by `Object.is`).
- Use `signal.mutate(fn)` when you need to notify subscribers after mutating the same object reference.
- Use `signal.set(x, { force: true })` to force notification even when value is equal.

### Concern bindings
- `bindValue(source, input)` — two-way binding for text inputs.
- `bindChecked(source, checkbox)` — two-way binding for checkboxes.
- `bindText(source, node)` — one-way text content binding.
- `bindStyle(source, el, property, fn?)` — one-way style property binding.
- `render(source, host, fn)` — re-renders host innerHTML/children when signal changes.

## Rendering approach

Components use **full innerHTML re-render** on state change (no virtual DOM diffing). This is intentional and simple. If a component owns interactive elements that must survive re-renders (e.g., a focused input), use targeted DOM updates instead of wholesale innerHTML replacement.

## CSS conventions

- All custom properties are defined under `:root` in `app.css` with `--lux-*` prefix.
- Use Bootstrap utility classes for layout and spacing.
- App-specific structural classes live in `app.css`. Do not add `<style>` blocks to component JS files.
- The `--lux-gold` (`#ffc774`) color is used for selection, active states, and primary actions.
- The `--lux-cyan` (`#69d8ff`) color is used for informational labels.

## Server

`server.js` serves all files from the project root. It handles MIME types and blocks path traversal. No changes needed unless you add a new file extension.

## Do not

- Add a build step, bundler, or transpiler.
- Add npm runtime dependencies.
- Use Shadow DOM (all components use light DOM for Bootstrap compatibility).
- Put application logic in `reactive-framework.js` — it must stay generic.
- Put DOM code in `utils.js` — it must stay pure.
- Call `addEventListener` directly in component code — always go through `this.concern.on` or `this.on`.
