import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import DrdModeler from '../../../helper/DrdModeler';

import containmentXML from '../../../fixtures/dmn/decision-service-containment-15.dmn';
import crossingXML from '../../../fixtures/dmn/decision-service-crossing-15.dmn';


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


  it('should dock a crossing requirement to the service, not drop it',
    async function() {

      // given
      await open.call(this, crossingXML);

      const service = () => get('DecisionService_Credit');

      // when
      collapse('DecisionService_Credit', true);

      // then
      // a requirement that crosses the boundary is a requirement of the service:
      // the input data the members are given, and the decisions they are given and
      // give to. The box is what a reader can see, so that is what the edge ends on.
      expect(get('IR_Amount')).to.exist;
      expect(get('IR_Amount').target).to.equal(service());
      expect(get('IR_Score')).to.exist;
      expect(get('IR_Score').target).to.equal(service());

      // in either direction: a decision outside requiring one inside
      expect(get('IR_Report')).to.exist;
      expect(get('IR_Report').source).to.equal(service());

      // the ends that were always outside are untouched
      expect(get('IR_Amount').source).to.equal(get('InputData_Amount'));
      expect(get('IR_Score').source).to.equal(get('Decision_Score'));
      expect(get('IR_Report').target).to.equal(get('Decision_Report'));

      // a requirement wholly inside has nothing left to draw between, so it goes
      expect(get('IR_Afford')).not.to.exist;
    });


  it('should write the crossing edge where it is now drawn', async function() {

    // given
    await open.call(this, crossingXML);

    // when
    collapse('DecisionService_Credit', true);

    // then
    // the DI follows the canvas: a saved collapsed DRD says the edge ends on the
    // box, which is the only thing that diagram draws
    const service = get('DecisionService_Credit');
    const waypoints = get('IR_Amount').businessObject.di.get('waypoint');
    const last = waypoints[waypoints.length - 1];

    expect(last.y).to.be.closeTo(service.y + service.height, 1);
    expect(last.x).to.be.within(service.x, service.x + service.width);
  });


  it('should dock a crossing requirement back to its decision', async function() {

    // given
    await open.call(this, crossingXML);

    const before = {
      amount: get('IR_Amount').waypoints.map(({ x, y }) => ({ x, y })),
      report: get('IR_Report').waypoints.map(({ x, y }) => ({ x, y }))
    };

    // when
    collapse('DecisionService_Credit', true);
    collapse('DecisionService_Credit', false);

    // then
    expect(get('IR_Amount').target).to.equal(get('Decision_Afford'));
    expect(get('IR_Score').target).to.equal(get('Decision_Verdict'));
    expect(get('IR_Report').source).to.equal(get('Decision_Verdict'));
    expect(get('IR_Afford')).to.exist;

    // and drawn the way the author drew them
    expect(get('IR_Amount').waypoints.map(({ x, y }) => ({ x, y })))
      .to.eql(before.amount);
    expect(get('IR_Report').waypoints.map(({ x, y }) => ({ x, y })))
      .to.eql(before.report);
  });


  it('should put the box back the way it was, divider and all', async function() {

    // given
    await open.call(this, crossingXML);

    const before = boundsOf('DecisionService_Credit');
    const beforeDivider = dividerY('DecisionService_Credit');

    // when
    collapse('DecisionService_Credit', true);
    collapse('DecisionService_Credit', false);

    // then
    // the collapsed box is 180x100 and its divider is clamped to fit that, so
    // neither can be recomputed on the way back: unfolding restores what was there
    expect(boundsOf('DecisionService_Credit')).to.eql(before);
    expect(dividerY('DecisionService_Credit')).to.eql(beforeDivider);
  });


  it('should undo a fold that re-docked edges, as one step', async function() {

    // given
    await open.call(this, crossingXML);

    const before = boundsOf('DecisionService_Credit');

    // when
    collapse('DecisionService_Credit', true);
    viewer.get('commandStack').undo();

    // then
    expect(boundsOf('DecisionService_Credit')).to.eql(before);
    expect(get('IR_Amount').target).to.equal(get('Decision_Afford'));
    expect(get('IR_Report').source).to.equal(get('Decision_Verdict'));
    expect(get('IR_Afford')).to.exist;
  });


  function boundsOf(id) {
    const { x, y, width, height } = get(id);

    return { x, y, width, height };
  }

  function dividerY(id) {
    const divider = get(id).businessObject.di.get('decisionServiceDividerLine');

    return divider && divider.waypoint && divider.waypoint.length
      ? divider.waypoint[0].y
      : undefined;
  }
});
