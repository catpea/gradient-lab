import { ReactiveHTMLElement } from "reactive-framework";
import { uid, copyLine, copyLibraryItem, freshStops } from "utils";

class GradientLabApp extends ReactiveHTMLElement {
  constructor() {
    super();
    this.state = this.signal("state", {
      image: null,
      imageName: "",
      sampleCount: 5,
      direction: "90deg",
      domain: window.location.host || "gradientlab.local",
      prefix: "gr-",
      selectedLineId: null,
      selectedEndpoint: null,
      selectedStopId: null,
      lines: [],
      library: [],
    });
  }

  mount() {
    window.GradientLab = this;
  }

  commit(mutator) {
    const current = this.state.value;
    const draft = {
      ...current,
      lines: current.lines.map(copyLine),
      library: current.library.map(copyLibraryItem),
    };
    mutator(draft);
    this.state.value = draft;
  }

  selectedLine(state = this.state.value) {
    return state.lines.find(line => line.id === state.selectedLineId) ?? null;
  }

  stage() { return this.querySelector("image-sampling-stage"); }
  toolbar() { return this.querySelector("sampler-toolbar"); }
  toastZone() { return this.querySelector("toast-zone"); }

  openFileDialog() { this.toolbar()?.openFileDialog(); }
  resampleLine(line) { this.stage()?.resampleLine(line); }
  sampleCanvas(x, y) { return this.stage()?.sampleCanvas(x, y) ?? "#000000"; }

  loadFile(file) {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      this.commit(draft => {
        draft.image = image;
        draft.imageName = file.name;
        draft.lines = [];
        draft.selectedLineId = null;
        draft.selectedEndpoint = null;
        draft.selectedStopId = null;
      });
      URL.revokeObjectURL(url);
      this.toast(`Loaded ${file.name}`);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      this.toast("Could not load that image.");
    };
    image.src = url;
  }

  selectLine(lineId, endpoint = null, stopId = null) {
    this.commit(draft => {
      const line = draft.lines.find(item => item.id === lineId);
      if (!line) return;
      draft.selectedLineId = line.id;
      draft.selectedEndpoint = endpoint;
      draft.selectedStopId = stopId ?? line.stops[0]?.id ?? null;
      draft.direction = line.direction;
    });
  }

  deleteLine(lineId) {
    this.commit(draft => {
      const index = draft.lines.findIndex(line => line.id === lineId);
      if (index < 0) return;
      draft.lines.splice(index, 1);
      const next = draft.lines[Math.min(index, draft.lines.length - 1)] ?? null;
      draft.selectedLineId = next?.id ?? null;
      draft.selectedEndpoint = null;
      draft.selectedStopId = next?.stops[0]?.id ?? null;
    });
  }

  addLineToLibrary(lineId) {
    this.commit(draft => {
      const line = draft.lines.find(item => item.id === lineId);
      if (!line) return;
      draft.library.push({
        id: uid("lib"),
        direction: line.direction,
        stops: line.stops.map(stop => ({ ...stop, id: uid("libstop") })),
      });
    });
    this.toast("Added gradient to library.");
  }

  async copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      this.toast(message);
    } catch {
      this.toast("Clipboard access was blocked by the browser.");
    }
  }

  toast(message) { this.toastZone()?.show(message); }
}

customElements.define("gradient-lab-app", GradientLabApp);
export { GradientLabApp };
