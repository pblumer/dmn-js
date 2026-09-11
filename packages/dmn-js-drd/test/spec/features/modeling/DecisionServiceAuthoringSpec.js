import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import DrdModeler from '../../../helper/DrdModeler';

import decisionServiceAuthoringXML from '../../../fixtures/dmn/decision-service-authoring-15.dmn';


describe('features/modeling - DMN 1.5 Decision Service authoring', function() {

  let modeler;

  beforeEach(async function() {
    modeler = new DrdModeler({
      container: TestContainer.get(this),
      dmnVersion: '1.5'
    });

    const { warnings } = await modeler.importXML(decisionServiceAuthoringXML);
    const warningMessages = warnings.map(warning => warning.message).join('\n');

    expect(warnings, warningMessages).to.have.lengthOf(0);
  });

  afterEach(function() {
    modeler.destroy();
  });


  it('should create and persist a Decision Service', async function() {
    const activeViewer = modeler.getActiveViewer();
    const canvas = activeViewer.get('canvas');
    const elementFactory = activeViewer.get('elementFactory');
    const modeling = activeViewer.get('modeling');
    const commandStack = activeViewer.get('commandStack');

    const root = canvas.getRootElement();
    const shape = elementFactory.createShape({
      type: 'dmn:DecisionService'
    });

    modeling.createShape(shape, { x: 250, y: 180 }, root);

    expect(shape.businessObject.$type).to.eql('dmn:DecisionService');
    expect(shape.businessObject.$parent).to.eql(root.businessObject);
    expect(shape.businessObject.di).to.exist;

    const divider = shape.businessObject.di.get('decisionServiceDividerLine');
    const waypoints = divider && divider.get('waypoint');
    const dividerY = shape.y + Math.round(shape.height * 0.6);

    expect(divider).to.exist;
    expect(waypoints).to.have.lengthOf(2);
    expect(waypoints[0].x).to.eql(shape.x);
    expect(waypoints[0].y).to.eql(dividerY);
    expect(waypoints[1].x).to.eql(shape.x + shape.width);
    expect(waypoints[1].y).to.eql(dividerY);

    commandStack.undo();
    expect(shape.businessObject.$parent).to.not.exist;

    commandStack.redo();
    expect(shape.businessObject.$parent).to.eql(root.businessObject);

    const { xml } = await modeler.saveXML({ format: true });

    expect(xml).to.contain('<decisionService');
    expect(xml).to.contain('DMNDecisionServiceDividerLine');

    const { warnings } = await modeler.importXML(xml);
    const warningMessages = warnings.map(warning => warning.message).join('\n');

    expect(warnings, warningMessages).to.have.lengthOf(0);

    const reimportedViewer = modeler.getActiveViewer();
    const elementRegistry = reimportedViewer.get('elementRegistry');
    const reimported = elementRegistry.get(shape.id);

    expect(reimported).to.exist;
    expect(reimported.businessObject.$type).to.eql('dmn:DecisionService');
    expect(reimported.businessObject.di.get('decisionServiceDividerLine')).to.exist;
  });
});
