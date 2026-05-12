import { GradientElement } from "gradient-element";
import { escapeHtml, gradientCss } from "utils";

class GradientLibrary extends GradientElement {
  mount() {
    this.innerHTML = `<div class="library-grid mb-3"></div>`;
    this.refs = { grid: this.querySelector(".library-grid") };
    this.concern.on(this, "click", event => this.onClick(event));
    this.watchState(state => this.render(state));
  }

  render(state) {
    if (!state.library.length) {
      this.refs.grid.innerHTML = `<div class="empty-state"><i class="bi bi-collection me-1"></i> The library is empty. Add a selected gradient to create copyable ${escapeHtml(state.prefix)}1, ${escapeHtml(state.prefix)}2, ${escapeHtml(state.prefix)}3 classes.</div>`;
      return;
    }
    this.refs.grid.innerHTML = state.library.map((item, index) => {
      const className = `${state.prefix}${index + 1}`;
      const css = gradientCss(item.stops, item.direction);
      return `
        <article class="library-item">
          <div class="library-well mb-2" style="background: ${css}"></div>
          <div class="d-flex align-items-center justify-content-between gap-2">
            <div>
              <code class="text-lux-gold">.${escapeHtml(className)}</code>
              <div class="small text-lux-muted">${item.stops.length} stops · ${item.direction}</div>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-soft btn-sm rounded-pill" type="button" data-action="copy-library-item" data-library-index="${index}"><i class="bi bi-clipboard"></i></button>
              <button class="btn btn-soft btn-sm rounded-pill" type="button" data-action="remove-library-item" data-library-index="${index}"><i class="bi bi-trash3"></i></button>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  onClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const index = Number(button.dataset.libraryIndex);
    if (button.dataset.action === "remove-library-item") {
      this.commit(draft => {
        if (index < 0 || index >= draft.library.length) return;
        draft.library.splice(index, 1);
      });
    }
    if (button.dataset.action === "copy-library-item") {
      const item = this.state.library[index];
      if (!item) return;
      const className = `.${this.state.prefix}${index + 1}`.replace("..", ".");
      this.app.copyText(`${className} {
  background: ${gradientCss(item.stops, item.direction)};
}`, `Copied ${className}.`);
    }
  }
}

customElements.define("gradient-library", GradientLibrary);
export { GradientLibrary };
