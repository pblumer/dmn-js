export class ContextEditor {
  static $inject = [ 'modeling' ];

  constructor(modeling) {
    this._modeling = modeling;
  }

  updateVariable(variable, properties) {
    this._modeling.updateProperties(variable, properties);
  }
}
