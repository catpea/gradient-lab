import { GradientElement } from "gradient-element";
import { normalizeAngle, directionToAngle, freshStops } from "utils";

class SamplerToolbar extends GradientElement {
  mount() {
    this.innerHTML = `
      <div class="row g-3 align-items-end mb-3">
        <div class="col-md-auto">
          <label class="btn btn-lux rounded-pill px-3 mb-0">
            <i class="bi bi-image me-1"></i>
            Upload image
            <input class="visually-hidden file-input" type="file" accept="image/*">
          </label>
        </div>
        <div class="col-md">
          <label class="form-label d-flex justify-content-between mb-1">
            <span>Sample resolution</span>
            <strong class="sample-count-label text-lux-gold">5 stops</strong>
          </label>
          <input class="form-range sample-count" type="range" min="2" max="16" step="1" value="5">
        </div>
        <div class="col-md-4 col-lg-3">
          <label class="form-label mb-1">Gradient angle</label>
          <div class="input-group input-group-sm mb-2">
            <input class="form-control angle-input" type="number" min="0" max="359" step="1" value="90">
            <span class="input-group-text">deg</span>
          </div>
          <input class="form-range angle-range" type="range" min="0" max="359" step="1" value="90">
        </div>
        <div class="col-md-auto">
          <button class="btn btn-soft rounded-pill clear-lines" type="button">
            <i class="bi bi-trash3 me-1"></i> Clear lines
          </button>
        </div>
      </div>
    `;

    this.refs = {
      file: this.querySelector(".file-input"),
      sample: this.querySelector(".sample-count"),
      sampleLabel: this.querySelector(".sample-count-label"),
      angleInput: this.querySelector(".angle-input"),
      angleRange: this.querySelector(".angle-range"),
      clear: this.querySelector(".clear-lines"),
    };

    this.concern.on(this.refs.file, "change", event => {
      const [file] = event.target.files ?? [];
      if (file) this.app.loadFile(file);
    });

    this.concern.on(this.refs.sample, "input", event => {
      const value = Number(event.target.value);
      this.commit(draft => {
        draft.sampleCount = value;
        const selected = this.app.selectedLine(draft);
        if (!selected) return;
        selected.stops = freshStops(value);
        draft.selectedStopId = selected.stops[0]?.id ?? null;
        this.app.resampleLine(selected);
      });
    });

    const setGradientAngle = event => {
      const angle = normalizeAngle(event.target.value);
      this.commit(draft => {
        draft.direction = `${angle}deg`;
        const selected = this.app.selectedLine(draft);
        if (selected) selected.direction = draft.direction;
      });
    };

    this.concern.on(this.refs.angleInput, "input", setGradientAngle);
    this.concern.on(this.refs.angleRange, "input", setGradientAngle);

    this.concern.on(this.refs.clear, "click", () => {
      this.commit(draft => {
        draft.lines = [];
        draft.selectedLineId = null;
        draft.selectedEndpoint = null;
        draft.selectedStopId = null;
      });
    });

    this.watchState(state => this.render(state));
  }

  openFileDialog() { this.refs.file.click(); }

  render(state) {
    const angle = directionToAngle(state.direction);
    this.refs.sample.value = state.sampleCount;
    this.refs.sampleLabel.textContent = `${state.sampleCount} stop${state.sampleCount === 1 ? "" : "s"}`;
    this.refs.angleInput.value = angle;
    this.refs.angleRange.value = angle;
  }
}

customElements.define("sampler-toolbar", SamplerToolbar);
export { SamplerToolbar };
