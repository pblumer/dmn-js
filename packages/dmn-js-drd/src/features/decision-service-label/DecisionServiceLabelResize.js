import {
  clampDecisionServiceLabelBounds,
  getDecisionServiceLabelLineHeight,
  getDecisionServiceLabelMinWidth
} from '../modeling/DecisionServiceUtil';


var RESIZE_PREFIX = 'decisionServiceLabel.resize';


/**
 * Dragging a Decision Service's name box wider, narrower, taller or shorter.
 *
 * Moving the name is not enough on its own. Where the name goes decides what it
 * collides with; how wide it is decides whether it reads at all. A box measured to
 * the name it held when it was first dragged is the wrong box for a longer name, for
 * a two-line one the author wants on one line, or for a corner of the service that
 * happens to be narrow — and DMN has nowhere else to say it, since the DMNLabel's
 * bounds carry a width and a height and nothing carries a wrapping rule.
 *
 * The corner being dragged is the one that moves; the opposite one stays put, which
 * is what makes a resize read as a resize rather than as a move. What it writes is
 * the same DMNLabel bounds a name move writes, so the two are one stored fact.
 *
 * Never narrower than the longest word: the clamp sees to that, so a name that does
 * wrap wraps between words. There is no size at which this editor cuts a word in
 * half.
 *
 * @param {EventBus} eventBus
 * @param {Dragging} dragging
 * @param {Modeling} modeling
 * @param {TextRenderer} textRenderer
 */
export default function DecisionServiceLabelResize(
    eventBus, dragging, modeling, textRenderer) {

  this._dragging = dragging;

  eventBus.on(RESIZE_PREFIX + '.move', function(event) {
    var context = event.context;

    context.bounds = resizedBounds(
      context.shape,
      context.originalBounds,
      context.corner,
      event.dx,
      event.dy,
      textRenderer
    );
  });

  eventBus.on(RESIZE_PREFIX + '.end', function(event) {
    var context = event.context,
        bounds = context.bounds,
        original = context.originalBounds;

    if (bounds.width !== original.width || bounds.height !== original.height ||
        bounds.x !== original.x || bounds.y !== original.y) {
      modeling.updateDecisionServiceLabelBounds(context.shape, bounds);
    }
  });
}

DecisionServiceLabelResize.$inject = [
  'eventBus',
  'dragging',
  'modeling',
  'textRenderer'
];

/**
 * Start resizing a Decision Service's name box.
 *
 * @param {MouseEvent|TouchEvent} event
 * @param {Shape} shape
 * @param {Bounds} bounds absolute, where the name is drawn now
 * @param {string} corner one of nw, ne, sw, se
 */
DecisionServiceLabelResize.prototype.activate = function(
    event, shape, bounds, corner) {

  var context = {
    shape: shape,
    corner: corner,
    originalBounds: bounds,
    bounds: bounds
  };

  this._dragging.init(event, cornerPoint(bounds, corner), RESIZE_PREFIX, {
    autoActivate: true,
    cursor: CURSORS[corner],
    keepSelection: true,
    data: {
      shape: shape,
      context: context
    }
  });
};

var CURSORS = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize'
};

/**
 * Where a corner sits now, so the drag starts under the pointer.
 *
 * @param {Bounds} bounds
 * @param {string} corner
 *
 * @return {Point}
 */
function cornerPoint(bounds, corner) {
  return {
    x: corner === 'nw' || corner === 'sw' ? bounds.x : bounds.x + bounds.width,
    y: corner === 'nw' || corner === 'ne' ? bounds.y : bounds.y + bounds.height
  };
}

/**
 * The box the drag has come to, with the opposite corner held still and the result
 * clamped into the shape.
 *
 * @param {Shape} shape
 * @param {Bounds} original
 * @param {string} corner
 * @param {number} dx
 * @param {number} dy
 * @param {TextRenderer} textRenderer
 *
 * @return {Bounds}
 */
function resizedBounds(shape, original, corner, dx, dy, textRenderer) {
  var west = corner === 'nw' || corner === 'sw',
      north = corner === 'nw' || corner === 'ne';

  var left = west ? original.x + dx : original.x,
      top = north ? original.y + dy : original.y,
      right = west ? original.x + original.width : original.x + original.width + dx,
      bottom = north
        ? original.y + original.height
        : original.y + original.height + dy;

  var minWidth = getDecisionServiceLabelMinWidth(shape, textRenderer);

  var width = Math.max(right - left, minWidth),
      height = Math.max(bottom - top,
        getDecisionServiceLabelLineHeight(textRenderer));

  // the corner the author is not holding stays where it is, so growing the box
  // westwards moves its left edge rather than its right
  return clampDecisionServiceLabelBounds(shape, {
    x: west ? right - width : left,
    y: north ? bottom - height : top,
    width: width,
    height: height
  }, minWidth);
}

export { RESIZE_PREFIX };
