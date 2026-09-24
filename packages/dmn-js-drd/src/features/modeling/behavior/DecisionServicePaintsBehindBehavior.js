import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import { is } from 'dmn-js-shared/lib/util/ModelUtil';


/**
 * A Decision Service is drawn around things, never over them.
 *
 * The box is a background: DMN 1.5 §6.2.5 has it enclosing the decisions it names,
 * and the paragraph under Figure 6-9 has requirements crossing its border freely,
 * which only reads as a diagram if the border is behind them.
 *
 * diagram-js paints in document order and appends what is added last, so an author
 * who draws the requirement first and the box afterwards — which is the order a
 * diagram is usually built in — gets a box laid over that requirement, and the
 * arrow simply disappears inside it. Importing is unaffected: DrdImporter adds every
 * Decision Service before the rest of the DRG, so a stored diagram already draws in
 * this order. Only drawing one by hand did not.
 *
 * So a service goes to the front of its siblings, which is the back of the picture.
 * Its own members are unaffected: they are its children and are drawn inside its
 * group, above the box, which is what the container is for.
 *
 * On a move as well as on a create, because a move is the other way a service ends
 * up on top: diagram-js moves a shape by taking it out of its parent's children and
 * putting it back, and putting it back with no index asked for means at the end
 * (MoveShapeHandler). A service that was drawn behind a requirement therefore paints
 * over it as soon as it is dragged a pixel, and the arrow disappears inside the box.
 */
export default function DecisionServicePaintsBehindBehavior(injector) {
  injector.invoke(CommandInterceptor, this);

  this.preExecute('shape.create', function(context) {
    if (!is(context.shape, 'dmn:DecisionService')) {
      return;
    }

    // Only when nobody has asked for a particular place, so this stays a default
    // rather than something that overrules a caller who knows better.
    if (context.parentIndex === undefined) {
      context.parentIndex = 0;
    }
  }, true);

  this.preExecute('shape.move', function(context) {
    if (!is(context.shape, 'dmn:DecisionService')) {
      return;
    }

    if (context.newParentIndex === undefined) {
      context.newParentIndex = 0;
    }
  }, true);
}

DecisionServicePaintsBehindBehavior.$inject = [ 'injector' ];

inherits(DecisionServicePaintsBehindBehavior, CommandInterceptor);
