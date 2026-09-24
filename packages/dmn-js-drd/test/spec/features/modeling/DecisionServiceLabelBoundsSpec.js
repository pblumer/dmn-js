import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import DrdModeler from '../../../helper/DrdModeler';

import containmentXML from '../../../fixtures/dmn/decision-service-containment-15.dmn';


/**
 * A Decision Service's name stays in the box the author put it in.
 *
 * §6.2.5 says the Name is displayed inside the shape. Where inside is the author's
 * to choose, and their choice is recorded as a DMNLabel's bounds — which DMNDI
 * records in diagram coordinates, not relative to the shape. That is the right
 * place to record it, and it is also why the number stops being true the moment the
 * box moves: nothing kept the two in step, so dragging the box left the name behind,
 * and a box dragged far enough had its name floating over an unrelated corner of the
 * diagram. Resizing had the mirror image — the bounds were left alone while the box
 * shrank past them.
 *
 * It took the context pad with it, which reads as a second defect and is this one:
 * diagram-js places the pad from the element's *rendered* bounding box, and a name
 * drawn outside the box swells that box to cover both, so the pad opens beside the
 * stray name rather than beside the service.
 *
 * One rule covers every gesture: the name keeps its offset from the shape's top left
 * corner, and is clamped back inside when the box shrinks past it.
 */
describe('features/modeling - DMN 1.5 Decision Service label bounds', function() {

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

  // Read off the model rather than off a local variable, so what is asserted is what
  // a save would write out.
  const label = () => {
    const stored = service().businessObject.di.get('label');
    const bounds = stored && stored.get('bounds');

    return bounds && {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    };
  };

  const box = () => ({
    x: service().x,
    y: service().y,
    width: service().width,
    height: service().height
  });

  // Where the name sits in relation to the box, which is the thing a reader sees and
  // the thing that must not change.
  const offset = () => ({
    x: label().x - box().x,
    y: label().y - box().y
  });

  const putNameAt = (x, y) => viewer.get('modeling')
    .updateDecisionServiceLabelBounds(service(), {
      x, y, width: 80, height: 20
    });


  it('should keep the name in the box when the box is dragged', function() {

    // given
    // the box is at 100,80 and 300x240, so this is 60 across and 15 down from its
    // top left corner
    putNameAt(160, 95);

    // when
    viewer.get('modeling').moveShape(service(), { x: 150, y: 60 });

    // then
    expect(offset()).to.eql({ x: 60, y: 15 });
    expect(label()).to.eql({ x: 310, y: 155, width: 80, height: 20 });
  });


  it('should take the name back with the box when the drag is undone',
    function() {

      // given
      putNameAt(160, 95);

      viewer.get('modeling').moveShape(service(), { x: 150, y: 60 });

      // when
      // one undo, not two: the follow-up is part of the gesture that queued it
      viewer.get('commandStack').undo();

      // then
      expect(box()).to.eql({ x: 100, y: 80, width: 300, height: 240 });
      expect(label()).to.eql({ x: 160, y: 95, width: 80, height: 20 });
    });


  it('should leave the name alone when the box grows away from it', function() {

    // given
    putNameAt(160, 95);

    // when
    // the top left corner does not move, so neither does the name
    viewer.get('modeling').resizeShape(service(), {
      x: 100, y: 80, width: 460, height: 300
    });

    // then
    expect(label()).to.eql({ x: 160, y: 95, width: 80, height: 20 });
  });


  it('should carry the name with the corner the author dragged', function() {

    // given
    putNameAt(160, 95);

    // when
    // the top left corner moves 40 across and 20 down; the name keeps its place in
    // the box rather than staying where it was on the canvas
    viewer.get('modeling').resizeShape(service(), {
      x: 140, y: 100, width: 260, height: 220
    });

    // then
    expect(offset()).to.eql({ x: 60, y: 15 });
  });


  it('should pull the name back inside when the box shrinks past it', function() {

    // given
    // as far right and as low as the upper compartment allows
    putNameAt(310, 175);

    // when
    viewer.get('modeling').resizeShape(service(), {
      x: 100, y: 80, width: 120, height: 100
    });

    // then
    const inside = label().x >= box().x &&
      label().x + label().width <= box().x + box().width &&
      label().y >= box().y &&
      label().y + label().height <= box().y + box().height;

    expect(inside, JSON.stringify({ label: label(), box: box() })).to.be.true;
  });


  it('should give the name back when a shrink is undone', function() {

    // given
    putNameAt(310, 175);

    viewer.get('modeling').resizeShape(service(), {
      x: 100, y: 80, width: 120, height: 100
    });

    // when
    // the clamp cannot be undone by clamping again, so the undo has to carry the
    // bounds it replaced
    viewer.get('commandStack').undo();

    // then
    expect(label()).to.eql({ x: 310, y: 175, width: 80, height: 20 });
  });


  it('should not invent a label for a service whose name was never moved',
    function() {

      // when
      viewer.get('modeling').moveShape(service(), { x: 150, y: 60 });

      viewer.get('modeling').resizeShape(service(), {
        x: 250, y: 140, width: 200, height: 180
      });

      // then
      // no stored bounds means the renderer's own default applies, and a default is
      // laid out inside the shape every time it is drawn
      expect(label()).not.to.exist;
    });


  it('should put the name back where the author had it after a fold and unfold',
    function() {

      // given
      putNameAt(310, 175);

      // when
      viewer.get('modeling').collapseDecisionService(service(), true);
      viewer.get('modeling').collapseDecisionService(service(), false);

      // then
      expect(label()).to.eql({ x: 310, y: 175, width: 80, height: 20 });
    });


  it('should keep the name in the box while the box is folded', function() {

    // given
    // a place that fits a 300x240 box and not the 180x100 one a fold leaves
    putNameAt(310, 175);

    // when
    viewer.get('modeling').collapseDecisionService(service(), true);

    // then
    const inside = label().x >= box().x &&
      label().x + label().width <= box().x + box().width &&
      label().y >= box().y &&
      label().y + label().height <= box().y + box().height;

    expect(inside, JSON.stringify({ label: label(), box: box() })).to.be.true;
  });


  it('should take the name along when a folded box is dragged', function() {

    // given
    // a place the folded box cannot hold, so the fold clamps it and only the record
    // kept across the fold can put it back
    putNameAt(310, 175);

    // when
    viewer.get('modeling').collapseDecisionService(service(), true);
    viewer.get('modeling').moveShape(service(), { x: 300, y: 200 });
    viewer.get('modeling').collapseDecisionService(service(), false);

    // then
    // the box came back at 400,280; the name comes back with it, not at 310,175 and
    // not at wherever the folded box had room for it
    expect(box()).to.eql({ x: 400, y: 280, width: 300, height: 240 });
    expect(label()).to.eql({ x: 610, y: 375, width: 80, height: 20 });
  });

});
