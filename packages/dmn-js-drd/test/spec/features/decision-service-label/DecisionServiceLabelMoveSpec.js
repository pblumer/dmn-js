import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import {
  query as domQuery
} from 'min-dom';

import DrdModeler from '../../../helper/DrdModeler';

import containmentXML from '../../../fixtures/dmn/decision-service-containment-15.dmn';


/**
 * A Decision Service's name can be moved out of the way.
 *
 * §6.2.5 requires the Name inside the shape and says nothing about where, and the
 * figures do not agree: 6-6 draws it centred at the top, 6-7, 6-8 and 6-9 at the top
 * left. Any corner the editor picks is wrong for some diagram — the name lands on an
 * output decision, or on a requirement crossing the border — so it picks the top left
 * and lets the author move it from there.
 *
 * What a drag writes is the DMNShape's DMNLabel bounds. That is DMN's own place for
 * it (a DMNLabel is a di:Shape, so it has Bounds) and the same paragraph already
 * gives the label the last word over the name, so the position survives a save and
 * means the same thing to a tool that never heard of this editor.
 *
 * Inside the box and above the divider: the paragraph puts the Name in the upper
 * part, with the output decisions.
 */
describe('features/decision-service-label', function() {

  let modeler, viewer;

  beforeEach(async function() {
    modeler = new DrdModeler({
      container: TestContainer.get(this),
      dmnVersion: '1.5'
    });

    const { warnings } = await modeler.importXML(containmentXML);

    expect(warnings.map(warning => warning.message).join('\n')).to.eql('');

    viewer = modeler.getActiveViewer();
  });

  afterEach(function() {
    modeler && modeler.destroy();

    modeler = viewer = null;
  });

  const service = () => viewer.get('elementRegistry')
    .get('DecisionService_Approval');

  const handle = () => domQuery(
    '.djs-decision-service-label-handle',
    viewer.get('canvas').getLayer('resizers')
  );

  const labelBounds = () => {
    const label = service().businessObject.di.get('label'),
          bounds = label && label.get('bounds');

    return bounds && {
      x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height
    };
  };

  function drag(from, to) {
    const canvas = viewer.get('canvas'),
          dragging = viewer.get('dragging');

    viewer.get('decisionServiceLabelMove')
      .activate(canvasEvent(canvas, from), service(), grabbed());

    dragging.move(canvasEvent(canvas, to));
    dragging.end();
  }

  // What the handle was made from, which is what a real drag starts with.
  const grabbed = () => viewer.get('decisionServiceLabelMoveHandle')
    .getLabelBounds(service());


  it('should offer a handle over the name of a selected service', function() {

    // when
    viewer.get('selection').select(service());

    // then
    expect(handle()).to.exist;
  });


  it('should not offer one when nothing is selected', function() {

    // then
    expect(handle()).not.to.exist;
  });


  it('should start with no label bounds, so the default applies', function() {

    // then
    // the name is where the renderer puts it until somebody says otherwise; an
    // untouched model is not rewritten just by being opened
    expect(labelBounds()).not.to.exist;
  });


  it('should write where the name was dragged to', function() {

    // given
    viewer.get('selection').select(service());

    const before = grabbed();

    // when
    drag({ x: before.x, y: before.y }, { x: before.x + 60, y: before.y + 30 });

    // then
    expect(labelBounds()).to.eql({
      x: before.x + 60,
      y: before.y + 30,
      width: before.width,
      height: before.height
    });
  });


  it('should keep the name inside the box', function() {

    // given
    viewer.get('selection').select(service());

    const before = grabbed(),
          box = service();

    // when
    // far past the right edge, which is where a name would stop being inside the
    // shape §6.2.5 requires it to be inside
    drag({ x: before.x, y: before.y }, { x: before.x + 1000, y: before.y });

    // then
    expect(labelBounds().x)
      .to.eql(box.x + box.width - 10 - before.width);
  });


  it('should keep the name above the divider', function() {

    // given
    viewer.get('selection').select(service());

    const before = grabbed();

    // when
    // the upper part encloses only the output decisions and the Name (§6.2.5), so
    // the name does not belong in the lower compartment
    drag({ x: before.x, y: before.y }, { x: before.x, y: before.y + 1000 });

    // then
    expect(labelBounds().y).to.eql(200 - before.height);
  });


  it('should stop the handle at the edge while it is being dragged', function() {

    // given
    viewer.get('selection').select(service());

    const canvas = viewer.get('canvas'),
          dragging = viewer.get('dragging'),
          before = grabbed();

    viewer.get('decisionServiceLabelMove')
      .activate(canvasEvent(canvas, { x: before.x, y: before.y }), service(), before);

    // when
    // past the right edge, and still held: the handle has to stop where the name
    // will, or it follows the pointer out of the box and jumps back on release
    dragging.move(canvasEvent(canvas, { x: before.x + 1000, y: before.y }));

    // then
    expect(Number(handle().getAttribute('x')))
      .to.eql(service().x + service().width - 10 - before.width);

    dragging.cancel();
  });


  it('should refuse to put the name outside the box, however it is asked',
    function() {

      // when
      // the drag clamps what it previews; the command clamps what it writes, so a
      // caller that is not the drag cannot put the name where §6.2.5 does not have it
      viewer.get('modeling').updateDecisionServiceLabelBounds(service(), {
        x: 5000,
        y: 5000,
        width: 100,
        height: 20
      });

      // then
      expect(labelBounds()).to.eql({
        x: 290,
        y: 180,
        width: 100,
        height: 20
      });
    }
  );


  it('should put the name back on undo', function() {

    // given
    viewer.get('selection').select(service());

    const before = grabbed();

    drag({ x: before.x, y: before.y }, { x: before.x + 60, y: before.y + 30 });

    // when
    viewer.get('commandStack').undo();

    // then
    expect(labelBounds()).not.to.exist;
  });


  it('should survive a save, as a DMNLabel the format already has',
    async function() {

      // given
      viewer.get('selection').select(service());

      const before = grabbed();

      drag({ x: before.x, y: before.y }, { x: before.x + 60, y: before.y + 30 });

      // when
      const { xml } = await modeler.saveXML({ format: true });

      // then
      expect(xml).to.contain('<dmndi:DMNLabel>');
      expect(xml).to.contain(
        '<dc:Bounds height="' + before.height + '" width="' + before.width +
        '" x="' + (before.x + 60) + '" y="' + (before.y + 30) + '" />'
      );
    }
  );


  it('should draw the name where the author put it', async function() {

    // given
    viewer.get('selection').select(service());

    const before = grabbed();

    // when
    drag({ x: before.x, y: before.y }, { x: before.x + 60, y: before.y + 30 });

    // then
    // the handle is made from the drawing, so asking it again is asking the
    // renderer whether it moved the name too
    expect(grabbed()).to.eql(labelBounds());
  });

});

function canvasEvent(canvas, point) {
  const viewbox = canvas.viewbox();
  const clientRect = canvas._container.getBoundingClientRect();

  return {
    button: 0,
    target: canvas._svg,
    clientX: clientRect.left + (point.x - viewbox.x) * viewbox.scale,
    clientY: clientRect.top + (point.y - viewbox.y) * viewbox.scale,
    preventDefault() {},
    stopPropagation() {}
  };
}
