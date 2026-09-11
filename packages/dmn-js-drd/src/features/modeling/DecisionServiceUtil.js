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
