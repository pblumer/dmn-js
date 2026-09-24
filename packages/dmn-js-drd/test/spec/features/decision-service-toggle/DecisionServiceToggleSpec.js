import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import {
  query as domQuery
} from 'min-dom';

import DrdModeler from '../../../helper/DrdModeler';

import containmentXML from '../../../fixtures/dmn/decision-service-containment-15.dmn';


/**
 * The fold switch lives in the Decision Service, not beside it.
 *
 * It was a context pad entry, which meant selecting the box and then reading an icon
 * strip to find it. A collapsed sub-process carries its switch in the shape, at the
 * bottom edge, and that is where a reader looks — so this one is there, laid exactly
 * over the marker the renderer paints on a folded service (DMN 1.5 Table 5-2) so the
 * two read as one control rather than two.
 *
 * It is a modeler feature: a viewer draws the marker and offers nothing to press.
 */
describe('features/decision-service-toggle', function() {

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

  const get = (id) => viewer.get('elementRegistry').get(id);

  const toggle = () => domQuery(
    '.dmn-decision-service-toggle',
    viewer.get('overlays')._overlayRoot
  );

  const isCollapsed = (id) => !!get(id).businessObject.di.get('isCollapsed');


  it('should offer a switch on a decision service', function() {

    // then
    expect(toggle()).to.exist;
  });


  it('should show a minus while the definition is drawn', function() {

    // then
    expect(toggle().className).to.contain('dmn-icon-minus');
    expect(toggle().title).to.eql('Collapse decision service');
  });


  it('should fold on a click, and say so', function() {

    // when
    toggle().click();

    // then
    expect(isCollapsed('DecisionService_Approval')).to.be.true;
    expect(get('Decision_Output')).not.to.exist;

    // and the same switch now offers the way back
    expect(toggle().className).to.contain('dmn-icon-plus');
    expect(toggle().title).to.eql('Expand decision service');
  });


  it('should unfold on the next click', function() {

    // given
    toggle().click();

    // when
    toggle().click();

    // then
    expect(isCollapsed('DecisionService_Approval')).to.be.false;
    expect(get('Decision_Output')).to.exist;
    expect(toggle().className).to.contain('dmn-icon-minus');
  });


  it('should sit where the folded marker is drawn', function() {

    // given
    toggle().click();

    const service = get('DecisionService_Approval');

    // when
    const overlay = viewer.get('overlays').get({ element: service })[0];

    // then
    // the marker is a 16px square, centred, 12px above the bottom edge; an overlay
    // is placed by its top left, so `bottom` is the margin plus the square
    expect(overlay.position).to.eql({
      bottom: 28,
      left: Math.round((service.width - 16) / 2)
    });
  });


  it('should follow the box when folding resizes it', function() {

    // given
    const wide = get('DecisionService_Approval').width;

    // when
    toggle().click();

    // then
    // a fold shrinks the box, so a switch placed once and left alone would sit off
    // to the side of the smaller one
    const service = get('DecisionService_Approval');

    expect(service.width).not.to.eql(wide);
    expect(viewer.get('overlays').get({ element: service })[0].position.left)
      .to.eql(Math.round((service.width - 16) / 2));
  });


  it('should be a decision service affordance and nothing else', function() {

    // then
    // a decision has no definition to fold away
    expect(viewer.get('overlays').get({ element: get('Decision_Unrelated') }))
      .to.be.empty;
  });


  it('should not also be on the context pad', function() {

    // then
    // one control for one act: the switch is in the box
    expect(Object.keys(
      viewer.get('contextPad').getEntries(get('DecisionService_Approval'))
    )).not.to.include('decision-service.collapse');
  });

});
