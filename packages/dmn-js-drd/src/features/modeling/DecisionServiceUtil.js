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
