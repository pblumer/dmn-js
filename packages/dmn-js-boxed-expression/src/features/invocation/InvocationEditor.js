export class InvocationEditor {
  static $inject = [ 'modeling' ];

  constructor(modeling) {
    this._modeling = modeling;
  }

  updateParameter(parameter, properties) {
    this._modeling.updateProperties(parameter, properties);
  }
}
