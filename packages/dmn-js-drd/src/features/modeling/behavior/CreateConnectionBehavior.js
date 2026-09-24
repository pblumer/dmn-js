import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import { is } from 'dmn-js-shared/lib/util/ModelUtil';


/**
 * Creates DMN-specific refs for new connection.
 *
 * @param {DrdFactory} drdFactory
 * @param {Injector} injector
 */
export default function CreateConnectionBehavior(drdFactory, injector) {
  injector.invoke(CommandInterceptor, this);

  this.preExecute('connection.create', function(context) {
    var connection = context.connection,
        connectionBo = connection.businessObject,
        source = context.source,
        target = context.target,
        elementRef,
        sourceRef,
        targetRef;

    if (is(connection, 'dmn:Association')) {
      sourceRef = connectionBo.sourceRef = drdFactory
        .create('dmn:DMNElementReference', {
          href: '#' + source.id
        });

      sourceRef.$parent = connectionBo;

      targetRef = connectionBo.targetRef = drdFactory
        .create('dmn:DMNElementReference', {
          href: '#' + target.id
        });

      targetRef.$parent = connectionBo;
    } else {
      var property = getRequirementProperty(source);

      // Nothing else is a requirement, and writing `requiredundefined` onto the
      // business object rather than saying so is how a drawable edge became an
      // unsaveable model.
      if (!property) {
        throw new Error(
          'no requirement property for source <' + source.businessObject.$type + '>'
        );
      }

      elementRef = connectionBo[ property ] = drdFactory
        .create('dmn:DMNElementReference', {
          href: '#' + source.id
        });

      elementRef.$parent = connectionBo;
    }
  }, true);

}

CreateConnectionBehavior.$inject = [
  'drdFactory',
  'injector'
];

inherits(CreateConnectionBehavior, CommandInterceptor);


// helpers //////////

/**
 * Which reference on the requirement points back at what it requires.
 *
 * A Decision Service is an Invocable, exactly as a Business Knowledge Model is —
 * KnowledgeRequirement#requiredKnowledge is typed to Invocable and DMN 1.5's
 * requirement table gives the pair two rows, one drawing the service expanded and
 * one drawing it collapsed. It was missing here, so a knowledge requirement drawn
 * from a service was created with no `requiredKnowledge` at all: the arrow appeared,
 * the rules allowed it, and the saved model had a requirement that required nothing.
 */
function getRequirementProperty(source) {
  if (is(source, 'dmn:Invocable')) {
    return 'requiredKnowledge';
  } else if (is(source, 'dmn:Decision')) {
    return 'requiredDecision';
  } else if (is(source, 'dmn:InputData')) {
    return 'requiredInput';
  } else if (is(source, 'dmn:KnowledgeSource')) {
    return 'requiredAuthority';
  }
}
