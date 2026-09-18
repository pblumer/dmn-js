import {
  clampDecisionServiceDividerY,
  getDecisionServiceDividerY
} from '../modeling/DecisionServiceUtil';


var RESIZE_PREFIX = 'decisionServiceDivider.resize';


/**
 * Provides dragging behavior for a DMN 1.5 Decision Service divider.
 *
 * @param {EventBus} eventBus
 * @param {Dragging} dragging
 * @param {Modeling} modeling
 */
export default function DecisionServiceDividerResize(eventBus, dragging, modeling) {
  this._dragging = dragging;

  eventBus.on(RESIZE_PREFIX + '.move', function(event) {
    var context = event.context;

    context.dividerY = clampDecisionServiceDividerY(
      context.shape,
      context.originalDividerY + event.dy
    );
  });

  eventBus.on(RESIZE_PREFIX + '.end', function(event) {
    var context = event.context;

    if (context.dividerY !== context.originalDividerY) {
      modeling.updateDecisionServiceDivider(context.shape, context.dividerY);
    }
  });
}

DecisionServiceDividerResize.$inject = [
  'eventBus',
  'dragging',
  'modeling'
];

/**
 * Start dragging a Decision Service divider.
 *
 * @param {MouseEvent|TouchEvent} event
 * @param {Shape} shape
 */
DecisionServiceDividerResize.prototype.activate = function(event, shape) {
  var dividerY = getDecisionServiceDividerY(shape),
      context = {
        shape: shape,
        originalDividerY: dividerY,
        dividerY: dividerY
      };

  this._dragging.init(
    event,
    { x: shape.x + shape.width / 2, y: dividerY },
    RESIZE_PREFIX,
    {
      autoActivate: true,
      cursor: 'resize-ns',
      keepSelection: true,
      data: {
        shape: shape,
        context: context
      }
    }
  );
};

export { RESIZE_PREFIX };
