import {
  event as domEvent,
  query as domQuery
} from 'min-dom';

import {
  append as svgAppend,
  attr as svgAttr,
  classes as svgClasses,
  create as svgCreate,
  remove as svgRemove
} from 'tiny-svg';

import { isPrimaryButton } from 'diagram-js/lib/util/Mouse';

import { is } from 'dmn-js-shared/lib/util/ModelUtil';

import {
  getDecisionServiceLabelBounds
} from '../modeling/DecisionServiceUtil';

import { MOVE_PREFIX } from './DecisionServiceLabelMove';


var LOW_PRIORITY = 500;

var CLS_HANDLE = 'djs-decision-service-label-handle';


/**
 * A grab handle over a selected Decision Service's name.
 *
 * Where the name is drawn is read off the drawing rather than recomputed: the
 * renderer lays the text out, and the handle takes its box from the rendered text.
 * That is what keeps the two from disagreeing — a handle placed by a second guess at
 * the layout sits beside the name it is supposed to grab, and the first drag then
 * jumps.
 *
 * @param {EventBus} eventBus
 * @param {Canvas} canvas
 * @param {ElementRegistry} elementRegistry
 * @param {Selection} selection
 * @param {DecisionServiceLabelMove} decisionServiceLabelMove
 */
export default function DecisionServiceLabelMoveHandle(
    eventBus,
    canvas,
    elementRegistry,
    selection,
    decisionServiceLabelMove
) {
  this._canvas = canvas;
  this._elementRegistry = elementRegistry;
  this._decisionServiceLabelMove = decisionServiceLabelMove;

  var self = this;

  function refresh(element) {
    self.removeHandle();

    if (element) {
      self.addHandle(element);
    }
  }

  eventBus.on('selection.changed', LOW_PRIORITY, function(event) {
    var newSelection = event.newSelection;

    refresh(newSelection.length === 1 ? newSelection[0] : null);
  });

  eventBus.on('shape.changed', LOW_PRIORITY, function(event) {
    if (selection.isSelected(event.element)) {
      refresh(event.element);
    }
  });

  eventBus.on(MOVE_PREFIX + '.move', function(event) {
    self.updateHandle(event.context.bounds);
  });

  eventBus.on([
    MOVE_PREFIX + '.ended',
    MOVE_PREFIX + '.canceled'
  ], LOW_PRIORITY, function(event) {
    refresh(event.context && event.context.shape);
  });
}

DecisionServiceLabelMoveHandle.$inject = [
  'eventBus',
  'canvas',
  'elementRegistry',
  'selection',
  'decisionServiceLabelMove'
];

DecisionServiceLabelMoveHandle.prototype.addHandle = function(element) {
  if (!is(element, 'dmn:DecisionService')) {
    return;
  }

  var bounds = this.getLabelBounds(element);

  if (!bounds) {
    return;
  }

  var handle = svgCreate('rect');

  svgClasses(handle).add(CLS_HANDLE);

  svgAttr(handle, {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    rx: 2
  });

  svgAppend(this._getHandleParent(), handle);

  this.makeDraggable(element, handle, bounds);
};

/**
 * Where the name is drawn: the author's own DMNLabel bounds if they moved it, else
 * the box the renderer just laid the text out in.
 *
 * @param {Shape} element
 *
 * @return {Bounds|null} absolute, or null while nothing draws a name
 */
DecisionServiceLabelMoveHandle.prototype.getLabelBounds = function(element) {
  var stored = getDecisionServiceLabelBounds(element);

  if (stored) {
    return stored;
  }

  var gfx = this._elementRegistry.getGraphics(element),
      label = gfx && domQuery('.djs-label', gfx);

  if (!label) {
    return null;
  }

  var box = label.getBBox();

  if (!box.width || !box.height) {
    return null;
  }

  return {
    x: element.x + box.x,
    y: element.y + box.y,
    width: box.width,
    height: box.height
  };
};

DecisionServiceLabelMoveHandle.prototype.makeDraggable = function(
    element, gfx, bounds) {
  var decisionServiceLabelMove = this._decisionServiceLabelMove;

  function startMove(event) {
    if (isPrimaryButton(event)) {
      decisionServiceLabelMove.activate(event, element, bounds);
    }
  }

  domEvent.bind(gfx, 'mousedown', startMove);
  domEvent.bind(gfx, 'touchstart', startMove);
};

DecisionServiceLabelMoveHandle.prototype.removeHandle = function() {
  var handle = domQuery('.' + CLS_HANDLE, this._getHandleParent());

  if (handle) {
    svgRemove(handle);
  }
};

DecisionServiceLabelMoveHandle.prototype.updateHandle = function(bounds) {
  var handle = domQuery('.' + CLS_HANDLE, this._getHandleParent());

  if (handle) {
    svgAttr(handle, { x: bounds.x, y: bounds.y });
  }
};

DecisionServiceLabelMoveHandle.prototype._getHandleParent = function() {
  return this._canvas.getLayer('resizers');
};
