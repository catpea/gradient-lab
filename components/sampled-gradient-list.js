import { GradientElement } from "gradient-element";
import { escapeHtml, gradientCss, cssBlock } from "utils";

class SampledGradientList extends GradientElement {
  mount() {
    this.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mt-4 mb-2">
        <h3 class="h6 mb-0"><i class="bi bi-layers me-1 text-lux-cyan"></i> Sampled gradients</h3>
        <span class="small text-lux-muted">Each drawn line creates one editable gradient.</span>
      </div>
      <div class="gradient-stack"></div>
    `;
    this.refs = { stack: this.querySelector(".gradient-stack") };
    this.concern.on(this, "click", event => this.onClick(event));
    this.watchState(state => this.render(state));
  }

  render(state) {
    if (!state.lines.length) {
      this.refs.stack.innerHTML = `<div class="empty-state"><i class="bi bi-pencil me-1"></i> Upload an image, then drag across it to create the first sampled gradient line.</div>`;
      return;
    }
    this.refs.stack.innerHTML = state.lines.map((line, index) => {
      const css = gradientCss(line.stops, line.direction);
      const selected = line.id === state.selectedLineId;
      return `
        <article class="gradient-chip ${selected ? "selected" : ""}" data-line-id="${line.id}">
          <div class="p-3">
            <div class="preview mb-2" style="background: ${css}"></div>
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <button class="btn btn-link p-0 text-decoration-none text-start ${selected ? "text-lux-gold" : "text-light"}" type="button" data-action="select-line" data-line-id="${line.id}">
                <strong>${escapeHtml(line.name ?? `Gradient ${index + 1}`)}</strong>
                <span class="small text-lux-muted ms-2">${line.stops.length} stops · ${line.direction}</span>
              </button>
              <div class="d-flex gap-2">
                <button class="btn btn-soft btn-sm rounded-pill" type="button" data-action="copy-line" data-line-id="${line.id}"><i class="bi bi-clipboard"></i></button>
                <button class="btn btn-soft btn-sm rounded-pill" type="button" data-action="add-line" data-line-id="${line.id}"><i class="bi bi-plus-lg"></i></button>
                <button class="btn btn-soft btn-sm rounded-pill" type="button" data-action="delete-line" data-line-id="${line.id}"><i class="bi bi-trash3"></i></button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  onClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const lineId = button.dataset.lineId;
    if (action === "select-line") this.app.selectLine(lineId, null, null);
    if (action === "copy-line") {
      const line = this.state.lines.find(item => item.id === lineId);
      if (line) this.app.copyText(cssBlock(line, this.state.domain), "Copied gradient CSS.");
    }
    if (action === "add-line") this.app.addLineToLibrary(lineId);
    if (action === "delete-line") this.app.deleteLine(lineId);
  }
}

customElements.define("sampled-gradient-list", SampledGradientList);
export { SampledGradientList };
