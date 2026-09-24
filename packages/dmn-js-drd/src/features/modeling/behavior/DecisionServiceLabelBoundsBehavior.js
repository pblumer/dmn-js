import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import { is } from 'dmn-js-shared/lib/util/ModelUtil';

import {
  clampDecisionServiceLabelBounds,
  getDecisionServiceLabelBounds
} from '../DecisionServiceUtil';


/**
 * A Decision Service's name stays where the author put it — in the box.
 *
 * Where the name is drawn is a DMNLabel's bounds, and DMNDI records those in
 * diagram coordinates, not relative to the shape. That is the right place to
 * record it — DMN 1.5 §6.2.5 gives the label the last word over the name, and
 * absolute bounds mean the same thing to a tool that never heard of this editor —
 * but it means the number stops being true the moment the box moves.
 *
 * Nothing kept the two in step, and the name is drawn from the bounds alone, so
 * dragging the box left the name behind: the further the box travelled, the further
 * outside it the name sat, and a box dragged far enough had its name floating over
 * an unrelated corner of the diagram. §6.2.5 says the Name is displayed inside the
 * shape, so that drawing is not DMN at all.
 *
 * It also moved the context pad away, which reads as a second, unrelated defect and
 * is the same one: diagram-js places the pad from the element's *rendered* bounding
 * box (ContextPad#_getTargetBounds), and a name drawn outside the box swells that
 * box to cover both. The pad then opens beside the stray name rather than beside the
 * service.
 *
 * Resizing had the mirror image of the problem: the bounds were left alone while the
 * box shrank past them, so the name ended up outside a box that had not moved at
 * all.
 *
 * One rule covers both. The name keeps its offset from the shape's top left corner,
 * and is clamped back inside when the box shrinks past it. A move is then a pure
 * translation — the offset is what it was, and the clamp changes nothing, because the
 * box is the same size — and a resize moves the name with whichever corner the author
 * dragged and pulls it back in only when it no longer fits.
 *
 * As a follow-up command rather than a direct write, so one undo takes the whole
 * gesture back: a command queued from postExecute belongs to the action that queued
 * it. It runs after DrdUpdater has written the new bounds and divider, which is what
 * the clamp reads.
 */
export default function DecisionServiceLabelBoundsBehavior(injector, modeling) {
  injector.invoke(CommandInterceptor, this);

  function follow(shape, dx, dy) {
    var bounds = getDecisionServiceLabelBounds(shape);

    // No stored bounds means the renderer's own default applies, and a default is
    // laid out inside the shape every time it is drawn. There is nothing to keep up
    // to date.
    if (!bounds) {
      return;
    }

    var next = clampDecisionServiceLabelBounds(shape, {
      x: bounds.x + dx,
      y: bounds.y + dy,
      width: bounds.width,
      height: bounds.height
    });

    // A gesture that leaves the name exactly where it was writes nothing, so the
    // command stack does not collect entries that undo to themselves. Clamped here
    // rather than compared before clamping, because a resize that does not move the
    // corner can still be the thing that pushes the name out.
    if (next.x === bounds.x && next.y === bounds.y) {
      return;
    }

    modeling.updateDecisionServiceLabelBounds(shape, next);
  }

  this.postExecute('shape.move', function(context) {
    var shape = context.shape,
        delta = context.delta;

    if (!is(shape, 'dmn:DecisionService') || !delta) {
      return;
    }

    follow(shape, delta.x, delta.y);
  }, true);

  this.postExecute('shape.resize', function(context) {
    var shape = context.shape,
        oldBounds = context.oldBounds;

    if (!is(shape, 'dmn:DecisionService') || !oldBounds) {
      return;
    }

    // The corner the author did not drag stays put, so the name stays where it was
    // in relation to it; the one they did drag carries the name along.
    follow(shape, shape.x - oldBounds.x, shape.y - oldBounds.y);
  }, true);
}

DecisionServiceLabelBoundsBehavior.$inject = [ 'injector', 'modeling' ];

inherits(DecisionServiceLabelBoundsBehavior, CommandInterceptor);
