import { forEach } from 'min-dash';

import { is } from 'dmn-js-shared/lib/util/ModelUtil';


/**
 * Above ChangeSupport, which reorders the drawing from `parent.children` at the
 * default priority. Running first is what lets this decide the order it reads.
 */
var REORDER_PRIORITY = 1500;


/**
 * A Decision Service is drawn around things, never over them.
 *
 * The box is a background: DMN 1.5 §6.2.5 has it enclosing the decisions it names,
 * and the paragraph under Figure 6-9 has requirements crossing its border freely,
 * which only reads as a diagram if the border is behind them. Its own members are
 * unaffected — they are its children, drawn inside its group and therefore above the
 * box, which is what the container is for.
 *
 * This was a default before: a service went to the front of its siblings when it was
 * created, and again when it was moved. Both were true and neither was enough. Every
 * gesture that touches `parent.children` decides paint order, and enumerating them
 * is a losing game — each one that is missed is a diagram with an arrow hidden under
 * a box, reported one at a time.
 *
 * So it is an invariant now, asserted where the drawing order is actually decided:
 * GraphicsFactory#updateContainments re-inserts a parent's children into the DOM in
 * the order `parent.children` gives, on every `elements.changed`. Putting the
 * Decision Services at the front of that array, just before it is read, makes the
 * rule hold for gestures nobody has thought of — a move, a resize, a create, an
 * undo, a paste, whatever a later version adds — rather than for the ones somebody
 * remembered to handle.
 *
 * The order is presentation, not meaning: DMN membership is written from the
 * business objects, never from this array, so rewriting it says nothing about the
 * model. It is also why a caller cannot ask for a Decision Service to be drawn on
 * top any more. There is no diagram in which that is what DMN's overlay means.
 */
export default function DecisionServicePaintsBehindBehavior(eventBus) {

  eventBus.on('elements.changed', REORDER_PRIORITY, function(event) {
    var parents = {};

    forEach(event.elements, function(element) {
      if (element.parent) {
        parents[element.parent.id] = element.parent;
      }
    });

    forEach(parents, paintDecisionServicesFirst);
  });
}

DecisionServicePaintsBehindBehavior.$inject = [ 'eventBus' ];


/**
 * Move a parent's Decision Services to the front of its children, keeping the order
 * of both groups otherwise.
 *
 * @param {Element} parent
 */
function paintDecisionServicesFirst(parent) {
  var children = parent.children;

  if (!children || children.length < 2) {
    return;
  }

  var services = [],
      rest = [];

  forEach(children, function(child) {
    (is(child, 'dmn:DecisionService') ? services : rest).push(child);
  });

  if (!services.length || !rest.length) {
    return;
  }

  var ordered = services.concat(rest);

  var moved = ordered.some(function(child, index) {
    return children[index] !== child;
  });

  if (!moved) {
    return;
  }

  // In place: the array is the parent's own, and other things hold a reference to it.
  children.length = 0;

  Array.prototype.push.apply(children, ordered);
}
