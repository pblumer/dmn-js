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


  it('should put the name in the top right of an expanded Decision Service',
    async function() {

      // when
      const viewer = await open.call(this, containmentXML);
      const elementRegistry = viewer.get('elementRegistry');

      const service = elementRegistry.get('DecisionService_Approval');
      const gfx = elementRegistry.getGraphics(service);

      const label = gfx.querySelector('.djs-label text, text');

      // then
      // the name belongs in the top right of the box, clear of the output decisions
      // the upper compartment holds (DMN 1.5 Figure 5-10). Centred - where it used
      // to sit - puts it on top of them.
      // the label is drawn inside the shape's own group, so its box is already in
      // the shape's coordinates
      const box = label.getBBox();

      expect(box.y).to.be.below(service.height * 0.25);
      expect(box.x + box.width / 2).to.be.above(service.width * 0.65);
    }
  );


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
