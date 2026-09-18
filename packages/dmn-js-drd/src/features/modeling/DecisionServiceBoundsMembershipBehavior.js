import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import { is } from 'dmn-js-shared/lib/util/ModelUtil';


var RESTORE_PRIORITY = 500;


/**
 * Preserves the exact semantic Decision Service membership across bounds undo.
 *
 * Bounds updates reclassify members from their restored geometry. Imported DMN
 * may intentionally carry a semantic membership that does not match that
 * geometry, so undo must restore the original references after DrdUpdater ran.
 */
export default function DecisionServiceBoundsMembershipBehavior(
    drdUpdater,
    injector
) {
  injector.invoke(CommandInterceptor, this);

  this.preExecute([ 'shape.move', 'shape.resize' ], function(context) {
    var shape = context.shape;

    if (!is(shape, 'dmn:DecisionService') ||
        context.oldDecisionServiceMembershipSnapshot) {
      return;
    }

    context.oldDecisionServiceMembershipSnapshot =
      drdUpdater.getDecisionServiceMembershipSnapshot(shape);
  }, true);

  this.reverted(
    [ 'shape.move', 'shape.resize' ],
    RESTORE_PRIORITY,
    function(context) {
      var shape = context.shape;

      if (!is(shape, 'dmn:DecisionService')) {
        return;
      }

      drdUpdater.restoreDecisionServiceMembershipSnapshot(
        shape,
        context.oldDecisionServiceMembershipSnapshot
      );
    },
    true
  );
}

DecisionServiceBoundsMembershipBehavior.$inject = [
  'drdUpdater',
  'injector'
];

inherits(DecisionServiceBoundsMembershipBehavior, CommandInterceptor);
