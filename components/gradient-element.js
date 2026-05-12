import { ReactiveHTMLElement } from "reactive-framework";

export class GradientElement extends ReactiveHTMLElement {
  get app() { return this.closest("gradient-lab-app"); }
  get state() { return this.app.state.value; }
  commit(mutator) { this.app.commit(mutator); }
  watchState(fn) { return this.subscribe(this.app.state, fn); }
}
