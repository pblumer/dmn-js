import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import DrdModeler from '../../../helper/DrdModeler';

import decisionServiceImportedMembershipXML from '../../../fixtures/dmn/decision-service-imported-membership-15.dmn';
import decisionServiceImportedMismatchedMembershipXML from '../../../fixtures/dmn/decision-service-imported-mismatched-membership-15.dmn';
import decisionServiceMembershipXML from '../../../fixtures/dmn/decision-service-membership-15.dmn';


describe('features/modeling - DMN 1.5 Decision Service divider', function() {

  let modeler;

  beforeEach(async function() {
    modeler = new DrdModeler({
      container: TestContainer.get(this),
      dmnVersion: '1.5'
    });

    const { warnings } = await modeler.importXML(decisionServiceMembershipXML);
    const warningMessages = warnings.map(warning => warning.message).join('\n');

    expect(warnings, warningMessages).to.have.lengthOf(0);
  });

  afterEach(function() {
    modeler.destroy();
  });


  it('should update divider position with undo and redo', function() {
    const activeViewer = modeler.getActiveViewer();
    const commandStack = activeViewer.get('commandStack');
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const decisionService = elementRegistry.get('DecisionService_Approval');

    modeling.updateDecisionServiceDivider(decisionService, 260);

    expect(dividerWaypoints(decisionService)).to.eql([
      { x: 100, y: 260 },
      { x: 400, y: 260 }
    ]);

    commandStack.undo();

    expect(dividerWaypoints(decisionService)).to.eql([
      { x: 100, y: 200 },
      { x: 400, y: 200 }
    ]);

    commandStack.redo();

    expect(dividerWaypoints(decisionService)).to.eql([
      { x: 100, y: 260 },
      { x: 400, y: 260 }
    ]);
  });


  it('should reclassify Decisions when moving the divider', function() {
    const activeViewer = modeler.getActiveViewer();
    const commandStack = activeViewer.get('commandStack');
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const output = elementRegistry.get('Decision_Output');
    const encapsulated = elementRegistry.get('Decision_Encapsulated');
    const decisionService = elementRegistry.get('DecisionService_Approval');

    modeling.moveShape(output, { x: -340, y: 0 }, decisionService);
    modeling.moveShape(encapsulated, { x: -340, y: -20 }, decisionService);

    expect(referenceHrefs(decisionService, 'outputDecision')).to.eql([
      '#Decision_Output'
    ]);
    expect(referenceHrefs(decisionService, 'encapsulatedDecision')).to.eql([
      '#Decision_Encapsulated'
    ]);

    modeling.updateDecisionServiceDivider(decisionService, 280);

    expect(referenceHrefs(decisionService, 'outputDecision')).to.eql([
      '#Decision_Output',
      '#Decision_Encapsulated'
    ]);
    expect(referenceHrefs(decisionService, 'encapsulatedDecision')).to.eql([]);

    commandStack.undo();

    expect(referenceHrefs(decisionService, 'outputDecision')).to.eql([
      '#Decision_Output'
    ]);
    expect(referenceHrefs(decisionService, 'encapsulatedDecision')).to.eql([
      '#Decision_Encapsulated'
    ]);

    commandStack.redo();

    expect(referenceHrefs(decisionService, 'outputDecision')).to.eql([
      '#Decision_Output',
      '#Decision_Encapsulated'
    ]);
    expect(referenceHrefs(decisionService, 'encapsulatedDecision')).to.eql([]);
  });


  it('should reclassify imported semantic members when moving the divider', async function() {
    const { warnings } = await modeler.importXML(decisionServiceImportedMembershipXML);
    const warningMessages = warnings.map(warning => warning.message).join('\n');

    expect(warnings, warningMessages).to.have.lengthOf(0);

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

    modeling.updateDecisionServiceDivider(decisionService, 280);

    expect(referenceHrefs(decisionService, 'outputDecision')).to.eql([
      '#Decision_Output',
      '#Decision_Encapsulated'
    ]);
    expect(referenceHrefs(decisionService, 'encapsulatedDecision')).to.eql([]);

    commandStack.undo();

    expect(referenceHrefs(decisionService, 'outputDecision')).to.eql([
      '#Decision_Output'
    ]);
    expect(referenceHrefs(decisionService, 'encapsulatedDecision')).to.eql([
      '#Decision_Encapsulated'
    ]);

    commandStack.redo();

    expect(referenceHrefs(decisionService, 'outputDecision')).to.eql([
      '#Decision_Output',
      '#Decision_Encapsulated'
    ]);
    expect(referenceHrefs(decisionService, 'encapsulatedDecision')).to.eql([]);
  });


  it('should restore exact imported semantic membership on divider undo', async function() {
    const { warnings } = await modeler.importXML(decisionServiceImportedMismatchedMembershipXML);
    const warningMessages = warnings.map(warning => warning.message).join('\n');

    expect(warnings, warningMessages).to.have.lengthOf(0);

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

    modeling.updateDecisionServiceDivider(decisionService, 280);

    expect(referenceHrefs(decisionService, 'outputDecision')).to.eql([
      '#Decision_Output',
      '#Decision_Encapsulated'
    ]);
    expect(referenceHrefs(decisionService, 'encapsulatedDecision')).to.eql([]);

    commandStack.undo();

    expect(referenceHrefs(decisionService, 'outputDecision')).to.eql([
      '#Decision_Output'
    ]);
    expect(referenceHrefs(decisionService, 'encapsulatedDecision')).to.eql([
      '#Decision_Encapsulated'
    ]);

    commandStack.redo();

    expect(referenceHrefs(decisionService, 'outputDecision')).to.eql([
      '#Decision_Output',
      '#Decision_Encapsulated'
    ]);
    expect(referenceHrefs(decisionService, 'encapsulatedDecision')).to.eql([]);
  });


  it('should reclassify Decisions when resize moves the divider', function() {
    const activeViewer = modeler.getActiveViewer();
    const commandStack = activeViewer.get('commandStack');
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const output = elementRegistry.get('Decision_Output');
    const encapsulated = elementRegistry.get('Decision_Encapsulated');
    const decisionService = elementRegistry.get('DecisionService_Approval');

    modeling.moveShape(output, { x: -340, y: 0 }, decisionService);
    modeling.moveShape(encapsulated, { x: -340, y: -20 }, decisionService);

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


  it('should persist divider position on save and reimport', async function() {
    const activeViewer = modeler.getActiveViewer();
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const decisionService = elementRegistry.get('DecisionService_Approval');

    modeling.updateDecisionServiceDivider(decisionService, 260);

    const { xml } = await modeler.saveXML({ format: true });
    const { warnings } = await modeler.importXML(xml);
    const warningMessages = warnings.map(warning => warning.message).join('\n');

    expect(warnings, warningMessages).to.have.lengthOf(0);

    const reimportedViewer = modeler.getActiveViewer();
    const reimportedRegistry = reimportedViewer.get('elementRegistry');
    const reimportedService = reimportedRegistry.get('DecisionService_Approval');

    expect(dividerWaypoints(reimportedService)).to.eql([
      { x: 100, y: 260 },
      { x: 400, y: 260 }
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
