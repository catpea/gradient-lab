const hasValue = value => value !== null && value !== undefined;

function disposeOne(item) {
  if (!item) return;
  if (typeof item === "function") return item();
  if (typeof item.dispose === "function") return item.dispose();
  if (typeof item[Symbol.dispose] === "function") return item[Symbol.dispose]();
}

class Scope {
  #items = [];
  #disposed = false;

  get disposed() { return this.#disposed; }

  collect(...items) {
    const flat = items.flat(Infinity).filter(Boolean);
    if (this.#disposed) {
      for (let i = flat.length - 1; i >= 0; i--) disposeOne(flat[i]);
      return this;
    }
    this.#items.push(...flat);
    return this;
  }

  defer(fn) {
    return this.collect(fn);
  }

  child() {
    const scope = new Scope();
    this.collect(scope);
    return scope;
  }

  timeout(fn, ms) {
    const id = setTimeout(fn, ms);
    this.collect(() => clearTimeout(id));
    return id;
  }

  interval(fn, ms) {
    const id = setInterval(fn, ms);
    this.collect(() => clearInterval(id));
    return id;
  }

  frame(fn) {
    const id = requestAnimationFrame(fn);
    this.collect(() => cancelAnimationFrame(id));
    return id;
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    const items = this.#items.splice(0);
    for (let i = items.length - 1; i >= 0; i--) disposeOne(items[i]);
  }
}

class Signal {
  #value;
  #subscribers = new Set();
  #equals;

  constructor(value, options = {}) {
    this.#equals = options.equals ?? Object.is;
    if (arguments.length > 0) this.#value = value;
  }

