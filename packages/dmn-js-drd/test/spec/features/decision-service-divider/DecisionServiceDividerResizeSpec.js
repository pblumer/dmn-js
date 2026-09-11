import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import {
  query as domQuery
} from 'min-dom';

import DrdModeler from '../../../helper/DrdModeler';

import decisionServiceMembershipXML from '../../../fixtures/dmn/decision-service-membership-15.dmn';


describe('features/decision-service-divider - DMN 1.5 divider resize', function() {

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


  it('should show a divider resize handle for a selected Decision Service', function() {
    const activeViewer = modeler.getActiveViewer();
    const canvas = activeViewer.get('canvas');
    const elementRegistry = activeViewer.get('elementRegistry');
    const selection = activeViewer.get('selection');

    const decisionService = elementRegistry.get('DecisionService_Approval');

    selection.select(decisionService);

    expect(domQuery(
      '.djs-decision-service-divider-resizer',
      canvas.getLayer('resizers')
    )).to.exist;
  });


  it('should move the divider and support undo and redo', function() {
    const activeViewer = modeler.getActiveViewer();
    const canvas = activeViewer.get('canvas');
    const commandStack = activeViewer.get('commandStack');
    const decisionServiceDividerResize = activeViewer.get('decisionServiceDividerResize');
    const dragging = activeViewer.get('dragging');
    const elementRegistry = activeViewer.get('elementRegistry');

    const decisionService = elementRegistry.get('DecisionService_Approval');

    decisionServiceDividerResize.activate(
      canvasEvent(canvas, { x: 250, y: 200 }),
      decisionService
    );

    dragging.move(canvasEvent(canvas, { x: 250, y: 260 }));

    expect(dividerY(decisionService)).to.equal(200);

    dragging.end();

    expect(dividerY(decisionService)).to.equal(260);

    commandStack.undo();

    expect(dividerY(decisionService)).to.equal(200);

    commandStack.redo();

    expect(dividerY(decisionService)).to.equal(260);
  });


  it('should not change the divider when dragging is canceled', function() {
    const activeViewer = modeler.getActiveViewer();
    const canvas = activeViewer.get('canvas');
    const decisionServiceDividerResize = activeViewer.get('decisionServiceDividerResize');
    const dragging = activeViewer.get('dragging');
    const elementRegistry = activeViewer.get('elementRegistry');

    const decisionService = elementRegistry.get('DecisionService_Approval');

    decisionServiceDividerResize.activate(
      canvasEvent(canvas, { x: 250, y: 200 }),
      decisionService
    );

    dragging.move(canvasEvent(canvas, { x: 250, y: 260 }));
    dragging.cancel();

    expect(dividerY(decisionService)).to.equal(200);
  });


  it('should keep both compartments inside the Decision Service', function() {
    const activeViewer = modeler.getActiveViewer();
    const commandStack = activeViewer.get('commandStack');
    const elementRegistry = activeViewer.get('elementRegistry');
    const modeling = activeViewer.get('modeling');

    const decisionService = elementRegistry.get('DecisionService_Approval');

    modeling.updateDecisionServiceDivider(decisionService, -100);

    expect(dividerY(decisionService)).to.equal(100);

    commandStack.undo();

    modeling.updateDecisionServiceDivider(decisionService, 1000);

    expect(dividerY(decisionService)).to.equal(300);
  });

});


function canvasEvent(canvas, point) {
  const viewbox = canvas.viewbox();
  const clientRect = canvas._container.getBoundingClientRect();

  return {
    button: 0,
    clientX: clientRect.left + (point.x - viewbox.x) * viewbox.scale,
    clientY: clientRect.top + (point.y - viewbox.y) * viewbox.scale,
    preventDefault() {},
    stopPropagation() {}
  };
}

function dividerY(decisionService) {
  return decisionService.businessObject.di
    .get('decisionServiceDividerLine')
    .waypoint[0].y;
}
