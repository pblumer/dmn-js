import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import DrdModeler from '../../../helper/DrdModeler';

import containmentXML from '../../../fixtures/dmn/decision-service-containment-15.dmn';


/**
 * Folding a Decision Service away, and unfolding it again (DMN 1.5 §6.2.4).
 *
 * A collapsed service is a partial view, not a smaller model. The specification's
 * own example is two DRDs of one DRG: the first draws the service's definition, the
 * second draws the service collapsed and simply does not contain the decisions. So
 * what a fold removes is depiction — shapes and the edges docked to them — and what
 * it must not touch is anything semantic.
 *
 * That distinction is the whole reason this is its own command. A shape.delete would
 * take the decision out of `drgElement` as well, and re-creating a requirement edge
 * would tear it out of the decision that owns it. The tests below are written to
 * catch exactly that: after folding, the DRG still has every decision and every
 * requirement it started with.
 */
describe('features/modeling - DMN 1.5 Decision Service collapse', function() {

  let modeler, viewer;

  afterEach(function() {
    modeler && modeler.destroy();

    modeler = viewer = null;
  });


  async function open(xml) {
    modeler = new DrdModeler({
      container: TestContainer.get(this),
      dmnVersion: '1.5'
    });

    const { warnings } = await modeler.importXML(xml);

    expect(warnings.map(warning => warning.message).join('\n')).to.eql('');

    viewer = modeler.getActiveViewer();

    return viewer;
  }

  const get = (id) => viewer.get('elementRegistry').get(id);

  const drgIds = () => viewer.get('canvas').getRootElement().businessObject
    .get('drgElement')
    .map(element => element.id);

  // Read off the DRG, not the canvas: after a fold the decision has no element
  // there at all, which is the whole point of the test below.
  const requirementIds = (decisionId) => viewer.get('canvas').getRootElement()
    .businessObject
    .get('drgElement')
    .filter(element => element.id === decisionId)[0]
    .get('informationRequirement')
    .map(requirement => requirement.id);

  const collapse = (id, value) =>
    viewer.get('modeling').collapseDecisionService(get(id), value);


  it('should take the members off the diagram', async function() {

    // given
    await open.call(this, containmentXML);

    expect(get('Decision_Output')).to.exist;
    expect(get('Decision_Encapsulated')).to.exist;

    // when
    collapse('DecisionService_Approval', true);

    // then
    expect(get('Decision_Output')).not.to.exist;
    expect(get('Decision_Encapsulated')).not.to.exist;

    // the input decision is the caller's boundary, outside the service, so it stays
    expect(get('Decision_Boundary')).to.exist;
    expect(get('Decision_Unrelated')).to.exist;
  });


  it('should leave the model alone', async function() {

    // given
    await open.call(this, containmentXML);

    const before = drgIds();

    // when
    collapse('DecisionService_Approval', true);

    // then
    // the decisions are folded away, not deleted: a shape.delete would have taken
    // them out of drgElement, and there would be no model left to unfold
    expect(drgIds()).to.eql(before);
    expect(viewer.get('elementRegistry').get('DecisionService_Approval')
      .businessObject.get('outputDecision').map(reference => reference.href))
      .to.eql([ '#Decision_Output' ]);
  });


  it('should keep a requirement docked to the decision that owns it',
    async function() {

      // given
      await open.call(this, containmentXML);

      // when
      collapse('DecisionService_Approval', true);

      // then
      // the edge's depiction is gone with its decision, but the requirement itself
      // belongs to the requiring decision and stays there
      expect(get('InformationRequirement_Output')).not.to.exist;
      expect(requirementIds('Decision_Output'))
        .to.eql([ 'InformationRequirement_Output' ]);
    });


  it('should say so in the diagram', async function() {

    // given
    await open.call(this, containmentXML);

    // when
    collapse('DecisionService_Approval', true);

    // then
    const service = get('DecisionService_Approval');

    expect(service.businessObject.di.get('isCollapsed')).to.be.true;
    expect(service.width).to.eql(180);
    expect(service.height).to.eql(100);
  });


  it('should put everything back where it was', async function() {

    // given
    await open.call(this, containmentXML);

    const before = {
      output: boundsOf('Decision_Output'),
      encapsulated: boundsOf('Decision_Encapsulated')
    };

    // when
    collapse('DecisionService_Approval', true);
    collapse('DecisionService_Approval', false);

    // then
    expect(get('Decision_Output')).to.exist;
    expect(get('Decision_Encapsulated')).to.exist;
    expect(get('InformationRequirement_Output')).to.exist;
    expect(boundsOf('Decision_Output')).to.eql(before.output);
    expect(boundsOf('Decision_Encapsulated')).to.eql(before.encapsulated);
    expect(get('DecisionService_Approval').businessObject.di.get('isCollapsed'))
      .not.to.be.true;
  });


  it('should undo as one step', async function() {

    // given
    await open.call(this, containmentXML);

    const before = boundsOf('DecisionService_Approval');

    // when
    collapse('DecisionService_Approval', true);
    viewer.get('commandStack').undo();

    // then
    // one undo, not three: the fold is a single thing the author did
    expect(get('Decision_Output')).to.exist;
    expect(get('InformationRequirement_Output')).to.exist;
    expect(boundsOf('DecisionService_Approval')).to.eql(before);
    expect(get('DecisionService_Approval').businessObject.di.get('isCollapsed'))
      .not.to.be.true;
  });


  it('should be reachable from the context pad, both ways', async function() {

    // given
    await open.call(this, containmentXML);

    const entriesFor = (id) => Object.keys(
      viewer.get('contextPad').getEntries(get(id))
    );

    // then
    // expanded: the entry offers to fold
    expect(entriesFor('DecisionService_Approval'))
      .to.include('decision-service.collapse');
    expect(viewer.get('contextPad')
      .getEntries(get('DecisionService_Approval'))['decision-service.collapse']
      .className).to.eql('dmn-icon-minus');

    // when
    collapse('DecisionService_Approval', true);

    // then
    // collapsed: the same entry offers to unfold, and says so with the marker the
    // renderer already draws on a folded service
    expect(viewer.get('contextPad')
      .getEntries(get('DecisionService_Approval'))['decision-service.collapse']
      .className).to.eql('dmn-icon-plus');

    // and it is a service-only affordance
    expect(entriesFor('Decision_Unrelated'))
      .not.to.include('decision-service.collapse');
  });


  function boundsOf(id) {
    const { x, y, width, height } = get(id);

    return { x, y, width, height };
  }
});
