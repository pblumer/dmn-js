import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import { is } from 'dmn-js-shared/lib/util/ModelUtil';

import {
  translateFoldedDepiction
} from '../cmd/CollapseDecisionServiceHandler';


/**
 * A folded Decision Service takes its decisions along when it is dragged.
 *
 * An unfolded one needs nobody's help: its members are its children, and diagram-js
 * moves a shape's children with it. A folded one has none — its members are off the
 * canvas, parked in a record on the shape together with the bounds and divider the
 * box is restored to — so a drag moves the box and nothing else. Unfolding then puts
 * all of it back where it was folded, and the drag reads as if it never happened.
 *
 * So the record is dragged too, by the same delta, which is what a collapsed
 * sub-process does with its contents.
 *
 * On both sides of the command, so undo takes it back rather than leaving the
 * decisions a screen away from the box they belong to.
 */
export default function CollapsedDecisionServiceMoveBehavior(injector) {
  injector.invoke(CommandInterceptor, this);

  function carry(sign) {
    return function(context) {
      var shape = context.shape,
          delta = context.delta;

      if (!is(shape, 'dmn:DecisionService') || !delta) {
        return;
      }

      translateFoldedDepiction(shape, {
        x: delta.x * sign,
        y: delta.y * sign
      });
    };
  }

  this.executed('shape.move', carry(1), true);
  this.reverted('shape.move', carry(-1), true);
}

CollapsedDecisionServiceMoveBehavior.$inject = [ 'injector' ];

inherits(CollapsedDecisionServiceMoveBehavior, CommandInterceptor);