  get value() { return this.#value; }
  set value(next) { this.set(next); }
  get hasValue() { return hasValue(this.#value); }
  get size() { return this.#subscribers.size; }

  set(next, options = {}) {
    const equals = options.force ? () => false : this.#equals;
    if (equals(next, this.#value)) return false;
    const previous = this.#value;
    this.#value = next;
    this.notify(previous);
    return true;
  }

  update(fn, options = {}) {
    return this.set(fn(this.#value), options);
  }

  mutate(fn) {
    fn(this.#value);
    this.notify(this.#value);
    return true;
  }

  subscribe(fn, options = {}) {
    this.#subscribers.add(fn);
    if (options.immediate !== false && this.hasValue) fn(this.#value, undefined);
    return () => this.#subscribers.delete(fn);
  }

  once(fn) {
    const unsubscribe = this.subscribe((value, previous) => {
      unsubscribe();
      fn(value, previous);
    });
    return unsubscribe;
  }

  notify(previous = this.#value) {
    if (!this.hasValue) return;
    for (const fn of [...this.#subscribers]) fn(this.#value, previous);
  }

  map(fn) {
    const mapped = new Signal(this.hasValue ? fn(this.#value) : undefined);
    this.subscribe(value => mapped.value = fn(value));
    return mapped;
  }
}

class Concern extends Scope {
  #signals = new Map();

  signal(name, value, options) {
    if (value instanceof Signal) {
      this.#signals.set(name, value);
      return value;
    }

    let signal = this.#signals.get(name);
    if (!signal) {
      signal = arguments.length > 1 ? new Signal(value, options) : new Signal(undefined, options);
      this.#signals.set(name, signal);
      return signal;
    }

    if (arguments.length > 1) signal.value = value;
    return signal;
  }

  hasSignal(name) {
    return this.#signals.has(name);
  }

  resolve(source) {
    return source instanceof Signal ? source : this.signal(source);
  }

  value(source) {
    return this.resolve(source).value;
  }

  set(source, value) {
    this.resolve(source).value = value;
    return this;
  }

  update(source, fn) {
    this.resolve(source).update(fn);
    return this;
  }

  subscribe(source, fn, options) {
    const unsubscribe = this.resolve(source).subscribe(fn, options);
    this.collect(unsubscribe);
    return unsubscribe;
  }

  effect(sources, fn, options = {}) {
    const input = (Array.isArray(sources) ? sources : [sources]).map(source => this.resolve(source));
    let cleanup = null;
    let wiring = true;

    const run = () => {
      if (wiring) return;
      const values = input.map(signal => signal.value);
      if (!options.allowPartial && !values.every(hasValue)) return;
      disposeOne(cleanup);
      cleanup = fn(...values);
    };

    for (const signal of input) this.collect(signal.subscribe(run, { immediate: false }));
    this.collect(() => disposeOne(cleanup));
    wiring = false;
    run();
    return this;
  }

  computed(name, sources, fn, options = {}) {
    const signal = this.signal(name, undefined, options);
    this.effect(sources, (...values) => { signal.value = fn(...values); }, options);
    return signal;
  }

  attribute(name, value) {
    if (hasValue(value)) this.signal(name).value = value;
    return this.signal(name);
  }

  attributes(element, names = element.constructor.observedAttributes ?? []) {
    for (const name of names) this.signal(name);
    return this;
  }

  hydrateAttributes(element, names = element.constructor.observedAttributes ?? []) {
    for (const name of names) {
      if (element.hasAttribute(name)) this.attribute(name, element.getAttribute(name));
    }
    return this;
  }

  reflectAttribute(source, element, attributeName = source) {
    this.subscribe(source, value => {
      if (value === false || value === null || value === undefined) element.removeAttribute(attributeName);
      else element.setAttribute(attributeName, value === true ? "" : String(value));
    });
    return this;
  }

  on(target, eventName, handler, options) {
    target.addEventListener(eventName, handler, options);
    this.collect(() => target.removeEventListener(eventName, handler, options));
    return this;
  }

  delegate(root, eventName, selector, handler, options) {
    return this.on(root, eventName, event => {
      const match = event.target.closest?.(selector);
      if (match && root.contains(match)) handler(event, match);
    }, options);
  }

  bindText(source, node, fallback = "") {
    this.subscribe(source, value => {
      const next = hasValue(value) ? String(value) : fallback;
      if (node.textContent !== next) node.textContent = next;
    });
    return this;
  }

  bindHTML(source, node, fallback = "") {
    this.subscribe(source, value => {
      const next = hasValue(value) ? String(value) : fallback;
      if (node.innerHTML !== next) node.innerHTML = next;
    });
    return this;
  }

  bindValue(source, element, eventName = "input") {
    const signal = this.resolve(source);
    this.subscribe(signal, value => {
      const next = hasValue(value) ? String(value) : "";
      if (element.value !== next) element.value = next;
    });
    this.on(element, eventName, () => { signal.value = element.value; });
    return this;
  }

  bindChecked(source, element) {
    const signal = this.resolve(source);
    this.subscribe(signal, value => { element.checked = Boolean(value); });
    this.on(element, "change", () => { signal.value = element.checked; });
    return this;
  }

  bindClass(source, element, fn) {
    this.subscribe(source, value => {
      const next = typeof fn === "function" ? fn(value) : value;
      element.className = next || "";
    });
    return this;
  }

  bindStyle(source, element, property, fn = value => value) {
    this.subscribe(source, value => {
      const next = fn(value);
      if (next === null || next === undefined || next === false) element.style.removeProperty(property);
      else element.style.setProperty(property, String(next));
    });
    return this;
  }

  bindAttribute(source, element, attributeName, fn = value => value) {
    this.subscribe(source, value => {
      const next = fn(value);
      if (next === false || next === null || next === undefined) element.removeAttribute(attributeName);
      else element.setAttribute(attributeName, next === true ? "" : String(next));
    });
    return this;
  }

  render(source, host, fn) {
    this.subscribe(source, value => {
      const result = fn(value);
      if (typeof result === "string") host.innerHTML = result;
      else if (result instanceof Node) host.replaceChildren(result);
      else if (Array.isArray(result)) host.replaceChildren(...result);
    });
    return this;
  }
}

class ReactiveHTMLElement extends HTMLElement {
  #mounted = false;

  constructor() {
    super();
    this.concern = new Concern();
    this.concern.attributes(this);
  }

  connectedCallback() {
    if (this.#mounted) return;
    this.#mounted = true;
    this.concern.hydrateAttributes(this);
    this.mount?.();
  }

  disconnectedCallback() {
    this.unmount?.();
    this.concern.dispose();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (Object.is(oldValue, newValue)) return;
    this.concern.attribute(name, newValue);
  }

  signal(name, value, options) { return this.concern.signal(name, value, options); }
  subscribe(source, fn, options) { return this.concern.subscribe(source, fn, options); }
  effect(sources, fn, options) { return this.concern.effect(sources, fn, options); }
  computed(name, sources, fn, options) { return this.concern.computed(name, sources, fn, options); }
  setSignal(name, value) { this.concern.set(name, value); return this; }
  updateSignal(name, fn) { this.concern.update(name, fn); return this; }

  $(selector) { return this.querySelector(selector); }
  $$(selector) { return [...this.querySelectorAll(selector)]; }

  html(content) {
    this.innerHTML = content;
    return this;
  }

  appendTemplate(content) {
    const template = document.createElement("template");
    template.innerHTML = content.trim();
    this.append(template.content.cloneNode(true));
    return this;
  }

  on(target, eventName, handler, options) {
    if (typeof target === "string") return this.concern.on(this, target, eventName, handler);
    return this.concern.on(target, eventName, handler, options);
  }

  delegate(eventName, selector, handler, options) {
    return this.concern.delegate(this, eventName, selector, handler, options);
  }

  emit(type, detail = {}, options = {}) {
    return this.dispatchEvent(new CustomEvent(type, {
      detail,
      bubbles: options.bubbles ?? true,
      composed: options.composed ?? true,
      cancelable: options.cancelable ?? false,
    }));
  }
}

export { Scope, Signal, Concern, ReactiveHTMLElement };
