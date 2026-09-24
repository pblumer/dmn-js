import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import {
  query as domQuery,
  queryAll as domQueryAll
} from 'min-dom';

import DrdModeler from '../../../helper/DrdModeler';

import containmentXML from '../../../fixtures/dmn/decision-service-containment-15.dmn';


/**
 * A Decision Service's name box has a size, and the author sets it.
 *
 * Moving the name was half the answer. How wide the box is decides whether the name
 * reads at all: a box measured to the name it held when it was first dragged is the
 * wrong box for a longer name, for a two-line one the author wants on one line, or
 * for a corner of the service that happens to be narrow. DMNDI already carries the
 * width and the height — a DMNLabel is a di:Shape — and carries no wrapping rule, so
 * the size is the only place to say it.
 *
 * Underneath is a defect the size made visible. diagram-js fits a line while
 * `width < Math.round(maxWidth)`, so a box measured to the text's own width is a
 * pixel short of holding it; shortening then falls through whitespace and hyphens to
 * a cut mid-word, and a name dragged once came back as "MyServic" over "e". The box
 * is rounded up now, and never narrower than its longest word — so a name that wraps
 * wraps between words, and there is no size at which a word is cut in half.
 */
describe('features/decision-service-label - size', function() {

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

  const labelBounds = () => {
    const label = service().businessObject.di.get('label'),
          bounds = label && label.get('bounds');

    return bounds && {
      x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height
    };
  };

  // What the name is actually drawn as, line by line. The only thing that answers
  // "is a word cut in half" — the stored numbers do not say it, the drawing does.
  const lines = () => {
    const gfx = viewer.get('elementRegistry').getGraphics(service()),
          label = domQuery('.djs-label', gfx);

    return Array.from(label.querySelectorAll('tspan'))
      .map(tspan => tspan.textContent);
  };

  // The box the handle takes from the drawing, which is what a real drag starts with.
  const grabbed = () => viewer.get('decisionServiceLabelMoveHandle')
    .getLabelBounds(service());

  const grips = () => Array.from(domQueryAll(
    '.djs-decision-service-label-grip',
    viewer.get('canvas').getLayer('resizers')
  ));

  function resize(corner, to) {
    const canvas = viewer.get('canvas'),
          dragging = viewer.get('dragging'),
          bounds = grabbed();

    const from = {
      x: corner === 'nw' || corner === 'sw' ? bounds.x : bounds.x + bounds.width,
      y: corner === 'nw' || corner === 'ne' ? bounds.y : bounds.y + bounds.height
    };

    viewer.get('decisionServiceLabelResize')
      .activate(canvasEvent(canvas, from), service(), bounds, corner);

    dragging.move(canvasEvent(canvas, { x: from.x + to.dx, y: from.y + to.dy }));
    dragging.end();

    return bounds;
  }


  it('should not cut a word in half when the name is first moved', function() {

    // given
    // one word, so there is nothing to break on but the word itself
    viewer.get('modeling').updateProperties(service(), { name: 'MyService' });

    // when
    // exactly what a drag commits: the box the renderer just laid the name out in
    viewer.get('modeling').updateDecisionServiceLabelBounds(service(), grabbed());

    // then
    expect(lines()).to.eql([ 'MyService' ]);
  });


  it('should refuse a box narrower than the longest word', function() {

    // when
    // as narrow as it will go, from a caller that is not the drag
    viewer.get('modeling').updateDecisionServiceLabelBounds(service(), {
      x: 110, y: 90, width: 1, height: 1
    });

    // then
    // it wraps, because the whole name does not fit — but on the space, not inside
    // a word
    expect(lines()).to.eql([ 'Approval', 'Service' ]);
  });


  it('should offer a grip on each corner of a selected name', function() {

    // when
    viewer.get('selection').select(service());

    // then
    expect(grips()).to.have.length(4);

    expect(grips().map(grip => grip.getAttribute('data-corner')).sort())
      .to.eql([ 'ne', 'nw', 'se', 'sw' ]);
  });


  it('should not offer grips when nothing is selected', function() {

    // then
    expect(grips()).to.have.length(0);
  });


  // Put the name where it has room on every side, so a drag is testing the resize
  // rather than the edge it would otherwise already be standing on.
  function nameInTheMiddle() {
    viewer.get('modeling').updateDecisionServiceLabelBounds(service(), {
      x: 200, y: 120, width: 100, height: 20
    });

    viewer.get('selection').select(service());

    return labelBounds();
  }


  it('should widen the box from its south east corner', function() {

    // given
    const before = nameInTheMiddle();

    // when
    resize('se', { dx: 40, dy: 10 });

    // then
    // the corner the author is not holding does not move
    expect(labelBounds()).to.eql({
      x: before.x,
      y: before.y,
      width: before.width + 40,
      height: before.height + 10
    });
  });


  it('should hold the opposite corner still when the north west one is dragged',
    function() {

      // given
      const before = nameInTheMiddle();

      // when
      // up and to the left, which grows the box away from a corner that stays put
      resize('nw', { dx: -30, dy: -8 });

      // then
      const after = labelBounds();

      expect(after.x + after.width).to.eql(before.x + before.width);
      expect(after.y + after.height).to.eql(before.y + before.height);
      expect(after.width).to.eql(before.width + 30);
      expect(after.height).to.eql(before.height + 8);
    });


  it('should keep the box inside the service when it is grown', function() {

    // given
    nameInTheMiddle();

    const box = service();

    // when
    resize('se', { dx: 1000, dy: 1000 });

    // then
    const after = labelBounds();

    expect(after.x + after.width).to.be.at.most(box.x + box.width - 10);

    // and above the divider, where §6.2.5 puts the Name
    expect(after.y + after.height).to.be.at.most(200);
  });


  it('should write the size where DMN keeps it', async function() {

    // given
    nameInTheMiddle();

    // when
    resize('se', { dx: 40, dy: 10 });

    const { xml } = await modeler.saveXML({ format: true });

    // then
    const bounds = labelBounds();

    expect(xml).to.contain('<dmndi:DMNLabel>');
    expect(xml).to.contain('width="' + bounds.width + '"');
    expect(xml).to.contain('height="' + bounds.height + '"');
  });

});


// The shared MockEvents helper reads a globally bootstrapped instance; this suite
// builds its own modeler, so it builds its own events too — the same arithmetic the
// name-move suite uses.
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
