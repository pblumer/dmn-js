import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import DrdModeler from '../../../helper/DrdModeler';

import containmentXML from '../../../fixtures/dmn/decision-service-containment-15.dmn';


/**
 * A fold must not cost a Decision Service the decisions it holds.
 *
 * The box is a container: its members are its children, which is what makes
 * diagram-js move them with it and what makes the box paint beneath them rather than
 * over them. Folding takes them off the canvas — that is what a fold is — and the
 * two tests here are the two ways that was one-way.
 *
 * Unfolding put the members back on the *root* instead of back into the service, so
 * a service that had been folded once was a rectangle standing behind some decisions
 * rather than a box holding them: the next drag moved it and left every one of them
 * standing where it was.
 *
 * And a folded service has no children to be moved for it — the decisions, the edges
 * between them and the bounds and divider the box is restored to are parked in a
 * record — so dragging one moved the box alone, and unfolding put everything back
 * where it was folded. The drag was silently undone.
 *
 * Both are the behaviour a collapsed sub-process has, and both are what somebody
 * folding a service to tidy a diagram, moving it, and unfolding it again expects.
 */
describe('features/modeling - DMN 1.5 Decision Service fold and move', function() {

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

  const dividerY = (id) => get(id).businessObject.di
    .get('decisionServiceDividerLine')
    .get('waypoint')[0].y;

  const hrefs = (id, property) => get(id).businessObject
    .get(property)
    .map(reference => reference.href);

  const fold = (id, value) =>
    viewer.get('modeling').collapseDecisionService(get(id), value);


  it('should give a member back to the service it was folded out of',
    async function() {

      // given
      await open.call(this, containmentXML);

      // when
      fold('DecisionService_Approval', true);
      fold('DecisionService_Approval', false);

      // then
      // the box holds them again — not the root, which would leave a container with
      // no children and nothing for a drag to carry
      expect(get('Decision_Output').parent).to.equal(get('DecisionService_Approval'));
      expect(get('Decision_Encapsulated').parent)
        .to.equal(get('DecisionService_Approval'));
      expect(get('DecisionService_Approval').children.map(child => child.id))
        .to.have.members([ 'Decision_Output', 'Decision_Encapsulated' ]);

      // and the decision that was never inside it is still not
      expect(get('Decision_Unrelated').parent)
        .to.equal(viewer.get('canvas').getRootElement());
    }
  );


  it('should carry its decisions when moved after a fold and unfold',
    async function() {

      // given
      await open.call(this, containmentXML);

      fold('DecisionService_Approval', true);
      fold('DecisionService_Approval', false);

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

      // and which compartment each one is in is what it was
      expect(hrefs('DecisionService_Approval', 'outputDecision'))
        .to.eql([ '#Decision_Output' ]);
      expect(hrefs('DecisionService_Approval', 'encapsulatedDecision'))
        .to.eql([ '#Decision_Encapsulated' ]);
    }
  );


  it('should take everything it put away along when moved while folded',
    async function() {

      // given
      await open.call(this, containmentXML);

      fold('DecisionService_Approval', true);

      // when
      viewer.get('modeling').moveShape(
        get('DecisionService_Approval'), { x: 300, y: 200 }
      );

      fold('DecisionService_Approval', false);

      // then
      // the box is where it was dragged to, at the size it was folded from
      expect(boundsOf('DecisionService_Approval'))
        .to.eql({ x: 400, y: 280, width: 300, height: 240 });
      expect(dividerY('DecisionService_Approval')).to.eql(400);

      // and the decisions came out under it rather than back where it was folded
      expect(boundsOf('Decision_Output'))
        .to.eql({ x: 420, y: 300, width: 120, height: 50 });
      expect(boundsOf('Decision_Encapsulated'))
        .to.eql({ x: 420, y: 420, width: 120, height: 50 });

      expect(hrefs('DecisionService_Approval', 'outputDecision'))
        .to.eql([ '#Decision_Output' ]);
      expect(hrefs('DecisionService_Approval', 'encapsulatedDecision'))
        .to.eql([ '#Decision_Encapsulated' ]);
    }
  );


  it('should put a move made while folded back on undo', async function() {

    // given
    await open.call(this, containmentXML);

    fold('DecisionService_Approval', true);

    viewer.get('modeling').moveShape(
      get('DecisionService_Approval'), { x: 300, y: 200 }
    );

    // when
    viewer.get('commandStack').undo();

    fold('DecisionService_Approval', false);

    // then
    // undoing the move has to take the record back with it, or the decisions come
    // out a screen away from the box they belong to
    expect(boundsOf('DecisionService_Approval'))
      .to.eql({ x: 100, y: 80, width: 300, height: 240 });
    expect(dividerY('DecisionService_Approval')).to.eql(200);
    expect(boundsOf('Decision_Output'))
      .to.eql({ x: 120, y: 100, width: 120, height: 50 });
    expect(boundsOf('Decision_Encapsulated'))
      .to.eql({ x: 120, y: 220, width: 120, height: 50 });
  });

});
