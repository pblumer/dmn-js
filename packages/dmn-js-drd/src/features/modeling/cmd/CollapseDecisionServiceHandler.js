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
 * Only what is drawn *between* members goes with them. A requirement that crosses
 * the boundary — the input data a member is given, a decision outside that a member
 * needs, a decision outside that needs a member — is a requirement of the service
 * itself, and the box is the only thing left to draw it against, so it is re-docked
 * there rather than dropped. That is also what makes the collapsed picture true:
 * DMN derives a service's `inputData` and `inputDecision` from exactly these
 * crossings (§10.4), so an author looking at the folded box sees what the service
 * is given and what is given it.
 *
 * Re-docking moves the endpoint on the canvas and nothing else. The requirement
 * still belongs to the decision that requires it, and that is why this is its own
 * command: a shape.delete takes the decision out of `drgElement` as well
 * (DrdUpdater#updateSemanticParent), and reconnecting through modeling would rewrite
 * the requirement's owner. Both directions therefore move depiction only, and never
 * touch the semantic tree.
 *
 * What a fold cannot carry across a save is where the decisions were: DMN has no
 * place to park the bounds of something a diagram does not show — a DMNDiagram takes
 * no owning element (Table 95) and cannot contain another. Within a session the
 * moddle element keeps its DMNShape, so unfolding puts everything back exactly —
 * including the service's own bounds and its divider, neither of which can be
 * recomputed, because the collapsed box is 180x100 and the divider is clamped to
 * fit it. After a reload the shapes are gone from the document and unfolding lays
 * the members out afresh inside the box.
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
    : hiddenDepictions(element);

  context.geometry = collapse
    ? expandedGeometry(element)
    : element._foldedGeometry;

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
      collapse = context.collapse,
      depicted = context.depicted,
      geometry = context.geometry,
      modeling = this._modeling,
      drdFactory = this._drdFactory;

  modeling.resizeShape(element, collapse
    ? collapsedBounds(element)
    : geometry
      ? geometry.bounds
      : expandedBounds(element, depicted));

  // A resize recomputes the divider from the box it is given, which is the right
  // answer for every resize but this one: the divider was clamped into a 180x100
  // box on the way in, so there is nothing left to recompute it from.
  if (!collapse && geometry && geometry.dividerY !== undefined) {
    restoreDivider(modeling, drdFactory, element, geometry.dividerY);
  }

  // The crossing edges last. Folding, they have to find the box at the size it
  // ends up; unfolding, they are put back exactly where the author drew them
  // rather than laid out afresh.
  depicted.crossing.forEach(function(crossing) {
    if (collapse) {
      modeling.layoutConnection(crossing.connection);
    } else {
      modeling.updateWaypoints(
        crossing.connection, copyWaypoints(crossing.waypoints));
    }
  });
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
      element = context.element,
      canvas = this._canvas,
      depicted = context.depicted,
      changed = [ element ];

  // Crossing edges first: re-docking one to the box takes it off the member's
  // incoming or outgoing list, which is what lets that member leave next.
  depicted.crossing.forEach(function(crossing) {
    changed.push(crossing.connection);

    crossing.connection[crossing.end] = element;
  });

  // Then the edges that are drawn wholly inside: a shape cannot leave with one
  // still docked to it.
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
  element._foldedDepictions = depicted;
  element._foldedGeometry = context.geometry;

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

  // The members are back, so a crossing edge has its own decision to end on again.
  depicted.crossing.forEach(function(crossing) {
    changed.push(crossing.connection);

    crossing.connection[crossing.end] = crossing.shape;
  });

  delete context.element._foldedDepictions;
  delete context.element._foldedGeometry;

  return changed;
};


// helpers //////////

/**
 * The shapes a Decision Service is made of that the canvas currently draws, and
 * the edges docked to them, told apart by where their other end is.
 *
 * `connections` are drawn wholly inside the service and go with its members.
 * `crossing` are the ones with an end outside it, which stay and are re-docked to
 * the box; each entry remembers which end was the member and how the edge was
 * drawn, so unfolding can put both back.
 *
 * The members are collected first and classified second, on purpose: an edge
 * between two members is only recognisable as internal once both are known.
 */
function memberDepictions(element, elementRegistry) {
  var hrefs = getDecisionServiceMemberHrefs(element.businessObject),
      shapes = [],
      connections = [],
      crossing = [];

  hrefs.forEach(function(href) {
    var shape = elementRegistry.get(href.replace(/^#/, ''));

    if (shape && is(shape, 'dmn:Decision') && shapes.indexOf(shape) === -1) {
      shapes.push(shape);
    }
  });

  shapes.forEach(function(shape) {
    shape.incoming.concat(shape.outgoing).forEach(function(connection) {
      var end = connection.target === shape ? 'target' : 'source',
          other = end === 'target' ? connection.source : connection.target;

      // Inside, or docked to the service itself: nothing is left to draw it
      // between once the members are away.
      if (shapes.indexOf(other) !== -1 || other === element) {
        if (connections.indexOf(connection) === -1) {
          connections.push(connection);
        }

        return;
      }

      if (hasConnection(crossing, connection)) {
        return;
      }

      crossing.push({
        connection: connection,
        end: end,
        shape: shape,
        waypoints: copyWaypoints(connection.waypoints)
      });
    });
  });

  return { shapes: shapes, connections: connections, crossing: crossing };
}

/**
 * What a fold of this service put away, when this session is the one that folded it.
 */
function hiddenDepictions(element) {
  return element._foldedDepictions ||
    { shapes: [], connections: [], crossing: [] };
}

function hasConnection(crossing, connection) {
  return crossing.some(function(entry) {
    return entry.connection === connection;
  });
}

function copyWaypoints(waypoints) {
  return (waypoints || []).map(function(waypoint) {
    var copy = { x: waypoint.x, y: waypoint.y };

    if (waypoint.original) {
      copy.original = { x: waypoint.original.x, y: waypoint.original.y };
    }

    return copy;
  });
}

/**
 * The service's own geometry, which a fold overwrites and only a record can restore.
 */
function expandedGeometry(element) {
  var divider = element.businessObject.di.get('decisionServiceDividerLine');

  return {
    bounds: {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height
    },
    dividerY: divider && divider.waypoint && divider.waypoint.length
      ? divider.waypoint[0].y
      : undefined
  };
}

function restoreDivider(modeling, drdFactory, element, dividerY) {
  var divider = element.businessObject.di.get('decisionServiceDividerLine');

  if (!divider) {
    return;
  }

  modeling.updateModdleProperties(element, divider, {
    waypoint: drdFactory.createDiWaypoints([
      { x: element.x, y: dividerY },
      { x: element.x + element.width, y: dividerY }
    ]).map(function(waypoint) {
      waypoint.$parent = divider;

      return waypoint;
    })
  });
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
