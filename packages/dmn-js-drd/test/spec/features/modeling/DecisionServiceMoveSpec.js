import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import DrdModeler from '../../../helper/DrdModeler';

import containmentXML from '../../../fixtures/dmn/decision-service-containment-15.dmn';
import detachedMembershipXML from '../../../fixtures/dmn/decision-service-detached-membership-15.dmn';


/**
 * A decision service is laid out like anything else on the canvas.
 *
 * It was not: the move rule listed every element but that one, so dragging a service
 * was refused outright — which is the one thing a diagram carrying several of them
 * cannot do without.
 *
 * Moving it is a translation, and a translation is the case where nothing about the
 * model changes: the decisions are its children and travel with it, so which
 * compartment each one sits in is exactly what it was. Saying that out loud matters
 * for the member a diagram draws outside the box, which an imported one may well be.
 * That decision does not move and the divider does, so re-deciding compartments on a
 * move turns it from the service's output decision into an encapsulated one — the
 * service silently loses the interface it publishes, because somebody dragged the
 * box. The last test below is that case, and it fails without the guard.
 */
describe('features/modeling - DMN 1.5 Decision Service move', function() {

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

  const boundsOf = (id) => {
    const { x, y, width, height } = get(id).businessObject.di.bounds;

    return { x, y, width, height };
  };

  const dividerOf = (id) => get(id).businessObject.di
    .get('decisionServiceDividerLine')
    .get('waypoint')
    .map(({ x, y }) => ({ x, y }));

  const hrefs = (id, property) => get(id).businessObject
    .get(property)
    .map(reference => reference.href);


  it('should allow a Decision Service onto the diagram', async function() {

    // given
    await open.call(this, containmentXML);

    // when
    const allowed = viewer.get('rules').allowed('elements.move', {
      shapes: [ get('DecisionService_Approval') ],
      target: viewer.get('canvas').getRootElement()
    });

    // then
    expect(allowed).to.be.true;
  });


  it('should not allow a Decision Service onto anything else', async function() {

    // given
    await open.call(this, containmentXML);

    // when
    const allowed = viewer.get('rules').allowed('elements.move', {
      shapes: [ get('DecisionService_Approval') ],
      target: get('Decision_Unrelated')
    });

    // then
    // only the diagram holds a decision service; a service dropped on another
    // element, a service among them, is not a diagram this notation can draw
    expect(allowed).to.be.false;
  });


  it('should take its decisions, its bounds and its divider along', async function() {

    // given
    await open.call(this, containmentXML);

    // when
    viewer.get('modeling').moveShape(
      get('DecisionService_Approval'), { x: 120, y: 60 }
    );

    // then
    expect(boundsOf('DecisionService_Approval'))
      .to.eql({ x: 220, y: 140, width: 300, height: 240 });
    expect(boundsOf('Decision_Output'))
      .to.eql({ x: 240, y: 160, width: 120, height: 50 });
    expect(boundsOf('Decision_Encapsulated'))
      .to.eql({ x: 240, y: 280, width: 120, height: 50 });
    expect(dividerOf('DecisionService_Approval'))
      .to.eql([ { x: 220, y: 260 }, { x: 520, y: 260 } ]);

    // and the decision beside the box stays where it was
    expect(boundsOf('Decision_Unrelated'))
      .to.eql({ x: 260, y: 220, width: 120, height: 50 });
  });


  it('should keep every decision in the compartment it was in', async function() {

    // given
    await open.call(this, containmentXML);

    // when
    viewer.get('modeling').moveShape(
      get('DecisionService_Approval'), { x: 120, y: 60 }
    );

    // then
    // the output decision is the service's interface: losing it to the lower
    // compartment turns a callable service into one that answers with nothing
    expect(hrefs('DecisionService_Approval', 'outputDecision'))
      .to.eql([ '#Decision_Output' ]);
    expect(hrefs('DecisionService_Approval', 'encapsulatedDecision'))
      .to.eql([ '#Decision_Encapsulated' ]);
    expect(hrefs('DecisionService_Approval', 'inputDecision'))
      .to.eql([ '#Decision_Boundary' ]);
  });


  it('should keep the membership of a decision drawn outside the box',
    async function() {

      // given
      // an imported diagram may name a member it does not draw inside the box; the
      // box moving away from it says nothing about whether it is still a member
      await open.call(this, detachedMembershipXML);

      // when
      // upwards on purpose: it carries the divider up past the decision that stayed
      // behind, which is the position that reads as "this one is encapsulated"
      viewer.get('modeling').moveShape(
        get('DecisionService_Approval'), { x: -60, y: -180 }
      );

      // then
      expect(hrefs('DecisionService_Approval', 'outputDecision'))
        .to.eql([ '#Decision_Detached' ]);
      expect(hrefs('DecisionService_Approval', 'encapsulatedDecision')).to.be.empty;
    }
  );


  it('should put everything back on undo', async function() {

    // given
    await open.call(this, containmentXML);

    // when
    viewer.get('modeling').moveShape(
      get('DecisionService_Approval'), { x: 120, y: 60 }
    );

    viewer.get('commandStack').undo();

    // then
    expect(boundsOf('DecisionService_Approval'))
      .to.eql({ x: 100, y: 80, width: 300, height: 240 });
    expect(boundsOf('Decision_Output'))
      .to.eql({ x: 120, y: 100, width: 120, height: 50 });
    expect(dividerOf('DecisionService_Approval'))
      .to.eql([ { x: 100, y: 200 }, { x: 400, y: 200 } ]);
    expect(hrefs('DecisionService_Approval', 'outputDecision'))
      .to.eql([ '#Decision_Output' ]);
  });

});
