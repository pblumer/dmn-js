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


  it('should allow moving a Decision onto a Decision Service', function() {
    const activeViewer = modeler.getActiveViewer();
    const drdRules = activeViewer.get('drdRules');
    const elementRegistry = activeViewer.get('elementRegistry');

    const decision = elementRegistry.get('Decision_Output');
    const decisionService = elementRegistry.get('DecisionService_Approval');

    expect(drdRules.canMove(decision, decisionService)).to.equal(true);
  });


  it('should assign a Decision to outputDecision when moved into the output compartment', function() {
    const activeViewer = modeler.getActiveViewer();
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const decision = elementRegistry.get('Decision_Output');
    const decisionService = elementRegistry.get('DecisionService_Approval');

    modeling.moveShape(decision, { x: -340, y: 0 }, decisionService);

    expect(referenceHrefs(decisionService.businessObject, 'outputDecision')).to.eql([
      '#Decision_Output'
    ]);
    expect(referenceHrefs(decisionService.businessObject, 'encapsulatedDecision')).to.eql([]);
    expect(decision.parent).to.eql(decisionService);
    expect(decision.businessObject.$parent).to.eql(decisionService.businessObject.$parent);
  });


  it('should assign a Decision to encapsulatedDecision when moved into the encapsulated compartment', function() {
    const activeViewer = modeler.getActiveViewer();
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const decision = elementRegistry.get('Decision_Encapsulated');
    const decisionService = elementRegistry.get('DecisionService_Approval');

    modeling.moveShape(decision, { x: -340, y: -20 }, decisionService);

    expect(referenceHrefs(decisionService.businessObject, 'outputDecision')).to.eql([]);
    expect(referenceHrefs(decisionService.businessObject, 'encapsulatedDecision')).to.eql([
      '#Decision_Encapsulated'
    ]);
    expect(decision.parent).to.eql(decisionService);
    expect(decision.businessObject.$parent).to.eql(decisionService.businessObject.$parent);
  });


  it('should undo and redo Decision Service membership with the shape move', function() {
    const activeViewer = modeler.getActiveViewer();
    const canvas = activeViewer.get('canvas');
    const commandStack = activeViewer.get('commandStack');
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const decision = elementRegistry.get('Decision_Output');
    const decisionService = elementRegistry.get('DecisionService_Approval');
    const root = canvas.getRootElement();

    modeling.moveShape(decision, { x: -340, y: 0 }, decisionService);

    expect(referenceHrefs(decisionService.businessObject, 'outputDecision')).to.eql([
      '#Decision_Output'
    ]);
    expect(decision.parent).to.eql(decisionService);

    commandStack.undo();

    expect(referenceHrefs(decisionService.businessObject, 'outputDecision')).to.eql([]);
    expect(decision.parent).to.eql(root);

    commandStack.redo();

    expect(referenceHrefs(decisionService.businessObject, 'outputDecision')).to.eql([
      '#Decision_Output'
    ]);
    expect(decision.parent).to.eql(decisionService);
  });


  it('should persist Decision Service membership on save and reimport', async function() {
    const activeViewer = modeler.getActiveViewer();
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const output = elementRegistry.get('Decision_Output');
    const encapsulated = elementRegistry.get('Decision_Encapsulated');
    const decisionService = elementRegistry.get('DecisionService_Approval');

    modeling.moveShape(output, { x: -340, y: 0 }, decisionService);
    modeling.moveShape(encapsulated, { x: -340, y: -20 }, decisionService);

    const { xml } = await modeler.saveXML({ format: true });
    const { warnings } = await modeler.importXML(xml);
    const warningMessages = warnings.map(warning => warning.message).join('\n');

    expect(warnings, warningMessages).to.have.lengthOf(0);

    const reimportedViewer = modeler.getActiveViewer();
    const reimportedRegistry = reimportedViewer.get('elementRegistry');
    const reimportedService = reimportedRegistry.get('DecisionService_Approval');

    expect(referenceHrefs(reimportedService.businessObject, 'outputDecision')).to.eql([
      '#Decision_Output'
    ]);
    expect(referenceHrefs(reimportedService.businessObject, 'encapsulatedDecision')).to.eql([
      '#Decision_Encapsulated'
    ]);
  });


  it('should reassign a Decision when the divider line moves past it on resize', function() {
    const activeViewer = modeler.getActiveViewer();
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const decision = elementRegistry.get('Decision_Output');
    const decisionService = elementRegistry.get('DecisionService_Approval');

    modeling.moveShape(decision, { x: -340, y: 0 }, decisionService);

    expect(referenceHrefs(decisionService.businessObject, 'outputDecision')).to.eql([
      '#Decision_Output'
    ]);

    // when
    // shrinking moves the divider line to y=128, above the Decision's center
    modeling.resizeShape(decisionService, {
      x: 100, y: 80, width: 300, height: 80
    });

    // then
    expect(dividerY(decisionService)).to.be.below(decision.y + decision.height / 2);

    expect(referenceHrefs(decisionService.businessObject, 'outputDecision')).to.eql([]);
    expect(referenceHrefs(decisionService.businessObject, 'encapsulatedDecision')).to.eql([
      '#Decision_Output'
    ]);
  });


  it('should keep membership when the divider line does not move past a Decision', function() {
    const activeViewer = modeler.getActiveViewer();
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const decision = elementRegistry.get('Decision_Output');
    const decisionService = elementRegistry.get('DecisionService_Approval');

    modeling.moveShape(decision, { x: -340, y: 0 }, decisionService);

    // when
    modeling.resizeShape(decisionService, {
      x: 100, y: 80, width: 400, height: 240
    });

    // then
    expect(referenceHrefs(decisionService.businessObject, 'outputDecision')).to.eql([
      '#Decision_Output'
    ]);
    expect(referenceHrefs(decisionService.businessObject, 'encapsulatedDecision')).to.eql([]);
  });


  it('should undo and redo Decision Service membership with the shape resize', function() {
    const activeViewer = modeler.getActiveViewer();
    const commandStack = activeViewer.get('commandStack');
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const decision = elementRegistry.get('Decision_Output');
    const decisionService = elementRegistry.get('DecisionService_Approval');

    modeling.moveShape(decision, { x: -340, y: 0 }, decisionService);

    modeling.resizeShape(decisionService, {
      x: 100, y: 80, width: 300, height: 80
    });

    expect(referenceHrefs(decisionService.businessObject, 'encapsulatedDecision')).to.eql([
      '#Decision_Output'
    ]);

    // when
    commandStack.undo();

    // then
    expect(referenceHrefs(decisionService.businessObject, 'outputDecision')).to.eql([
      '#Decision_Output'
    ]);
    expect(referenceHrefs(decisionService.businessObject, 'encapsulatedDecision')).to.eql([]);

    // when
    commandStack.redo();

    // then
    expect(referenceHrefs(decisionService.businessObject, 'outputDecision')).to.eql([]);
    expect(referenceHrefs(decisionService.businessObject, 'encapsulatedDecision')).to.eql([
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

function dividerY(decisionServiceShape) {
  const divider = decisionServiceShape.businessObject.di
    .get('decisionServiceDividerLine');

  return divider.get('waypoint')[0].y;
}
