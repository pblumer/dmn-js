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
import { transform } from 'diagram-js/lib/util/SvgTransformUtil';

import { is } from 'dmn-js-shared/lib/util/ModelUtil';

import { getDecisionServiceDividerY } from '../modeling/DecisionServiceUtil';
import { RESIZE_PREFIX } from './DecisionServiceDividerResize';


var HANDLE_SIZE = 8,
    HANDLE_HIT_SIZE = 20,
    LOW_PRIORITY = 500;

var CLS_RESIZER = 'djs-decision-service-divider-resizer';


/**
 * Adds a draggable resize handle to a selected DMN 1.5 Decision Service.
 *
 * @param {EventBus} eventBus
 * @param {Canvas} canvas
 * @param {Selection} selection
 * @param {DecisionServiceDividerResize} decisionServiceDividerResize
 */
export default function DecisionServiceDividerResizeHandles(
    eventBus,
    canvas,
    selection,
    decisionServiceDividerResize
) {
  this._canvas = canvas;
  this._decisionServiceDividerResize = decisionServiceDividerResize;

  var self = this;

  function refresh(element) {
    self.removeResizer();

    if (element) {
      self.addResizer(element);
    }
  }

  eventBus.on('selection.changed', LOW_PRIORITY, function(event) {
    var selection = event.newSelection;

    refresh(selection.length === 1 ? selection[0] : null);
  });

  eventBus.on('shape.changed', LOW_PRIORITY, function(event) {
    if (selection.isSelected(event.element)) {
      refresh(event.element);
    }
  });

  eventBus.on(RESIZE_PREFIX + '.move', function(event) {
    self.updateResizer(event.context.shape, event.context.dividerY);
  });

  eventBus.on([
    RESIZE_PREFIX + '.ended',
    RESIZE_PREFIX + '.canceled'
  ], LOW_PRIORITY, function(event) {
    refresh(event.context && event.context.shape);
  });
}

DecisionServiceDividerResizeHandles.$inject = [
  'eventBus',
  'canvas',
  'selection',
  'decisionServiceDividerResize'
];

DecisionServiceDividerResizeHandles.prototype.addResizer = function(element) {
  if (!is(element, 'dmn:DecisionService')) {
    return;
  }

  var divider = element.businessObject.di.get('decisionServiceDividerLine');

  if (!divider) {
    return;
  }

  var group = svgCreate('g'),
      visual = svgCreate('rect'),
      hit = svgCreate('rect'),
      dividerY = getDecisionServiceDividerY(element);

  svgClasses(group).add('djs-resizer');
  svgClasses(group).add('djs-resizer-n');
  svgClasses(group).add(CLS_RESIZER);

  svgAttr(visual, {
    x: -HANDLE_SIZE / 2,
    y: -HANDLE_SIZE / 2,
    rx: 2,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE
  });
  svgClasses(visual).add('djs-resizer-visual');

  svgAttr(hit, {
    x: -HANDLE_HIT_SIZE / 2,
    y: -HANDLE_HIT_SIZE / 2,
    width: HANDLE_HIT_SIZE,
    height: HANDLE_HIT_SIZE
  });
  svgClasses(hit).add('djs-resizer-hit');

  svgAppend(group, visual);
  svgAppend(group, hit);
  svgAppend(this._getResizersParent(), group);

  transform(group, element.x + element.width / 2, dividerY);

  this.makeDraggable(element, group);
};

DecisionServiceDividerResizeHandles.prototype.makeDraggable = function(element, gfx) {
  var decisionServiceDividerResize = this._decisionServiceDividerResize;

  function startResize(event) {
    if (isPrimaryButton(event)) {
      decisionServiceDividerResize.activate(event, element);
    }
  }

  domEvent.bind(gfx, 'mousedown', startResize);
  domEvent.bind(gfx, 'touchstart', startResize);
};

DecisionServiceDividerResizeHandles.prototype.removeResizer = function() {
  var resizer = domQuery('.' + CLS_RESIZER, this._getResizersParent());

  if (resizer) {
    svgRemove(resizer);
  }
};

DecisionServiceDividerResizeHandles.prototype.updateResizer = function(element, dividerY) {
  var resizer = domQuery('.' + CLS_RESIZER, this._getResizersParent());

  if (resizer) {
    transform(resizer, element.x + element.width / 2, dividerY);
  }
};

DecisionServiceDividerResizeHandles.prototype._getResizersParent = function() {
  return this._canvas.getLayer('resizers');
};
