import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import Modeler from 'src/Modeler';

import decisionServiceAuthoringXML from '../../../fixtures/dmn/decision-service-authoring-15.dmn';


describe('features/modeling - DMN 1.5 Decision Service authoring', function() {

  let modeler;

  beforeEach(async function() {
    modeler = new Modeler({
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


  it('should create and persist a Decision Service', function() {
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
    expect(shape.businessObject.di.get('decisionServiceDividerLine')).to.exist;

    commandStack.undo();
    expect(shape.businessObject.$parent).to.not.exist;

    commandStack.redo();
    expect(shape.businessObject.$parent).to.eql(root.businessObject);
  });
});
