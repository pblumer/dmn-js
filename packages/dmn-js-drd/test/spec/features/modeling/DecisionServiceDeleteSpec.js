import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import DrdModeler from '../../../helper/DrdModeler';

import containmentXML from '../../../fixtures/dmn/decision-service-containment-15.dmn';


/**
 * Deleting a Decision Service never takes a Decision with it.
 *
 * "Decision services are defined as overlays and therefore do not encapsulate the
 * decisions within them" (DMN 1.5 §6.2.5). The box is drawn around its members and
 * names them; it does not own them. Each is a DRG element in its own right, and
 * Figure 6-9 has a decision outside the box depending on one inside — which is only
 * possible because the box is an overlay rather than a container.
 *
 * diagram-js reads containment the other way: a shape's children are part of it, so
 * deleting one deletes them. Drawing the service as a container — which is what
 * makes it carry its members when moved and paint beneath them — therefore bought a
 * silent way to destroy a model: deleting the box took two decisions, their logic
 * and their requirements out of the DRG with it.
 */
describe('features/modeling - DMN 1.5 Decision Service delete', function() {

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

  const boundsOf = (id) => {
    const { x, y, width, height } = get(id).businessObject.di.bounds;

    return { x, y, width, height };
  };


  it('should leave its decisions in the DRG', async function() {

    // given
    await open.call(this, containmentXML);

    // when
    viewer.get('modeling').removeShape(get('DecisionService_Approval'));

    // then
    expect(drgIds()).to.eql([
      'Decision_Output',
      'Decision_Encapsulated',
      'Decision_Boundary',
      'Decision_Unrelated'
    ]);
  });


  it('should leave them on the canvas, where they were drawn', async function() {

    // given
    await open.call(this, containmentXML);

    const before = {
      output: boundsOf('Decision_Output'),
      encapsulated: boundsOf('Decision_Encapsulated')
    };

    // when
    viewer.get('modeling').removeShape(get('DecisionService_Approval'));

    // then
    expect(get('Decision_Output')).to.exist;
    expect(get('Decision_Encapsulated')).to.exist;
    expect(get('Decision_Output').parent)
      .to.equal(viewer.get('canvas').getRootElement());
    expect(boundsOf('Decision_Output')).to.eql(before.output);
    expect(boundsOf('Decision_Encapsulated')).to.eql(before.encapsulated);
  });


  it('should leave the requirement drawn between two of them', async function() {

    // given
    await open.call(this, containmentXML);

    // when
    viewer.get('modeling').removeShape(get('DecisionService_Approval'));

    // then
    // it belongs to the decision that requires it, not to the box that was drawn
    // around the two of them
    expect(get('InformationRequirement_Output')).to.exist;
    expect(get('InformationRequirement_Output').source)
      .to.equal(get('Decision_Encapsulated'));
    expect(get('InformationRequirement_Output').target)
      .to.equal(get('Decision_Output'));
  });


  it('should put them back inside on undo', async function() {

    // given
    await open.call(this, containmentXML);

    viewer.get('modeling').removeShape(get('DecisionService_Approval'));

    // when
    viewer.get('commandStack').undo();

    // then
    expect(get('DecisionService_Approval')).to.exist;
    expect(get('Decision_Output').parent).to.equal(get('DecisionService_Approval'));
    expect(get('Decision_Encapsulated').parent)
      .to.equal(get('DecisionService_Approval'));
    expect(get('DecisionService_Approval').businessObject.get('outputDecision')
      .map(reference => reference.href)).to.eql([ '#Decision_Output' ]);
    expect(get('DecisionService_Approval').businessObject
      .get('encapsulatedDecision')
      .map(reference => reference.href)).to.eql([ '#Decision_Encapsulated' ]);
  });


  it('should give a folded service its decisions back before it goes',
    async function() {

      // given
      await open.call(this, containmentXML);

      viewer.get('modeling')
        .collapseDecisionService(get('DecisionService_Approval'), true);

      // when
      viewer.get('modeling').removeShape(get('DecisionService_Approval'));

      // then
      // a folded service is holding their depiction; deleting it while folded would
      // leave them in the DRG with nothing drawing them and no way back
      expect(get('Decision_Output')).to.exist;
      expect(get('Decision_Encapsulated')).to.exist;
      expect(drgIds()).to.include('Decision_Output');
      expect(drgIds()).to.include('Decision_Encapsulated');
      expect(boundsOf('Decision_Output'))
        .to.eql({ x: 120, y: 100, width: 120, height: 50 });
    }
  );

});
