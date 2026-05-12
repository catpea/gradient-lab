import { GradientElement } from "gradient-element";
import { clamp, uid, round, directionToAngle, escapeHtml, sortStops, gradientCss, cssBlock } from "utils";

class GradientEditor extends GradientElement {
  constructor() {
    super();
    this.editorDrag = null;
  }

  mount() {
    this.concern.on(this, "pointerdown", event => this.onPointerDown(event));
    this.concern.on(window, "pointermove", event => this.onPointerMove(event));
    this.concern.on(window, "pointerup", () => { this.editorDrag = null; });
    this.concern.on(this, "dblclick", event => this.onDoubleClick(event));
    this.concern.on(this, "click", event => this.onClick(event));
    this.concern.on(this, "input", event => this.onInput(event));
    this.concern.on(this, "change", event => this.onInput(event));
    this.concern.on(window, "keydown", event => this.onKeyDown(event));
    this.watchState(state => this.render(state));
  }

  render(state) {
    const line = this.app.selectedLine(state);
    if (!line) {
      this.innerHTML = `
        <div class="empty-state">
          <div class="h5 mb-2"><i class="bi bi-cursor me-1"></i> No gradient selected</div>
          <p class="mb-0">Draw a line over the image or select a sampled gradient. The editor will show a large preview, a draggable stop bar, individual stop controls, and copyable CSS.</p>
        </div>
      `;
      return;
    }

    const css = gradientCss(line.stops, line.direction);
    const block = cssBlock(line, state.domain);
    this.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <div class="fw-semibold">${escapeHtml(line.name)}</div>
          <div class="small text-lux-muted">${line.stops.length} stops · ${line.direction}</div>
        </div>
        <span class="badge rounded-pill text-bg-dark border">${directionToAngle(line.direction)}°</span>
      </div>

      <div class="gradient-display mb-3" style="background: ${css}"></div>

      <div class="d-flex justify-content-between align-items-center mb-2">
        <label class="form-label mb-0">Stop bar</label>
        <span class="small text-lux-muted">Double-click to add a stop.</span>
      </div>
      <div class="gradient-track mb-3" data-role="editor-track" data-line-id="${line.id}" style="background: ${css}">
        ${line.stops.map(stop => `
          <button class="editor-stop ${stop.id === state.selectedStopId ? "selected" : ""}" type="button" aria-label="Gradient stop ${round(stop.pos, 1)}%" data-role="editor-stop" data-line-id="${line.id}" data-stop-id="${stop.id}" style="left: ${stop.pos}%; background: ${stop.color}"></button>
        `).join("")}
      </div>

      <div class="d-flex gap-2 mb-3">
        <button class="btn btn-soft btn-sm rounded-pill" type="button" data-action="delete-stop" ${line.stops.length <= 2 || !state.selectedStopId ? "disabled" : ""}>
          <i class="bi bi-x-lg me-1"></i> Delete selected stop
        </button>
        <button class="btn btn-soft btn-sm rounded-pill" type="button" data-action="resample-selected" ${!state.image ? "disabled" : ""}>
          <i class="bi bi-arrow-clockwise me-1"></i> Resample
        </button>
      </div>

      <div class="vstack gap-2 mb-3">
        ${line.stops.map((stop, index) => `
          <div class="stop-row ${stop.id === state.selectedStopId ? "selected" : ""}" data-stop-id="${stop.id}">
            <div class="row g-2 align-items-center">
              <div class="col-auto"><span class="small text-lux-muted">${index + 1}</span></div>
              <div class="col-auto"><input class="form-control form-control-color" type="color" value="${stop.color}" data-action="stop-color" data-line-id="${line.id}" data-stop-id="${stop.id}" title="Choose color"></div>
              <div class="col"><input class="form-control form-control-sm" value="${stop.color}" data-action="stop-color-text" data-line-id="${line.id}" data-stop-id="${stop.id}" spellcheck="false"></div>
              <div class="col-4"><div class="input-group input-group-sm"><input class="form-control" type="number" min="0" max="100" step="0.1" value="${round(stop.pos, 1)}" data-action="stop-pos" data-line-id="${line.id}" data-stop-id="${stop.id}"><span class="input-group-text">%</span></div></div>
            </div>
          </div>
        `).join("")}
      </div>

      <div class="d-grid gap-2 mb-3">
        <button class="btn btn-lux rounded-pill" type="button" data-action="add-selected-library"><i class="bi bi-plus-circle me-1"></i> Add to library</button>
        <button class="btn btn-soft rounded-pill" type="button" data-action="copy-selected"><i class="bi bi-clipboard me-1"></i> Copy CSS</button>
        <button class="btn btn-soft rounded-pill" type="button" data-action="delete-selected-line"><i class="bi bi-trash3 me-1"></i> Delete sampled line</button>
      </div>

      <button class="btn btn-soft btn-sm rounded-pill mb-2" type="button" data-bs-toggle="collapse" data-bs-target="#selectedCodeCollapse" aria-expanded="false" aria-controls="selectedCodeCollapse">
        <i class="bi bi-code-square me-1"></i> Show CSS
      </button>
      <div class="collapse" id="selectedCodeCollapse">
        <textarea class="form-control codebox" readonly>${escapeHtml(block)}</textarea>
      </div>
    `;
  }

  onPointerDown(event) {
    const stopButton = event.target.closest("[data-role='editor-stop']");
    if (!stopButton) return;
    event.preventDefault();
    this.editorDrag = { lineId: stopButton.dataset.lineId, stopId: stopButton.dataset.stopId };
    this.app.selectLine(stopButton.dataset.lineId, null, stopButton.dataset.stopId);
  }

  onPointerMove(event) {
    if (!this.editorDrag) return;
    const track = this.querySelector(`[data-role='editor-track'][data-line-id='${this.editorDrag.lineId}']`);
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const percent = round(clamp((event.clientX - rect.left) / rect.width, 0, 1) * 100, 1);
    this.commit(draft => {
      const line = draft.lines.find(item => item.id === this.editorDrag.lineId);
      const stop = line?.stops.find(item => item.id === this.editorDrag.stopId);
      if (!line || !stop) return;
      stop.pos = percent;
      sortStops(line.stops);
      this.app.resampleLine(line);
      draft.selectedStopId = stop.id;
    });
  }

  onDoubleClick(event) {
    const track = event.target.closest("[data-role='editor-track']");
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const percent = round(clamp((event.clientX - rect.left) / rect.width, 0, 1) * 100, 1);
    const lineId = track.dataset.lineId;
    this.commit(draft => {
      const line = draft.lines.find(item => item.id === lineId);
      if (!line) return;
      const point = this.app.stage().stopToView(line, percent);
      const stop = {
        id: uid("stop"),
        pos: percent,
        color: this.app.sampleCanvas(point.x, point.y),
      };
      line.stops.push(stop);
      sortStops(line.stops);
      draft.selectedStopId = stop.id;
    });
  }

  onClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "delete-stop") this.deleteSelectedStop();
    if (action === "resample-selected") this.resampleSelectedLine();
    if (action === "add-selected-library") {
      const line = this.app.selectedLine();
      if (line) this.app.addLineToLibrary(line.id);
    }
    if (action === "copy-selected") {
      const line = this.app.selectedLine();
      if (line) this.app.copyText(cssBlock(line, this.state.domain), "Copied selected CSS.");
    }
    if (action === "delete-selected-line") {
      const line = this.app.selectedLine();
      if (line) this.app.deleteLine(line.id);
    }
  }

  onInput(event) {
    const action = event.target.dataset?.action;
    if (!action) return;
    if (action === "stop-color" || action === "stop-color-text") {
      const value = event.target.value.trim();
      if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
      this.updateStop(event.target.dataset.lineId, event.target.dataset.stopId, stop => {
        stop.color = value.toLowerCase();
      });
    }
    if (action === "stop-pos") {
      const value = round(clamp(Number(event.target.value), 0, 100), 1);
      this.updateStop(event.target.dataset.lineId, event.target.dataset.stopId, stop => {
        stop.pos = value;
      }, { resample: true });
    }
  }

  onKeyDown(event) {
    const active = document.activeElement;
    const typing = active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName);
    if (typing) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      const line = this.app.selectedLine();
      if (line) this.app.deleteLine(line.id);
    }
  }

  updateStop(lineId, stopId, fn, options = {}) {
    this.commit(draft => {
      const line = draft.lines.find(item => item.id === lineId);
      const stop = line?.stops.find(item => item.id === stopId);
      if (!line || !stop) return;
      fn(stop, line);
      sortStops(line.stops);
      if (options.resample) this.app.resampleLine(line);
      draft.selectedLineId = line.id;
      draft.selectedStopId = stop.id;
      draft.selectedEndpoint = null;
    });
  }

  deleteSelectedStop() {
    this.commit(draft => {
      const line = this.app.selectedLine(draft);
      if (!line || line.stops.length <= 2 || !draft.selectedStopId) return;
      const index = line.stops.findIndex(stop => stop.id === draft.selectedStopId);
      if (index < 0) return;
      line.stops.splice(index, 1);
      const next = line.stops[Math.min(index, line.stops.length - 1)] ?? line.stops[0];
      draft.selectedStopId = next?.id ?? null;
    });
  }

  resampleSelectedLine() {
    this.commit(draft => {
      const line = this.app.selectedLine(draft);
      if (!line) return;
      this.app.resampleLine(line);
    });
  }
}

customElements.define("gradient-editor", GradientEditor);
export { GradientEditor };
