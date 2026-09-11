import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import DrdModeler from '../../../helper/DrdModeler';

import decisionServiceInputsXML from '../../../fixtures/dmn/decision-service-inputs-15.dmn';


describe('features/modeling - DMN 1.5 Decision Service inputs', function() {

  let modeler;

  beforeEach(async function() {
    modeler = new DrdModeler({
      container: TestContainer.get(this),
      dmnVersion: '1.5'
    });

    const { warnings } = await modeler.importXML(decisionServiceInputsXML);
    const warningMessages = warnings.map(warning => warning.message).join('\n');

    expect(warnings, warningMessages).to.have.lengthOf(0);
  });

  afterEach(function() {
    modeler.destroy();
  });


  it('should derive inputDecision from a cross-boundary InformationRequirement', function() {
    const activeViewer = modeler.getActiveViewer();
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const eligibility = elementRegistry.get('Decision_Eligibility');
    const routing = elementRegistry.get('Decision_Routing');
    const decisionService = elementRegistry.get('DecisionService_Approval');

    moveRoutingIntoOutput(modeling, routing, decisionService);
    modeling.connect(eligibility, routing);

    expect(referenceHrefs(decisionService.businessObject, 'inputDecision')).to.eql([
      '#Decision_Eligibility'
    ]);
    expect(referenceHrefs(decisionService.businessObject, 'inputData')).to.eql([]);
  });


  it('should derive inputData while keeping internal Decision requirements internal', function() {
    const activeViewer = modeler.getActiveViewer();
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const age = elementRegistry.get('InputData_Age');
    const eligibility = elementRegistry.get('Decision_Eligibility');
    const routing = elementRegistry.get('Decision_Routing');
    const decisionService = elementRegistry.get('DecisionService_Approval');

    moveRoutingIntoOutput(modeling, routing, decisionService);
    moveEligibilityIntoEncapsulated(modeling, eligibility, decisionService);

    modeling.connect(age, eligibility);
    modeling.connect(eligibility, routing);

    expect(referenceHrefs(decisionService.businessObject, 'inputDecision')).to.eql([]);
    expect(referenceHrefs(decisionService.businessObject, 'inputData')).to.eql([
      '#InputData_Age'
    ]);
  });


  it('should reclassify an internal Decision as inputDecision when moved out', function() {
    const activeViewer = modeler.getActiveViewer();
    const canvas = activeViewer.get('canvas');
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const root = canvas.getRootElement();
    const age = elementRegistry.get('InputData_Age');
    const eligibility = elementRegistry.get('Decision_Eligibility');
    const routing = elementRegistry.get('Decision_Routing');
    const decisionService = elementRegistry.get('DecisionService_Approval');

    moveRoutingIntoOutput(modeling, routing, decisionService);
    moveEligibilityIntoEncapsulated(modeling, eligibility, decisionService);

    modeling.connect(age, eligibility);
    modeling.connect(eligibility, routing);

    modeling.moveShape(eligibility, { x: 380, y: 10 }, root);

    expect(referenceHrefs(decisionService.businessObject, 'encapsulatedDecision')).to.eql([]);
    expect(referenceHrefs(decisionService.businessObject, 'inputDecision')).to.eql([
      '#Decision_Eligibility'
    ]);
    expect(referenceHrefs(decisionService.businessObject, 'inputData')).to.eql([]);
  });


  it('should undo and redo derived inputDecision', function() {
    const activeViewer = modeler.getActiveViewer();
    const commandStack = activeViewer.get('commandStack');
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const eligibility = elementRegistry.get('Decision_Eligibility');
    const routing = elementRegistry.get('Decision_Routing');
    const decisionService = elementRegistry.get('DecisionService_Approval');

    moveRoutingIntoOutput(modeling, routing, decisionService);
    modeling.connect(eligibility, routing);

    expect(referenceHrefs(decisionService.businessObject, 'inputDecision')).to.eql([
      '#Decision_Eligibility'
    ]);

    commandStack.undo();

    expect(referenceHrefs(decisionService.businessObject, 'inputDecision')).to.eql([]);

    commandStack.redo();

    expect(referenceHrefs(decisionService.businessObject, 'inputDecision')).to.eql([
      '#Decision_Eligibility'
    ]);
  });


  it('should persist derived inputs on save and reimport', async function() {
    const activeViewer = modeler.getActiveViewer();
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const age = elementRegistry.get('InputData_Age');
    const eligibility = elementRegistry.get('Decision_Eligibility');
    const routing = elementRegistry.get('Decision_Routing');
    const decisionService = elementRegistry.get('DecisionService_Approval');

    moveRoutingIntoOutput(modeling, routing, decisionService);
    moveEligibilityIntoEncapsulated(modeling, eligibility, decisionService);

    modeling.connect(age, eligibility);
    modeling.connect(eligibility, routing);

    const { xml } = await modeler.saveXML({ format: true });
    const { warnings } = await modeler.importXML(xml);
    const warningMessages = warnings.map(warning => warning.message).join('\n');

    expect(warnings, warningMessages).to.have.lengthOf(0);

    const reimportedViewer = modeler.getActiveViewer();
    const reimportedRegistry = reimportedViewer.get('elementRegistry');
    const reimportedService = reimportedRegistry.get('DecisionService_Approval');

    expect(referenceHrefs(reimportedService.businessObject, 'inputDecision')).to.eql([]);
    expect(referenceHrefs(reimportedService.businessObject, 'inputData')).to.eql([
      '#InputData_Age'
    ]);
  });

});


function moveRoutingIntoOutput(modeling, routing, decisionService) {
  modeling.moveShape(routing, { x: -380, y: 10 }, decisionService);
}


function moveEligibilityIntoEncapsulated(modeling, eligibility, decisionService) {
  modeling.moveShape(eligibility, { x: -380, y: -10 }, decisionService);
}


function referenceHrefs(businessObject, property) {
  return businessObject.get(property).map(reference => reference.href);
}
