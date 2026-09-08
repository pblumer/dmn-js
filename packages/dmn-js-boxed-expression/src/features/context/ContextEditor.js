export class ContextEditor {
  static $inject = [ 'modeling' ];

  constructor(modeling) {
    this._modeling = modeling;
  }

  updateVariable(entry, properties) {
    this._modeling.updateProperties(entry, {
      variable: properties
    });
  }
}
