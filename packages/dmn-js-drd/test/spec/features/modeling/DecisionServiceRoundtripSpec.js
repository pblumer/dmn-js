import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import DrdModeler from '../../../helper/DrdModeler';

import decisionServiceXML from '../../../fixtures/dmn/decision-service-temis-15.dmn';


describe('features/modeling - DMN 1.5 Decision Service roundtrip', function() {

  let modeler;

  beforeEach(async function() {
    modeler = new DrdModeler({
      container: TestContainer.get(this),
      dmnVersion: '1.5'
    });

    const { warnings } = await modeler.importXML(decisionServiceXML);
    const warningMessages = warnings.map(warning => warning.message).join('\n');

    expect(warnings, warningMessages).to.have.lengthOf(0);
  });

  afterEach(function() {
    modeler.destroy();
  });


  it('should preserve Temis Decision Service semantics on save and reimport', async function() {
    assertDecisionServices(modeler.getActiveViewer());

    const { xml } = await modeler.saveXML({ format: true });
    const { warnings } = await modeler.importXML(xml);
    const warningMessages = warnings.map(warning => warning.message).join('\n');

    expect(warnings, warningMessages).to.have.lengthOf(0);

    assertDecisionServices(modeler.getActiveViewer());
  });


  it('should preserve membership in another Decision Service when moving a shared Decision', function() {
    const activeViewer = modeler.getActiveViewer();
    const commandStack = activeViewer.get('commandStack');
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const routing = elementRegistry.get('id_route');
    const approval = elementRegistry.get('id_approval');

    modeling.moveShape(routing, { x: 320, y: 0 }, approval);

    assertDecisionServices(activeViewer);

    commandStack.undo();

    assertDecisionServices(activeViewer);

    commandStack.redo();

    assertDecisionServices(activeViewer);
  });

});


function assertDecisionServices(activeViewer) {
  const elementRegistry = activeViewer.get('elementRegistry');
  const approval = elementRegistry.get('id_approval');
  const routingOnly = elementRegistry.get('id_routeonly');

  expect(referenceHrefs(approval, 'outputDecision')).to.eql([ '#id_route' ]);
  expect(referenceHrefs(approval, 'encapsulatedDecision')).to.eql([ '#id_elig' ]);
  expect(referenceHrefs(approval, 'inputDecision')).to.eql([]);
  expect(referenceHrefs(approval, 'inputData')).to.eql([ '#id_age' ]);

  expect(referenceHrefs(routingOnly, 'outputDecision')).to.eql([ '#id_route' ]);
  expect(referenceHrefs(routingOnly, 'encapsulatedDecision')).to.eql([]);
  expect(referenceHrefs(routingOnly, 'inputDecision')).to.eql([ '#id_elig' ]);
  expect(referenceHrefs(routingOnly, 'inputData')).to.eql([]);
}

function referenceHrefs(decisionService, property) {
  return decisionService.businessObject.get(property)
    .map(reference => reference.href);
}
