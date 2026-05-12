import { GradientElement } from "gradient-element";
import { clamp, uid, round, rgbToHex, sortStops, freshStops } from "utils";

class ImageSamplingStage extends GradientElement {
  constructor() {
    super();
    this.drag = null;
    this.previewLine = null;
    this.size = { w: 1, h: 1 };
  }

  mount() {
    this.innerHTML = `
      <div class="stage-frame">
        <div class="drop-hint">
          <div>
            <div class="display-icon mb-3"><i class="bi bi-cloud-arrow-up"></i></div>
            <h2 class="h5 mb-2">Drop an image here</h2>
            <p class="text-lux-muted mb-3">Try a blade of grass, a sunset, brushed metal, a car finish, or any photograph with a natural color transition.</p>
            <button class="btn btn-soft rounded-pill px-3 choose-image" type="button">Choose image</button>
          </div>
        </div>
        <div class="canvas-wrap">
          <canvas class="image-canvas"></canvas>
          <svg class="overlay-svg" xmlns="http://www.w3.org/2000/svg" aria-label="Gradient sampling overlay"></svg>
        </div>
      </div>
    `;

    this.refs = {
      frame: this.querySelector(".stage-frame"),
      hint: this.querySelector(".drop-hint"),
      choose: this.querySelector(".choose-image"),
      wrap: this.querySelector(".canvas-wrap"),
      canvas: this.querySelector(".image-canvas"),
      overlay: this.querySelector(".overlay-svg"),
    };

    this.concern.on(this.refs.choose, "click", () => this.app.openFileDialog());
    this.concern.on(this.refs.frame, "dragover", event => {
      event.preventDefault();
      this.refs.frame.classList.add("border-warning");
    });
    this.concern.on(this.refs.frame, "dragleave", () => this.refs.frame.classList.remove("border-warning"));
    this.concern.on(this.refs.frame, "drop", event => {
      event.preventDefault();
      this.refs.frame.classList.remove("border-warning");
      const [file] = event.dataTransfer?.files ?? [];
      if (file && file.type.startsWith("image/")) this.app.loadFile(file);
    });

    this.concern.on(this.refs.overlay, "pointerdown", event => this.onPointerDown(event));
    this.concern.on(this.refs.overlay, "pointermove", event => this.onPointerMove(event));
    this.concern.on(this.refs.overlay, "pointerup", event => this.onPointerUp(event));
    this.concern.on(this.refs.overlay, "pointercancel", event => this.onPointerUp(event));
    this.concern.on(window, "resize", () => this.render(this.state));
    this.watchState(state => this.render(state));
  }

  render(state) {
    this.refs.hint.classList.toggle("hidden", Boolean(state.image));
    this.drawImageToCanvas(state);
    this.renderOverlay(state);
  }

  drawImageToCanvas(state) {
    const { image } = state;
    const { frame, canvas, wrap, overlay } = this.refs;
    if (!image) {
      canvas.width = 1;
      canvas.height = 1;
      canvas.style.width = "1px";
      canvas.style.height = "1px";
      overlay.style.width = "1px";
      overlay.style.height = "1px";
      wrap.style.width = "1px";
      wrap.style.height = "1px";
      overlay.setAttribute("viewBox", "0 0 1 1");
      this.size = { w: 1, h: 1 };
      return;
    }

    const frameWidth = Math.max(280, frame.clientWidth - 28);
    const maxHeight = Math.min(620, Math.max(360, Math.round(window.innerHeight * .62)));
    const aspect = image.naturalWidth / image.naturalHeight;
    let width = Math.min(frameWidth, image.naturalWidth || frameWidth);
    let height = width / aspect;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspect;
    }

