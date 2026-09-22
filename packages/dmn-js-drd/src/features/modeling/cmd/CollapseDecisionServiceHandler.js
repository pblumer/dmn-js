import { is } from 'dmn-js-shared/lib/util/ModelUtil';

import {
  getDecisionServiceMemberHrefs
} from '../../../util/DecisionServiceMembership';

import {
  COLLAPSED_WIDTH,
  COLLAPSED_HEIGHT
} from '../DecisionServiceUtil';


/**
 * Fold a Decision Service's definition away, or unfold it again (DMN 1.5 §6.2.4).
 *
 * A collapsed service is a partial view, not a smaller model: the decisions it is
 * made of stay in the DRG and stay editable through the view list, which is built
 * from `definitions.drgElement` rather than from the diagram. What goes is their
 * depiction — their DMNShapes and the DMNEdges that end on them — which is exactly
 * what the specification's own example does. Its collapsed DRD simply does not
 * contain them.
 *
 * This is why removeElements is not the tool. A shape.delete takes the decision out
 * of `drgElement` as well (DrdUpdater#updateSemanticParent), and a requirement edge
 * belongs to the decision that requires it, so creating one back would tear it out
 * of its owner. Both directions therefore move depiction only, and never touch the
 * semantic tree.
 *
 * What a fold cannot carry across a save is where the decisions were: DMN has no
 * place to park the bounds of something a diagram does not show — a DMNDiagram takes
 * no owning element (Table 95) and cannot contain another. Within a session the
 * moddle element keeps its DMNShape, so unfolding puts everything back exactly;
 * after a reload the shapes are gone from the document and unfolding lays the
 * members out afresh inside the box.
 */
export default function CollapseDecisionServiceHandler(
    canvas, elementRegistry, drdUpdater, modeling, drdFactory, elementFactory) {
  this._canvas = canvas;
  this._elementRegistry = elementRegistry;
  this._drdUpdater = drdUpdater;
  this._modeling = modeling;
  this._drdFactory = drdFactory;
  this._elementFactory = elementFactory;
}

CollapseDecisionServiceHandler.$inject = [
  'canvas',
  'elementRegistry',
  'drdUpdater',
  'modeling',
  'drdFactory',
  'elementFactory'
];

/**
 * Resize the box and flip the flag as nested commands, so one undo takes the whole
 * fold back rather than half of it.
 */
CollapseDecisionServiceHandler.prototype.preExecute = function(context) {
  var element = context.element,
      collapse = context.collapse,
      modeling = this._modeling;

  context.depicted = collapse
    ? memberDepictions(element, this._elementRegistry)
    : hiddenDepictions(element, this._canvas);

  // The members go first. Shrinking the box while they are still drawn would have
  // their compartments re-read off it — the very damage the collapsed guard in
  // DrdUpdater refuses. Ordering it this way means that guard is a second line
  // rather than the only one.
  modeling.updateModdleProperties(element, element.businessObject.di, {
    isCollapsed: collapse || undefined
  });
};

CollapseDecisionServiceHandler.prototype.postExecute = function(context) {
  var element = context.element,
      modeling = this._modeling;

  modeling.resizeShape(element, context.collapse
    ? collapsedBounds(element)
    : expandedBounds(element, context.depicted));
};

CollapseDecisionServiceHandler.prototype.execute = function(context) {
  return context.collapse
    ? this._hide(context)
    : this._show(context);
};

CollapseDecisionServiceHandler.prototype.revert = function(context) {
  return context.collapse
    ? this._show(context)
    : this._hide(context);
};

/**
 * Take the members' depiction off the canvas and out of the diagram, leaving every
 * semantic element exactly where it was.
 */
CollapseDecisionServiceHandler.prototype._hide = function(context) {
  var self = this,
      canvas = this._canvas,
      depicted = context.depicted,
      changed = [ context.element ];

  // Connections first: a shape cannot leave with an edge still docked to it.
  depicted.connections.forEach(function(connection) {
    changed.push(connection);
    canvas.removeConnection(connection);
    self._drdUpdater.updateDiParent(connection.businessObject.di, null);
  });

  depicted.shapes.forEach(function(shape) {
    changed.push(shape);
    canvas.removeShape(shape);
    self._drdUpdater.updateDiParent(shape.businessObject.di, null);
  });

  // Kept on the service's own shape, not in the model: it is what lets a later
  // unfold put the decisions back where the author had them, and it is nobody's
  // business once the page is reloaded.
  context.element._foldedDepictions = depicted;

  return changed;
};

/**
 * Put the members' depiction back.
 */
CollapseDecisionServiceHandler.prototype._show = function(context) {
  var self = this,
      canvas = this._canvas,
      root = canvas.getRootElement(),
      rootDi = root.businessObject && root.businessObject.di,
      depicted = context.depicted,
      changed = [ context.element ];

  depicted.shapes.forEach(function(shape) {
    changed.push(shape);
    self._drdUpdater.updateDiParent(shape.businessObject.di, rootDi);
    canvas.addShape(shape, root);
  });

  depicted.connections.forEach(function(connection) {
    changed.push(connection);
    self._drdUpdater.updateDiParent(connection.businessObject.di, rootDi);
    canvas.addConnection(connection, root);
  });

  delete context.element._foldedDepictions;

  return changed;
};


// helpers //////////

/**
 * The shapes a Decision Service is made of that the canvas currently draws, and
 * every connection docked to them.
 */
function memberDepictions(element, elementRegistry) {
  var hrefs = getDecisionServiceMemberHrefs(element.businessObject),
      shapes = [],
      connections = [];

  hrefs.forEach(function(href) {
    var shape = elementRegistry.get(href.replace(/^#/, ''));

    if (!shape || !is(shape, 'dmn:Decision')) {
      return;
    }

    shapes.push(shape);

    shape.incoming.concat(shape.outgoing).forEach(function(connection) {
      if (connections.indexOf(connection) === -1) {
        connections.push(connection);
      }
    });
  });

  return { shapes: shapes, connections: connections };
}

/**
 * What a fold of this service put away, when this session is the one that folded it.
 */
function hiddenDepictions(element) {
  return element._foldedDepictions || { shapes: [], connections: [] };
}

function collapsedBounds(element) {
  return {
    x: element.x,
    y: element.y,
    width: COLLAPSED_WIDTH,
    height: COLLAPSED_HEIGHT
  };
}

/**
 * A box that holds everything coming back, with the service's padding around it.
 */
function expandedBounds(element, depicted) {
  var shapes = depicted.shapes;

  if (!shapes.length) {
    return {
      x: element.x,
      y: element.y,
      width: Math.max(element.width, COLLAPSED_WIDTH * 2),
      height: Math.max(element.height, COLLAPSED_HEIGHT * 2)
    };
  }

  var left = element.x,
      top = element.y,
      right = element.x + element.width,
      bottom = element.y + element.height;

  shapes.forEach(function(shape) {
    left = Math.min(left, shape.x - PADDING);
    top = Math.min(top, shape.y - PADDING);
    right = Math.max(right, shape.x + shape.width + PADDING);
    bottom = Math.max(bottom, shape.y + shape.height + PADDING);
  });

  return { x: left, y: top, width: right - left, height: bottom - top };
}

var PADDING = 20;
