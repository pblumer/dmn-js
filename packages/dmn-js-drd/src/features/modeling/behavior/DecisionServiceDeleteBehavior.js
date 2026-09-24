import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import { is } from 'dmn-js-shared/lib/util/ModelUtil';

import {
  isDecisionServiceCollapsed
} from '../DecisionServiceUtil';


// Ahead of diagram-js's own delete handler, which takes the children with the
// shape; by the time it looks, there are none.
var HIGH_PRIORITY = 1500;


/**
 * Deleting a Decision Service never takes a Decision with it.
 *
 * "Decision services are defined as overlays and therefore do not encapsulate the
 * decisions within them" (DMN 1.5 §6.2.5). The box is drawn around them and names
 * them; it does not own them. Each one is a DRG element in its own right, drawn by
 * its own DMNShape, required by whatever requires it — Figure 6-9 has a decision
 * outside the box depending on one inside — and it goes on existing when the service
 * that published it does not.
 *
 * diagram-js reads containment the other way round: a shape's children are part of
 * it, so `shape.delete` removes them too. That is right for a BPMN sub-process and
 * wrong here, and the damage is silent — deleting one service took two decisions,
 * their logic and their requirements out of the DRG with it.
 *
 * So the members leave the box before it goes. It is a re-parenting move rather than
 * a detachment, so it is on the command stack and undo puts them back inside the
 * service it restores.
 *
 * A folded service is unfolded first: its members are off the canvas, and deleting
 * the box that is holding their depiction would leave them in the DRG with nothing
 * drawing them and no way back.
 */
export default function DecisionServiceDeleteBehavior(
    injector, canvas, modeling) {
  injector.invoke(CommandInterceptor, this);

  this.preExecute('shape.delete', HIGH_PRIORITY, function(context) {
    var shape = context.shape;

    if (!is(shape, 'dmn:DecisionService')) {
      return;
    }

    if (isDecisionServiceCollapsed(shape)) {
      modeling.collapseDecisionService(shape, false);
    }

    var root = canvas.getRootElement();

    shape.children.slice().forEach(function(child) {
      modeling.moveShape(child, { x: 0, y: 0 }, root);
    });
  }, true);
}

DecisionServiceDeleteBehavior.$inject = [
  'injector',
  'canvas',
  'modeling'
];

inherits(DecisionServiceDeleteBehavior, CommandInterceptor);
