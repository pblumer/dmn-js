import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import DrdModeler from '../../helper/DrdModeler';

import containmentXML from '../../fixtures/dmn/decision-service-containment-15.dmn';
import collapsedXML from '../../fixtures/dmn/decision-service-collapsed-15.dmn';


describe('draw - DMN 1.5 Decision Service notation', function() {

  let modeler;

  afterEach(function() {
    modeler && modeler.destroy();

    modeler = null;
  });


  async function open(xml) {
    modeler = new DrdModeler({
      container: TestContainer.get(this),
      dmnVersion: '1.5'
    });

    const { warnings } = await modeler.importXML(xml);

    expect(warnings.map(warning => warning.message).join('\n')).to.eql('');

    return modeler.getActiveViewer();
  }

  // The drawn shape, not the invisible hit area diagram-js puts beside it.
  function visualOf(viewer, id) {
    return viewer.get('elementRegistry').getGraphics(id).querySelector('.djs-visual');
  }

  function shapeOf(viewer, id) {
    return visualOf(viewer, id).querySelector('rect');
  }


  it('should draw a Decision Service with rounded corners', async function() {

    // when
    const viewer = await open.call(this, containmentXML);

    // then
    // DMN draws a decision service as a rounded rectangle; the corner is the only
    // thing telling it apart from a decision at a glance (DMN 1.5 Figure 5-10)
    const rect = shapeOf(viewer, 'DecisionService_Approval');

    expect(Number(rect.getAttribute('rx'))).to.be.above(0);
    expect(rect.getAttribute('rx')).to.eql(rect.getAttribute('ry'));
  });


  it('should draw a Decision as a plain rectangle', async function() {

    // when
    const viewer = await open.call(this, containmentXML);

    // then
    const rect = shapeOf(viewer, 'Decision_Output');

    expect(Number(rect.getAttribute('rx') || 0)).to.eql(0);
  });


  it('should start the name in the top left of an expanded Decision Service',
    async function() {

      // when
      const viewer = await open.call(this, containmentXML);
      const elementRegistry = viewer.get('elementRegistry');

      const service = elementRegistry.get('DecisionService_Approval');

      // then
      // §6.2.5 requires the Name inside the shape and nothing more, and the figures
      // disagree with each other — 6-6 draws it centred at the top, 6-7, 6-8 and 6-9
      // at the top left. So this is a default rather than the notation: the top left,
      // where three of the four figures put it, and features/decision-service-label
      // holds that a DMNLabel with bounds moves it.
      // the label is drawn inside the shape's own group, so its box is already in
      // the shape's coordinates
      const box = labelBoxOf(elementRegistry, service);

      expect(box.y).to.be.below(service.height * 0.25);
      expect(box.x + box.width / 2).to.be.below(service.width * 0.35);
    }
  );


  it('should draw the name where a DMNLabel puts it instead', async function() {

    // given
    const viewer = await open.call(this, containmentXML);
    const elementRegistry = viewer.get('elementRegistry');

    const service = elementRegistry.get('DecisionService_Approval');

    // when
    // the label is what §6.2.5 already defers to for the name's text; its bounds are
    // where DMN records the position, so nothing of our own is invented for it
    viewer.get('modeling').updateDecisionServiceLabelBounds(service, {
      x: service.x + 180,
      y: service.y + 20,
      width: 100,
      height: 20
    });

    // then
    const box = labelBoxOf(elementRegistry, service);

    expect(box.x + box.width / 2).to.be.closeTo(230, 3);
    expect(box.y + box.height / 2).to.be.closeTo(30, 4);
  });


  it('should mark a collapsed Decision Service and draw no divider',
    async function() {

      // when
      const viewer = await open.call(this, collapsedXML);

      const visual = visualOf(viewer, 'DecisionService_Approval');

      // then
      // a collapsed service holds nothing on the canvas: a plus marker says its
      // decisions are folded away, and there is no compartment to divide
      // (DMN 1.5 Table 5-2)
      expect(visual.querySelectorAll('rect')).to.have.lengthOf(2);
      expect(visual.querySelectorAll('path')).to.have.lengthOf(1);
      expect(visual.querySelectorAll('polyline')).to.have.lengthOf(0);
    }
  );


  it('should not nest the decisions of a collapsed Decision Service',
    async function() {

      // when
      const viewer = await open.call(this, collapsedXML);
      const elementRegistry = viewer.get('elementRegistry');

      // then
      expect(elementRegistry.get('DecisionService_Approval').children).to.be.empty;
      expect(elementRegistry.get('Decision_Output').parent)
        .to.equal(viewer.get('canvas').getRootElement());
    }
  );

});

/**
 * Where a shape's name is actually drawn, in the shape's own coordinates.
 *
 * getBBox() reports a text's box before its own transform, and a name moved to a
 * DMNLabel's bounds carries one — so reading the box alone says the name never
 * moved, which is exactly the mistake this file is here to catch.
 */
function labelBoxOf(elementRegistry, element) {
  const text = elementRegistry.getGraphics(element)
    .querySelector('.djs-label, text');

  const box = text.getBBox();
  const matrix = text.transform.baseVal.consolidate();

  return {
    x: box.x + (matrix ? matrix.matrix.e : 0),
    y: box.y + (matrix ? matrix.matrix.f : 0),
    width: box.width,
    height: box.height
  };
}
