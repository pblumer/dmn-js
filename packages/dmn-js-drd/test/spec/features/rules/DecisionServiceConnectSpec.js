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

});
