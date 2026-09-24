import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import DrdModeler from '../../../helper/DrdModeler';

import containmentXML from '../../../fixtures/dmn/decision-service-containment-15.dmn';
import crossingXML from '../../../fixtures/dmn/decision-service-crossing-15.dmn';


/**
 * A Decision Service is drawn around things, never over them.
 *
 * The box is a background: §6.2.5 has it enclosing the decisions it names, and the
 * paragraph under Figure 6-9 has requirements crossing its border freely — which
 * only reads as a diagram if the border is behind them.
 *
 * diagram-js paints in document order and appends what is added last. An author who
 * draws a requirement first and the box afterwards, which is the order a diagram is
 * usually built in, got a box laid over that requirement: the arrow disappeared
 * inside it and there was nothing on the canvas to say where it had gone.
 *
 * Importing was never affected — DrdImporter adds every Decision Service before the
 * rest of the DRG — which is why a stored diagram looked right and the same diagram
 * drawn by hand did not.
 *
 * Dragging one was affected in the same way and for the same reason, which is what
 * the second block below is about: diagram-js moves a shape by taking it out of its
 * parent's children and putting it back, and putting it back with no index asked for
 * puts it at the end. A stored diagram therefore drew correctly right up to the
 * moment the author nudged the box, at which point the requirement crossing its
 * border vanished under it.
 */
describe('features/modeling - DMN 1.5 Decision Service paint order', function() {

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

  /**
   * Whether `a` is painted over `b`: document order is what decides it, and reading
   * it off the drawing is the only way to be sure — a claim about which command ran
   * first is a claim about the code, not about what the author sees.
   */
  const paintsOver = (a, b) => {
    const registry = viewer.get('elementRegistry');

    // querySelectorAll answers in document order, which is paint order: later is
    // on top. A shape drawn inside another's group therefore counts as over it,
    // which is exactly what a member of a Decision Service is.
    const drawn = Array.from(
      viewer.get('canvas')._svg.querySelectorAll('.djs-element')
    );

    return drawn.indexOf(registry.getGraphics(a)) >
      drawn.indexOf(registry.getGraphics(b));
  };

  const drawService = () => {
    const service = viewer.get('elementFactory').createShape({
      type: 'dmn:DecisionService'
    });

    viewer.get('modeling').createShape(
      service,
      { x: 700, y: 400, width: 300, height: 240 },
      viewer.get('canvas').getRootElement()
    );

    return service;
  };


  it('should go behind a requirement that was drawn before it', function() {

    // when
    const service = drawService();

    // then
    expect(paintsOver(service, get('InformationRequirement_Output'))).to.be.false;
  });


  it('should go behind the decisions that were drawn before it', function() {

    // when
    const service = drawService();

    // then
    expect(paintsOver(service, get('Decision_Unrelated'))).to.be.false;
    expect(paintsOver(service, get('Decision_Boundary'))).to.be.false;
  });


  it('should still be behind its own members, which are drawn in it', function() {

    // given
    const service = drawService();

    // when
    viewer.get('modeling').moveShape(
      get('Decision_Unrelated'), { x: 500, y: 200 }, service
    );

    // then
    // a member is a child, so it is drawn inside the service's own group — the box
    // holding it is the one thing that may be under it
    expect(get('Decision_Unrelated').parent).to.equal(service);
    expect(paintsOver(get('Decision_Unrelated'), service)).to.be.true;
  });


  it('should go behind even when a caller asks for the front', function() {

    // given
    const service = viewer.get('elementFactory').createShape({
      type: 'dmn:DecisionService'
    });

    const root = viewer.get('canvas').getRootElement();

    // when
    // this was a default once, and a caller could overrule it. It is an invariant
    // now: there is no diagram in which a Decision Service drawn over the
    // requirements crossing its border is what DMN's overlay means.
    viewer.get('commandStack').execute('shape.create', {
      shape: service,
      position: { x: 850, y: 520 },
      parent: root,
      parentIndex: root.children.length
    });

    // then
    expect(paintsOver(service, get('Decision_Unrelated'))).to.be.false;
  });


  it('should start behind a Decision Service that is already there', function() {

    // when
    const service = drawService();

    // then
    // two boxes may overlap, because a decision may belong to two services; the one
    // just drawn is the one that goes underneath, along with what the other holds
    expect(paintsOver(service, get('DecisionService_Approval'))).to.be.false;
    expect(paintsOver(service, get('Decision_Output'))).to.be.false;
  });

});