    width = Math.max(240, Math.round(width));
    height = Math.max(180, Math.round(height));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      overlay.style.width = `${width}px`;
      overlay.style.height = `${height}px`;
      wrap.style.width = `${width}px`;
      wrap.style.height = `${height}px`;
      overlay.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    this.size = { w: width, h: height };
  }

  renderOverlay(state) {
    const defs = [];
    const layers = [];
    for (const line of state.lines) {
      const start = this.toView(line.start);
      const end = this.toView(line.end);
      const selected = line.id === state.selectedLineId;
      const gradientId = `stroke-${line.id}`;
      defs.push(`
        <linearGradient id="${gradientId}" gradientUnits="userSpaceOnUse" x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}">
          ${sortStops(line.stops.map(stop => ({ ...stop }))).map(stop => `<stop offset="${stop.pos}%" stop-color="${stop.color}"></stop>`).join("")}
        </linearGradient>
      `);
      layers.push(`
        <g>
          <line data-role="line" data-line-id="${line.id}" x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="transparent" stroke-width="28" stroke-linecap="round"></line>
          <line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="rgba(0,0,0,.58)" stroke-width="10" stroke-linecap="round" pointer-events="none"></line>
          <line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="url(#${gradientId})" stroke-width="6" stroke-linecap="round" pointer-events="none"></line>
          ${line.stops.map((stop, index) => {
            const point = this.stopToView(line, stop.pos);
            if (index === 0 || index === line.stops.length - 1) return "";
            const stopSelected = selected && state.selectedStopId === stop.id;
            return `<circle data-role="sample" data-line-id="${line.id}" data-stop-id="${stop.id}" cx="${point.x}" cy="${point.y}" r="${stopSelected ? 7 : 5}" fill="${stop.color}" stroke="${stopSelected ? "#ffc774" : "rgba(255,255,255,.88)"}" stroke-width="${stopSelected ? 3 : 1.5}"></circle>`;
          }).join("")}
          ${this.endpointCircle(line, "start", start, selected && state.selectedEndpoint === "start")}
          ${this.endpointCircle(line, "end", end, selected && state.selectedEndpoint === "end")}
        </g>
      `);
    }

    if (this.previewLine) {
      const start = this.toView(this.previewLine.start);
      const end = this.toView(this.previewLine.end);
      layers.push(`<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="#ffc774" stroke-width="4" stroke-dasharray="8 8" stroke-linecap="round"></line>`);
    }

    this.refs.overlay.innerHTML = `
      <defs>${defs.join("")}</defs>
      <rect width="${this.size.w}" height="${this.size.h}" fill="transparent"></rect>
      ${layers.join("")}
    `;
  }

  endpointCircle(line, endpoint, point, selected) {
    const color = endpoint === "start" ? line.stops[0]?.color : line.stops.at(-1)?.color;
    return `
      <circle data-role="endpoint" data-line-id="${line.id}" data-endpoint="${endpoint}" cx="${point.x}" cy="${point.y}" r="${selected ? 13 : 10}" fill="${selected ? "#ffc774" : color}" stroke="${selected ? "#ffffff" : "rgba(255,255,255,.9)"}" stroke-width="3"></circle>
      <circle cx="${point.x}" cy="${point.y}" r="3" fill="rgba(0,0,0,.72)" pointer-events="none"></circle>
    `;
  }

  onPointerDown(event) {
    if (!this.state.image) {
      this.app.openFileDialog();
      return;
    }

    const target = event.target;
    const role = target.dataset?.role;
    const point = this.eventToNorm(event);

    if (role === "endpoint") {
      this.drag = { type: "endpoint", lineId: target.dataset.lineId, endpoint: target.dataset.endpoint, pointerId: event.pointerId };
      this.refs.overlay.setPointerCapture(event.pointerId);
      this.app.selectLine(target.dataset.lineId, target.dataset.endpoint, null);
      return;
    }

    if (role === "sample") {
      this.drag = { type: "sample", lineId: target.dataset.lineId, stopId: target.dataset.stopId, pointerId: event.pointerId };
      this.refs.overlay.setPointerCapture(event.pointerId);
      this.app.selectLine(target.dataset.lineId, null, target.dataset.stopId);
      return;
    }

    if (role === "line") {
      this.app.selectLine(target.dataset.lineId, null, null);
      return;
    }

    this.drag = { type: "draw", start: point, current: point, pointerId: event.pointerId };
    this.previewLine = { start: point, end: point };
    this.refs.overlay.setPointerCapture(event.pointerId);
    this.renderOverlay(this.state);
  }

  onPointerMove(event) {
    if (!this.drag) return;
    const point = this.eventToNorm(event);

    if (this.drag.type === "draw") {
      this.drag.current = point;
      this.previewLine = { start: this.drag.start, end: point };
      this.renderOverlay(this.state);
      return;
    }

    if (this.drag.type === "endpoint") {
      this.commit(draft => {
        const line = draft.lines.find(item => item.id === this.drag.lineId);
        if (!line) return;
        line[this.drag.endpoint] = point;
        this.resampleLine(line);
      });
      return;
    }

    if (this.drag.type === "sample") {
      this.commit(draft => {
        const line = draft.lines.find(item => item.id === this.drag.lineId);
        const stop = line?.stops.find(item => item.id === this.drag.stopId);
        if (!line || !stop) return;
        stop.pos = this.projectPointToLinePercent(point, line);
        sortStops(line.stops);
        draft.selectedStopId = stop.id;
        this.resampleLine(line);
      });
    }
  }

  onPointerUp(event) {
    if (!this.drag) return;
    if (this.drag.type === "draw") {
      const start = this.drag.start;
      const end = this.drag.current ?? this.eventToNorm(event);
      const dx = (end.x - start.x) * this.size.w;
      const dy = (end.y - start.y) * this.size.h;
      const distance = Math.hypot(dx, dy);
      if (distance > 12) {
        this.commit(draft => {
          const line = {
            id: uid("line"),
            name: `Gradient ${draft.lines.length + 1}`,
            direction: draft.direction,
            start,
            end,
            stops: freshStops(draft.sampleCount),
          };
          this.resampleLine(line);
          draft.lines.push(line);
          draft.selectedLineId = line.id;
          draft.selectedEndpoint = "end";
          draft.selectedStopId = line.stops.at(-1)?.id ?? null;
        });
      }
    }
    this.previewLine = null;
    this.drag = null;
    try { this.refs.overlay.releasePointerCapture(event.pointerId); } catch {}
    this.renderOverlay(this.state);
  }

  eventToNorm(event) {
    const rect = this.refs.overlay.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
    };
  }

  toView(point) {
    return { x: point.x * this.size.w, y: point.y * this.size.h };
  }

  stopToView(line, percent) {
    const t = percent / 100;
    return {
      x: (line.start.x + (line.end.x - line.start.x) * t) * this.size.w,
      y: (line.start.y + (line.end.y - line.start.y) * t) * this.size.h,
    };
  }

  projectPointToLinePercent(point, line) {
    const p = this.toView(point);
    const a = this.toView(line.start);
    const b = this.toView(line.end);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy || 1;
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
    return round(clamp(t, 0, 1) * 100, 1);
  }

  resampleLine(line) {
    for (const stop of line.stops) {
      const point = this.stopToView(line, stop.pos);
      stop.color = this.sampleCanvas(point.x, point.y);
    }
  }

  sampleCanvas(x, y) {
    const { canvas } = this.refs;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const px = Math.round(clamp(x, 0, canvas.width - 1));
    const py = Math.round(clamp(y, 0, canvas.height - 1));
    const [r, g, b] = ctx.getImageData(px, py, 1, 1).data;
    return rgbToHex({ r, g, b });
  }
}

customElements.define("image-sampling-stage", ImageSamplingStage);
export { ImageSamplingStage };
