import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import DrdModeler from '../../../helper/DrdModeler';

import decisionServiceImportedMismatchedMembershipXML from '../../../fixtures/dmn/decision-service-imported-mismatched-membership-15.dmn';


describe('features/modeling - DMN 1.5 Decision Service divider resize undo', function() {

  let modeler;

  beforeEach(async function() {
    modeler = new DrdModeler({
      container: TestContainer.get(this),
      dmnVersion: '1.5'
    });

    const { warnings } = await modeler.importXML(decisionServiceImportedMismatchedMembershipXML);
    const warningMessages = warnings.map(warning => warning.message).join('\n');

    expect(warnings, warningMessages).to.have.lengthOf(0);
  });

  afterEach(function() {
    modeler.destroy();
  });


  it('should restore exact imported semantic membership on resize undo', function() {
    const activeViewer = modeler.getActiveViewer();
    const commandStack = activeViewer.get('commandStack');
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const decisionService = elementRegistry.get('DecisionService_Approval');

    expect(referenceHrefs(decisionService, 'outputDecision')).to.eql([
      '#Decision_Output'
    ]);
    expect(referenceHrefs(decisionService, 'encapsulatedDecision')).to.eql([
      '#Decision_Encapsulated'
    ]);

    modeling.resizeShape(decisionService, {
      x: 100,
      y: 80,
      width: 300,
      height: 70
    });

    expect(dividerWaypoints(decisionService)).to.eql([
      { x: 100, y: 130 },
      { x: 400, y: 130 }
    ]);
    expect(referenceHrefs(decisionService, 'outputDecision')).to.eql([]);
    expect(referenceHrefs(decisionService, 'encapsulatedDecision')).to.eql([
      '#Decision_Output',
      '#Decision_Encapsulated'
    ]);

    commandStack.undo();

    expect(dividerWaypoints(decisionService)).to.eql([
      { x: 100, y: 200 },
      { x: 400, y: 200 }
    ]);
    expect(referenceHrefs(decisionService, 'outputDecision')).to.eql([
      '#Decision_Output'
    ]);
    expect(referenceHrefs(decisionService, 'encapsulatedDecision')).to.eql([
      '#Decision_Encapsulated'
    ]);

    commandStack.redo();

    expect(dividerWaypoints(decisionService)).to.eql([
      { x: 100, y: 130 },
      { x: 400, y: 130 }
    ]);
    expect(referenceHrefs(decisionService, 'outputDecision')).to.eql([]);
    expect(referenceHrefs(decisionService, 'encapsulatedDecision')).to.eql([
      '#Decision_Output',
      '#Decision_Encapsulated'
    ]);
  });

});


function dividerWaypoints(decisionService) {
  return decisionService.businessObject.di
    .get('decisionServiceDividerLine')
    .waypoint
    .map(waypoint => ({ x: waypoint.x, y: waypoint.y }));
}

function referenceHrefs(decisionService, property) {
  return decisionService.businessObject.get(property)
    .map(reference => reference.href);
}
