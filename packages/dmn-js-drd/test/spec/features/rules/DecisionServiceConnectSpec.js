import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import DrdModeler from '../../../helper/DrdModeler';

import connectXML from '../../../fixtures/dmn/decision-service-connect-15.dmn';


/**
 * What may run to and from a decision service, held as one table.
 *
 * A decision service is an Invocable, which is what DMN's
 * KnowledgeRequirement#requiredKnowledge points at - the same place a business
 * knowledge model sits. So a decision invokes a service exactly as it invokes a
 * knowledge model, through a knowledge requirement, and the editor has to let that be
 * drawn. It did not: a model that already said so imported and drew correctly, but
 * the connection could not be made by hand, which made the service a box you could
 * publish and never wire up.
 *
 * Nothing else reaches a decision service. It requires nothing itself - its decisions
 * are its members, not its requirements - so every other pair below is refused, and
 * the refusals are as much the table as the one allowed row is.
 *
 * DrdRulesSpec holds the same table for the elements that are not services.
 */
describe('features/rules - DMN 1.5 Decision Service connections', function() {

  let modeler, viewer;

  beforeEach(async function() {
    modeler = new DrdModeler({
      container: TestContainer.get(this),
      dmnVersion: '1.5'
    });

    const { warnings } = await modeler.importXML(connectXML);

    expect(warnings.map(warning => warning.message).join('\n')).to.eql('');

    viewer = modeler.getActiveViewer();
  });

  afterEach(function() {
    modeler && modeler.destroy();

    modeler = viewer = null;
  });


  const CONNECTIONS = [
    {
      what: 'a decision invokes a service',
      source: 'DecisionService_Rating',
      target: 'Decision_Outside',
      expected: { type: 'dmn:KnowledgeRequirement' }
    },
    {
      what: 'a knowledge model invokes a service',
      source: 'DecisionService_Rating',
      target: 'BKM_Instalment',
      expected: { type: 'dmn:KnowledgeRequirement' }
    },
    {
      what: 'a service is annotated',
      source: 'DecisionService_Rating',
      target: 'TextAnnotation_Note',
      expected: { type: 'dmn:Association' }
    },
    {
      what: 'an annotation points at a service',
      source: 'TextAnnotation_Note',
      target: 'DecisionService_Rating',
      expected: { type: 'dmn:Association' }
    },
    {

      // the service invoking itself: no position on the canvas makes that mean
      // anything, so it is refused wherever the decision is drawn
      what: 'a service invokes one of its own decisions',
      source: 'DecisionService_Rating',
      target: 'Decision_Member',
      expected: false
    },
    {
      what: 'a service supplies input data',
      source: 'DecisionService_Rating',
      target: 'InputData_Amount',
      expected: false
    },
    {
      what: 'a service is an authority',
      source: 'DecisionService_Rating',
      target: 'KnowledgeSource_Policy',
      expected: false
    },
    {

      // a service requires nothing: its decisions do the requiring, each in its
      // own right
      what: 'a decision is required by a service',
      source: 'Decision_Outside',
      target: 'DecisionService_Rating',
      expected: false
    },
    {
      what: 'input data is required by a service',
      source: 'InputData_Amount',
      target: 'DecisionService_Rating',
      expected: false
    },
    {
      what: 'a knowledge source authorises a service',
      source: 'KnowledgeSource_Policy',
      target: 'DecisionService_Rating',
      expected: false
    },
    {
      what: 'a service requires itself',
      source: 'DecisionService_Rating',
      target: 'DecisionService_Rating',
      expected: false
    }
  ];

  CONNECTIONS.forEach(function(row) {

    it('should ' + (row.expected ? 'draw' : 'refuse') + ' ' + row.what,
      function() {

        // given
        const elementRegistry = viewer.get('elementRegistry');

        // when
        const allowed = viewer.get('drdRules').canConnect(
          elementRegistry.get(row.source),
          elementRegistry.get(row.target)
        );

        // then
        expect(allowed).to.eql(row.expected);
      });

  });


  [
    [ 'a decision', 'Decision_Outside' ],
    [ 'a knowledge model', 'BKM_Instalment' ]
  ].forEach(function([ what, id ]) {

    it('should say what ' + what + ' invoking a service requires', function() {

      // given
      const elementRegistry = viewer.get('elementRegistry');

      // when
      viewer.get('modeling').connect(
        elementRegistry.get('DecisionService_Rating'),
        elementRegistry.get(id),
        { type: 'dmn:KnowledgeRequirement' }
      );

      // then
      expect(elementRegistry.get(id).businessObject
        .get('knowledgeRequirement')
        .map(requirement => requirement.get('requiredKnowledge').href))
        .to.eql([ '#DecisionService_Rating' ]);
    });

  });


  // DMN 1.5's requirement table gives the two invocations above two rows each: one
  // drawing the service expanded, one drawing it collapsed with the fold marker.
  // A folded service is the same Invocable — folding hides its definition, not what
  // it is — so both are drawn the same way and both must still be drawable.
  describe('while the service is folded away', function() {

    beforeEach(function() {
      viewer.get('modeling').collapseDecisionService(
        viewer.get('elementRegistry').get('DecisionService_Rating'), true
      );
    });


    it('should still let a decision invoke it', function() {

      // given
      const elementRegistry = viewer.get('elementRegistry');

      // when
      const allowed = viewer.get('drdRules').canConnect(
        elementRegistry.get('DecisionService_Rating'),
        elementRegistry.get('Decision_Outside')
      );

      // then
      expect(allowed).to.eql({ type: 'dmn:KnowledgeRequirement' });
    });


    it('should still let a knowledge model invoke it', function() {

      // given
      const elementRegistry = viewer.get('elementRegistry');

      // when
      const allowed = viewer.get('drdRules').canConnect(
        elementRegistry.get('DecisionService_Rating'),
        elementRegistry.get('BKM_Instalment')
      );

      // then
      expect(allowed).to.eql({ type: 'dmn:KnowledgeRequirement' });
    });


    it('should draw one, and keep it when the service is unfolded',
      function() {

        // given
        const elementRegistry = viewer.get('elementRegistry'),
              modeling = viewer.get('modeling');

        // when
        const connection = modeling.connect(
          elementRegistry.get('DecisionService_Rating'),
          elementRegistry.get('Decision_Outside'),
          { type: 'dmn:KnowledgeRequirement' }
        );

        // then
        expect(connection).to.exist;
        expect(elementRegistry.get('DecisionService_Rating')
          .outgoing.map(edge => edge.id)).to.include(connection.id);

        // and it says what it requires. A Decision Service is an Invocable, which is
        // what KnowledgeRequirement#requiredKnowledge is typed to; without that the
        // arrow appeared and the saved model carried a requirement requiring nothing
        expect(elementRegistry.get('Decision_Outside').businessObject
          .get('knowledgeRequirement')
          .map(requirement => requirement.get('requiredKnowledge').href))
          .to.eql([ '#DecisionService_Rating' ]);

        modeling.collapseDecisionService(
          elementRegistry.get('DecisionService_Rating'), false
        );

        expect(elementRegistry.get(connection.id)).to.exist;
        expect(elementRegistry.get(connection.id).source)
          .to.equal(elementRegistry.get('DecisionService_Rating'));
      }
    );

  });

});