describe('features/modeling - DMN 1.5 Decision Service paint order on move',
  function() {

    let modeler, viewer;

    beforeEach(async function() {
      modeler = new DrdModeler({
        container: TestContainer.get(this),
        dmnVersion: '1.5'
      });

      const { warnings } = await modeler.importXML(crossingXML);

      expect(warnings.map(warning => warning.message).join('\n')).to.eql('');

      viewer = modeler.getActiveViewer();
    });

    afterEach(function() {
      modeler && modeler.destroy();

      modeler = viewer = null;
    });

    const get = (id) => viewer.get('elementRegistry').get(id);

    const paintsOver = (a, b) => {
      const registry = viewer.get('elementRegistry');

      const drawn = Array.from(
        viewer.get('canvas')._svg.querySelectorAll('.djs-element')
      );

      return drawn.indexOf(registry.getGraphics(a)) >
        drawn.indexOf(registry.getGraphics(b));
    };


    it('should be behind the requirement crossing its border, as imported',
      function() {

        // then
        expect(
          paintsOver(get('DecisionService_Credit'),
            get('IR_Amount'))
        ).to.be.false;
      });


    it('should still be behind it after it is dragged', function() {

      // given
      const service = get('DecisionService_Credit');

      // when
      viewer.get('modeling').moveShape(service, { x: 20, y: 0 });

      // then
      expect(
        paintsOver(service, get('IR_Amount'))
      ).to.be.false;
    });


    it('should still be behind it after the drag is undone and redone',
      function() {

        // given
        const service = get('DecisionService_Credit');

        viewer.get('modeling').moveShape(service, { x: 20, y: 0 });

        // when
        viewer.get('commandStack').undo();
        viewer.get('commandStack').redo();

        // then
        expect(
          paintsOver(service, get('IR_Amount'))
        ).to.be.false;
      });


    it('should go behind even when a caller asks for the front', function() {

      // given
      const service = get('DecisionService_Credit');

      const root = viewer.get('canvas').getRootElement();

      // when
      viewer.get('commandStack').execute('shape.move', {
        shape: service,
        delta: { x: 20, y: 0 },
        newParent: root,
        newParentIndex: root.children.length - 1,
        hints: {}
      });

      // then
      expect(
        paintsOver(service, get('IR_Amount'))
      ).to.be.false;
    });


    // The point of an invariant is that it holds for gestures nobody enumerated.
    // Each of these is a different command, and none of them knows anything about
    // Decision Services; they are here so that a later one, equally ignorant, is
    // caught by a test rather than by a reader whose arrow has gone missing.
    [
      {
        what: 'the service is resized',
        act: () => viewer.get('modeling').resizeShape(get('DecisionService_Credit'),
          { x: 100, y: 80, width: 400, height: 340 })
      },
      {
        what: 'something outside it is moved',
        act: () => viewer.get('modeling').moveShape(
          get('InputData_Amount'), { x: -20, y: 20 })
      },
      {
        what: 'a member is moved',
        act: () => viewer.get('modeling').moveShape(
          get('Decision_Afford'), { x: 10, y: 0 })
      },
      {
        what: 'the service is moved with the keyboard',
        act: () => {
          viewer.get('selection').select(get('DecisionService_Credit'));

          viewer.get('editorActions').trigger('moveSelection', {
            direction: 'right', accelerated: false
          });
        }
      },
      {
        what: 'the name is moved',
        act: () => viewer.get('modeling').updateDecisionServiceLabelBounds(
          get('DecisionService_Credit'), { x: 300, y: 100, width: 80, height: 20 })
      },
      {
        what: 'the service is renamed',
        act: () => viewer.get('modeling').updateProperties(
          get('DecisionService_Credit'), { name: 'Renamed' })
      },
      {
        what: 'a drag is undone',
        act: () => {
          viewer.get('modeling').moveShape(
            get('DecisionService_Credit'), { x: 20, y: 0 });

          viewer.get('commandStack').undo();
        }
      },
      {
        what: 'the service is folded and unfolded',
        act: () => {
          const modeling = viewer.get('modeling');

          modeling.collapseDecisionService(get('DecisionService_Credit'), true);
          modeling.collapseDecisionService(get('DecisionService_Credit'), false);
        }
      }
    ].forEach(({ what, act }) => {

      it('should still be behind the crossing requirement after ' + what,
        function() {

          // when
          act();

          // then
          expect(
            paintsOver(get('DecisionService_Credit'), get('IR_Amount'))
          ).to.be.false;
        });
    });

  });
