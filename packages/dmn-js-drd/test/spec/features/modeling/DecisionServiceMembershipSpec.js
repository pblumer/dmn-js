import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import DrdModeler from '../../../helper/DrdModeler';

import decisionServiceMembershipXML from '../../../fixtures/dmn/decision-service-membership-15.dmn';


describe('features/modeling - DMN 1.5 Decision Service membership', function() {

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


  it('should assign a Decision to outputDecision when moved into the output compartment', function() {
    const activeViewer = modeler.getActiveViewer();
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const decision = elementRegistry.get('Decision_Output');
    const decisionService = elementRegistry.get('DecisionService_Approval');

    modeling.moveShape(decision, { x: -340, y: 0 });

    expect(referenceHrefs(decisionService.businessObject, 'outputDecision')).to.eql([
      '#Decision_Output'
    ]);
    expect(referenceHrefs(decisionService.businessObject, 'encapsulatedDecision')).to.eql([]);
    expect(decision.businessObject.$parent).to.eql(decisionService.businessObject.$parent);
  });


  it('should assign a Decision to encapsulatedDecision when moved into the encapsulated compartment', function() {
    const activeViewer = modeler.getActiveViewer();
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const decision = elementRegistry.get('Decision_Encapsulated');
    const decisionService = elementRegistry.get('DecisionService_Approval');

    modeling.moveShape(decision, { x: -340, y: -20 });

    expect(referenceHrefs(decisionService.businessObject, 'outputDecision')).to.eql([]);
    expect(referenceHrefs(decisionService.businessObject, 'encapsulatedDecision')).to.eql([
      '#Decision_Encapsulated'
    ]);
    expect(decision.businessObject.$parent).to.eql(decisionService.businessObject.$parent);
  });


  it('should undo and redo Decision Service membership with the shape move', function() {
    const activeViewer = modeler.getActiveViewer();
    const commandStack = activeViewer.get('commandStack');
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const decision = elementRegistry.get('Decision_Output');
    const decisionService = elementRegistry.get('DecisionService_Approval');

    modeling.moveShape(decision, { x: -340, y: 0 });

    expect(referenceHrefs(decisionService.businessObject, 'outputDecision')).to.eql([
      '#Decision_Output'
    ]);

    commandStack.undo();

    expect(referenceHrefs(decisionService.businessObject, 'outputDecision')).to.eql([]);

    commandStack.redo();

    expect(referenceHrefs(decisionService.businessObject, 'outputDecision')).to.eql([
      '#Decision_Output'
    ]);
  });


  it('should allow resizing a Decision Service', function() {
    const activeViewer = modeler.getActiveViewer();
    const elementRegistry = activeViewer.get('elementRegistry');
    const rules = activeViewer.get('rules');

    expect(rules.allowed('shape.resize', {
      shape: elementRegistry.get('DecisionService_Approval')
    })).to.equal(true);
  });

});


function referenceHrefs(businessObject, property) {
  return businessObject.get(property).map(reference => reference.href);
}
