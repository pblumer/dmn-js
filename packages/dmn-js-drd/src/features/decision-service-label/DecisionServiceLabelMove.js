import {
  clampDecisionServiceLabelBounds,
  getDecisionServiceLabelMinWidth
} from '../modeling/DecisionServiceUtil';


var MOVE_PREFIX = 'decisionServiceLabel.move';


/**
 * Dragging a DMN 1.5 Decision Service's name to where it does not get in the way.
 *
 * §6.2.5 requires the Name inside the shape and says nothing about where, and the
 * figures do not agree with each other: 6-6 draws it centred at the top, 6-7, 6-8
 * and 6-9 at the top left. Any corner this editor picks is wrong for some diagram —
 * the name collides with an output decision, or with a requirement crossing the
 * border — so it picks a default and lets the author move it.
 *
 * What a drag writes is the DMNShape's DMNLabel bounds, which is DMN's own place for
 * it: a DMNLabel is a di:Shape, so it has Bounds, and the same paragraph already
 * gives that label the last word over the name. The position therefore survives a
 * save and means the same thing to a tool that never heard of this editor.
 *
 * @param {EventBus} eventBus
 * @param {Dragging} dragging
 * @param {Modeling} modeling
 * @param {TextRenderer} textRenderer
 */
export default function DecisionServiceLabelMove(
    eventBus, dragging, modeling, textRenderer) {

  this._dragging = dragging;

  eventBus.on(MOVE_PREFIX + '.move', function(event) {
    var context = event.context,
        original = context.originalBounds;

    // the same minimum the command applies, so the preview and what is written
    // cannot disagree and the first drag does not jump
    context.bounds = clampDecisionServiceLabelBounds(context.shape, {
      x: original.x + event.dx,
      y: original.y + event.dy,
      width: original.width,
      height: original.height
    }, getDecisionServiceLabelMinWidth(context.shape, textRenderer));
  });

  eventBus.on(MOVE_PREFIX + '.end', function(event) {
    var context = event.context,
        bounds = context.bounds,
        original = context.originalBounds;

    if (bounds.x !== original.x || bounds.y !== original.y) {
      modeling.updateDecisionServiceLabelBounds(context.shape, bounds);
    }
  });
}

DecisionServiceLabelMove.$inject = [
  'eventBus',
  'dragging',
  'modeling',
  'textRenderer'
];

/**
 * Start dragging a Decision Service's name.
 *
 * @param {MouseEvent|TouchEvent} event
 * @param {Shape} shape
 * @param {Bounds} bounds absolute, where the name is drawn now
 */
DecisionServiceLabelMove.prototype.activate = function(event, shape, bounds) {
  var context = {
    shape: shape,
    originalBounds: bounds,
    bounds: bounds
  };

  this._dragging.init(
    event,
    { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
    MOVE_PREFIX,
    {
      autoActivate: true,
      cursor: 'grabbing',
      keepSelection: true,
      data: {
        shape: shape,
        context: context
      }
    }
  );
};

export { MOVE_PREFIX };
