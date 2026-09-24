var MIN_DECISION_SERVICE_COMPARTMENT_HEIGHT = 20;


/**
 * Clamp a Decision Service divider to keep both compartments visible.
 *
 * @param {Shape} shape
 * @param {number} dividerY
 *
 * @return {number}
 */
export function clampDecisionServiceDividerY(shape, dividerY) {
  var compartmentHeight = Math.min(
    MIN_DECISION_SERVICE_COMPARTMENT_HEIGHT,
    shape.height / 2
  );

  return Math.max(
    shape.y + compartmentHeight,
    Math.min(dividerY, shape.y + shape.height - compartmentHeight)
  );
}

/**
 * Return the current Decision Service divider position.
 *
 * @param {Shape} shape
 *
 * @return {number}
 */
export function getDecisionServiceDividerY(shape) {
  var divider = shape.businessObject.di.get('decisionServiceDividerLine');

  if (divider && divider.waypoint && divider.waypoint.length) {
    return divider.waypoint[0].y;
  }

  return shape.y + Math.round(shape.height * 0.6);
}

/**
 * The size a Decision Service is drawn at while collapsed.
 *
 * DMN prescribes none. §6.2.5 fixes the shape — a rectangle with rounded corners
 * drawn with a heavy solid border, with the name displayed inside it — and Table
 * 106 gives the collapsed depiction its own row, but the figures carry no
 * dimensions. This is a Decision's own width plus the room the fold marker needs
 * below the name, so a collapsed service reads as a sibling of the elements around
 * it rather than as a different kind of thing.
 */
export var COLLAPSED_WIDTH = 180;
export var COLLAPSED_HEIGHT = 100;

/**
 * The marker that says a Decision Service has its definition folded away: a square
 * with a plus in it, centred under the name (DMN 1.5 Table 5-2), sitting this far
 * above the bottom edge.
 *
 * Shared rather than each place picking its own, because two things are drawn from
 * it — the marker itself and the switch that folds and unfolds — and a switch that
 * does not land on the marker it stands for is two controls where there is one.
 */
export var COLLAPSED_MARKER_SIZE = 16;
export var COLLAPSED_MARKER_MARGIN = 12;

/**
 * Whether a Decision Service is drawn without the details of its definition
 * (DMN 1.5 §6.2.4, DMNShape.isCollapsed).
 *
 * @param {Shape} shape
 *
 * @return {boolean}
 */
export function isDecisionServiceCollapsed(shape) {
  var di = shape.businessObject && shape.businessObject.di;

  return !!(di && di.get('isCollapsed'));
}

/**
 * The room the name keeps clear of the box's edge, so it does not sit on a rounded
 * corner or on the heavy border.
 */
export var DECISION_SERVICE_PADDING = 10;

/**
 * Where the author put the Decision Service's name, if they moved it.
 *
 * DMN has a place for this and it is not an extension: a DMNShape carries a
 * DMNLabel, and a DMNLabel is a di:Shape, so it has Bounds (DMN 1.5 DMNDI). A label
 * with bounds says where the name is drawn; without one, the renderer's own default
 * applies. Writing there rather than anywhere of our own means the position survives
 * a save and means something to a tool that never heard of us.
 *
 * @param {Shape} shape
 *
 * @return {Bounds|null} absolute bounds, or null while the default applies
 */
export function getDecisionServiceLabelBounds(shape) {
  var di = shape.businessObject && shape.businessObject.di,
      label = di && di.get && di.get('label'),
      bounds = label && label.get('bounds');

  if (!bounds) {
    return null;
  }

  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height
  };
}

/**
 * Keep the name inside the box, and above the divider while there is one.
 *
 * Inside, because DMN 1.5 §6.2.5 says the Name is displayed inside the shape. Above
 * the divider, because the same paragraph says the upper part encloses only the
 * output decisions and the Decision Service's Name — so dragging the name into the
 * lower compartment would draw a diagram the specification does not have.
 *
 * A collapsed service has no compartments, so only the box constrains it.
 *
 * @param {Shape} shape
 * @param {Bounds} bounds
 *
 * @return {Bounds}
 */
export function clampDecisionServiceLabelBounds(shape, bounds) {
  var top = shape.y + DECISION_SERVICE_PADDING,
      bottom = shape.y + shape.height - DECISION_SERVICE_PADDING - bounds.height;

  if (!isDecisionServiceCollapsed(shape)) {
    var divider = shape.businessObject.di.get('decisionServiceDividerLine');

    if (divider && divider.waypoint && divider.waypoint.length) {
      bottom = Math.min(bottom, divider.waypoint[0].y - bounds.height);
    }
  }

  return {
    x: clamp(
      bounds.x,
      shape.x + DECISION_SERVICE_PADDING,
      shape.x + shape.width - DECISION_SERVICE_PADDING - bounds.width
    ),
    y: clamp(bounds.y, top, Math.max(top, bottom)),
    width: bounds.width,
    height: bounds.height
  };
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(value, high));
}
