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
export function clampDecisionServiceLabelBounds(shape, bounds, minWidth) {
  var room = labelRoom(shape);

  var width = bounds.width,
      height = bounds.height;

  if (minWidth) {

    // Never narrower than the longest word. diagram-js shortens a line that does
    // not fit by whitespace and hyphens first and cuts mid-word only when there is
    // nothing else left, so a box that holds the longest word is exactly the box in
    // which a break can only ever fall between words.
    //
    // Width only. Height is not part of fitting a line — lines simply stack — so a
    // floor on it would rewrite what an author's drag stored and buy nothing.
    width = Math.max(width, minWidth);
  }

  // and never wider or taller than the room it has to sit in, so the size cannot
  // put the name outside the shape that §6.2.5 requires it to be inside
  width = Math.min(width, room.width);
  height = Math.min(height, room.height);

  return {
    x: clamp(bounds.x, room.x, room.x + room.width - width),
    y: clamp(bounds.y, room.y, Math.max(room.y, room.y + room.height - height)),
    width: width,
    height: height
  };
}

/**
 * The rectangle a Decision Service's name has to sit in: inside the box, and above
 * the divider while there is one.
 *
 * @param {Shape} shape
 *
 * @return {Bounds}
 */
export function getDecisionServiceLabelRoom(shape) {
  return labelRoom(shape);
}

function labelRoom(shape) {
  var x = shape.x + DECISION_SERVICE_PADDING,
      y = shape.y + DECISION_SERVICE_PADDING,
      width = Math.max(shape.width - 2 * DECISION_SERVICE_PADDING, 0),
      bottom = shape.y + shape.height - DECISION_SERVICE_PADDING;

  if (!isDecisionServiceCollapsed(shape)) {
    var divider = shape.businessObject.di.get('decisionServiceDividerLine');

    if (divider && divider.waypoint && divider.waypoint.length) {
      bottom = Math.min(bottom, divider.waypoint[0].y);
    }
  }

  return {
    x: x,
    y: y,
    width: width,
    height: Math.max(bottom - y, 0)
  };
}

/**
 * The narrowest box a Decision Service's name fits in without a word being cut in
 * half.
 *
 * diagram-js fits a line by `width < Math.round(maxWidth)`, so a box measured to the
 * text's own width is one pixel short of holding it — which is how a name dragged
 * once came back broken across two lines, a letter stranded on the second. Hence the
 * rounding up and the pixel of slack: they are that comparison, not a guess.
 *
 * @param {Shape} shape
 * @param {TextRenderer} textRenderer
 *
 * @return {number}
 */
export function getDecisionServiceLabelMinWidth(shape, textRenderer) {
  var name = (shape.businessObject && shape.businessObject.get('name')) || '',
      style = textRenderer.getDefaultStyle();

  // the units diagram-js is willing to break between
  var words = name.split(/[\s\u00AD-]+/).filter(Boolean);

  if (!words.length) {
    words = [ '' ];
  }

  var width = 0;

  words.forEach(function(word) {
    width = Math.max(width, textRenderer.getDimensions(word, {
      box: { width: MEASURE_BOX, height: MEASURE_BOX },
      style: style
    }).width);
  });

  return Math.ceil(width) + FIT_SLACK;
}

/**
 * One line of the name's own font, so a resize cannot collapse the box to nothing.
 *
 * @param {TextRenderer} textRenderer
 *
 * @return {number}
 */
export function getDecisionServiceLabelLineHeight(textRenderer) {
  return textRenderer.getDimensions('X', {
    box: { width: MEASURE_BOX, height: MEASURE_BOX },
    style: textRenderer.getDefaultStyle()
  }).height;
}

/**
 * Wide and tall enough that one word is never laid out over two lines while it is
 * being measured.
 */
var MEASURE_BOX = 10000;

/**
 * One pixel, so the strict comparison above comes out true.
 */
var FIT_SLACK = 1;

function clamp(value, low, high) {
  return Math.max(low, Math.min(value, high));
}
