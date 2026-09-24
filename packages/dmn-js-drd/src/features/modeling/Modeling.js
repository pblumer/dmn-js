import inherits from 'inherits-browser';

import BaseModeling from 'diagram-js/lib/features/modeling/Modeling';

import IdClaimHandler from './cmd/IdClaimHandler.js';
import UpdateLabelHandler from '../label-editing/cmd/UpdateLabelHandler.js';
import UpdatePropertiesHandler from './cmd/UpdatePropertiesHandler.js';
import UpdateModdlePropertiesHandler from './cmd/UpdateModdlePropertiesHandler.js';
import CollapseDecisionServiceHandler from './cmd/CollapseDecisionServiceHandler.js';

import {
  clampDecisionServiceDividerY,
  clampDecisionServiceLabelBounds
} from './DecisionServiceUtil';


/**
 * DMN modeling.
 *
 * @param {Canvas} canvas
 * @param {DrdFactory} drdFactory
 * @param {DrdRules} drdRules
 * @param {Injector} injector
 */
export default function Modeling(
    canvas,
    drdFactory,
    drdRules,
    injector
) {
  this._canvas = canvas;
  this._drdFactory = drdFactory;
  this._drdRules = drdRules;

  injector.invoke(BaseModeling, this);
}

inherits(Modeling, BaseModeling);

Modeling.$inject = [
  'canvas',
  'drdFactory',
  'drdRules',
  'injector'
];

Modeling.prototype.claimId = function(id, moddleElement) {
  this._commandStack.execute('id.updateClaim', {
    id: id,
    element: moddleElement,
    claiming: true
  });
};

Modeling.prototype.connect = function(source, target, attrs, hints) {
  var drdRules = this._drdRules,
      rootElement = this._canvas.getRootElement();

  if (!attrs) {
    attrs = drdRules.canConnect(source, target) || { type: 'dmn:Association' };
  }

  return this.createConnection(source, target, attrs, rootElement, hints);
};

Modeling.prototype.getHandlers = function() {
  var handlers = BaseModeling.prototype.getHandlers.call(this);

  handlers['id.updateClaim'] = IdClaimHandler;
  handlers['element.updateLabel'] = UpdateLabelHandler;
  handlers['element.updateProperties'] = UpdatePropertiesHandler;
  handlers['element.updateModdleProperties'] = UpdateModdlePropertiesHandler;
  handlers['decisionService.collapse'] = CollapseDecisionServiceHandler;

  return handlers;
};

Modeling.prototype.unclaimId = function(id, moddleElement) {
  this._commandStack.execute('id.updateClaim', {
    id: id,
    element: moddleElement
  });
};

/**
 * Update the vertical position of a Decision Service divider.
 *
 * @param {Shape} element
 * @param {number} dividerY
 */
Modeling.prototype.updateDecisionServiceDivider = function(element, dividerY) {
  var drdFactory = this._drdFactory,
      divider = element.businessObject.di.get('decisionServiceDividerLine');

  dividerY = clampDecisionServiceDividerY(element, dividerY);

  var waypoints = drdFactory.createDiWaypoints([
    { x: element.x, y: dividerY },
    { x: element.x + element.width, y: dividerY }
  ]);

  waypoints.forEach(function(waypoint) {
    waypoint.$parent = divider;
  });

  this.updateModdleProperties(element, divider, {
    waypoint: waypoints
  });
};

/**
 * Move a Decision Service's name to where the author put it.
 *
 * Written as the DMNShape's DMNLabel bounds, which is DMN's own place for it: a
 * DMNLabel is a di:Shape, so it has Bounds, and §6.2.5 already gives that label the
 * last word over where the name is shown. So the position round-trips through the
 * document and means the same thing to a tool that never heard of this editor.
 *
 * One command either way, so one undo puts the name back.
 *
 * @param {Shape} element
 * @param {Bounds} bounds
 */
Modeling.prototype.updateDecisionServiceLabelBounds = function(element, bounds) {
  var drdFactory = this._drdFactory,
      di = element.businessObject.di,
      label = di.get('label');

  bounds = clampDecisionServiceLabelBounds(element, bounds);

  var diBounds = drdFactory.createDiBounds(bounds);

  if (label) {
    diBounds.$parent = label;

    return this.updateModdleProperties(element, label, { bounds: diBounds });
  }

  label = drdFactory.create('dmndi:DMNLabel', { bounds: diBounds });

  label.$parent = di;
  diBounds.$parent = label;

  this.updateModdleProperties(element, di, { label: label });
};

Modeling.prototype.updateModdleProperties = function(element, moddleElement, properties) {
  this._commandStack.execute('element.updateModdleProperties', {
    element: element,
    moddleElement: moddleElement,
    properties: properties
  });
};

Modeling.prototype.updateProperties = function(element, properties) {
  this._commandStack.execute('element.updateProperties', {
    element: element,
    properties: properties
  });
};

Modeling.prototype.updateLabel = function(element, newLabel, newBounds, hints) {
  this._commandStack.execute('element.updateLabel', {
    element: element,
    newLabel: newLabel,
    newBounds: newBounds,
    hints: hints || {}
  });
};

/**
 * Fold a Decision Service's definition away, or unfold it again (DMN 1.5 §6.2.4).
 *
 * @param {Shape} element
 * @param {boolean} collapse
 */
Modeling.prototype.collapseDecisionService = function(element, collapse) {
  this._commandStack.execute('decisionService.collapse', {
    element: element,
    collapse: collapse !== false
  });
};
