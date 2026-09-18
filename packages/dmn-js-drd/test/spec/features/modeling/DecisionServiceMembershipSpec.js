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


  it('should preserve a custom divider position when moving a Decision Service', function() {
    const activeViewer = modeler.getActiveViewer();
    const commandStack = activeViewer.get('commandStack');
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const decisionService = elementRegistry.get('DecisionService_Approval');

    expect(dividerWaypoints(decisionService)).to.eql([
      { x: 100, y: 200 },
      { x: 400, y: 200 }
    ]);

    modeling.moveShape(decisionService, { x: 40, y: 30 });

    expect(dividerWaypoints(decisionService)).to.eql([
      { x: 140, y: 230 },
      { x: 440, y: 230 }
    ]);

    commandStack.undo();

    expect(dividerWaypoints(decisionService)).to.eql([
      { x: 100, y: 200 },
      { x: 400, y: 200 }
    ]);

    commandStack.redo();

    expect(dividerWaypoints(decisionService)).to.eql([
      { x: 140, y: 230 },
      { x: 440, y: 230 }
    ]);
  });


  it('should preserve divider Y when resizing the lower and right edges', function() {
    const activeViewer = modeler.getActiveViewer();
    const commandStack = activeViewer.get('commandStack');
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const decisionService = elementRegistry.get('DecisionService_Approval');

    modeling.resizeShape(decisionService, {
      x: 100,
      y: 80,
      width: 360,
      height: 300
    });

    expect(dividerWaypoints(decisionService)).to.eql([
      { x: 100, y: 200 },
      { x: 460, y: 200 }
    ]);

    commandStack.undo();

    expect(dividerWaypoints(decisionService)).to.eql([
      { x: 100, y: 200 },
      { x: 400, y: 200 }
    ]);

    commandStack.redo();

    expect(dividerWaypoints(decisionService)).to.eql([
      { x: 100, y: 200 },
      { x: 460, y: 200 }
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

function dividerWaypoints(decisionService) {
  return decisionService.businessObject.di
    .get('decisionServiceDividerLine')
    .waypoint
    .map(waypoint => ({ x: waypoint.x, y: waypoint.y }));
}
