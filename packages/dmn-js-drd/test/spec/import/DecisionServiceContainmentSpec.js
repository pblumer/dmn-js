import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import DrdModeler from '../../helper/DrdModeler';

import containmentXML from '../../fixtures/dmn/decision-service-containment-15.dmn';
import detachedMembershipXML from '../../fixtures/dmn/decision-service-detached-membership-15.dmn';
import mismatchedMembershipXML from '../../fixtures/dmn/decision-service-imported-mismatched-membership-15.dmn';


describe('import - DMN 1.5 Decision Service containment', function() {

  let modeler;

  afterEach(function() {
    modeler && modeler.destroy();

    modeler = null;
  });


  async function open(xml) {
    modeler = new DrdModeler({
      container: TestContainer.get(this),
      dmnVersion: '1.5'
    });

    const { warnings } = await modeler.importXML(xml);

    expect(warnings.map(warning => warning.message).join('\n')).to.eql('');

    return modeler.getActiveViewer();
  }

  function refs(element, property) {
    return element.businessObject
      .get(property)
      .map(reference => reference.href)
      .sort();
  }


  it('should nest the Decisions a Decision Service draws around', async function() {

    // when
    const viewer = await open.call(this, containmentXML);
    const elementRegistry = viewer.get('elementRegistry');

    const decisionService = elementRegistry.get('DecisionService_Approval');

    // then
    expect(elementRegistry.get('Decision_Output').parent).to.equal(decisionService);
    expect(elementRegistry.get('Decision_Encapsulated').parent).to.equal(decisionService);

    expect(decisionService.children.map(child => child.id).sort()).to.eql([
      'Decision_Encapsulated',
      'Decision_Output'
    ]);
  });


  it('should leave an input Decision outside the Decision Service', async function() {

    // when
    const viewer = await open.call(this, containmentXML);
    const elementRegistry = viewer.get('elementRegistry');

    const boundary = elementRegistry.get('Decision_Boundary');

    // then
    // the boundary is drawn inside the box, but inputDecision names what the
    // CALLER supplies - it is not part of the service
    expect(boundary.parent).to.equal(viewer.get('canvas').getRootElement());
  });


  it('should leave a Decision the Decision Service does not name outside', async function() {

    // when
    const viewer = await open.call(this, containmentXML);
    const elementRegistry = viewer.get('elementRegistry');

    // then
    expect(elementRegistry.get('Decision_Unrelated').parent)
      .to.equal(viewer.get('canvas').getRootElement());
  });


  it('should leave a member the Decision Service does not draw around outside',
    async function() {

      // when
      const viewer = await open.call(this, detachedMembershipXML);
      const elementRegistry = viewer.get('elementRegistry');

      // then
      expect(elementRegistry.get('Decision_Detached').parent)
        .to.equal(viewer.get('canvas').getRootElement());

      expect(elementRegistry.get('DecisionService_Approval').children).to.be.empty;
    }
  );


  it('should paint the Decision Service beneath what it contains', async function() {

    // when
    const viewer = await open.call(this, containmentXML);
    const elementRegistry = viewer.get('elementRegistry');

    const decisionService = elementRegistry.get('DecisionService_Approval');

    const painted = Array.prototype.map.call(
      viewer.get('canvas').getContainer().querySelectorAll('.djs-element'),
      gfx => gfx.getAttribute('data-element-id')
    );

    // then
    // SVG paints in document order, so the box has to come before what it holds;
    // imported last it covered its own contents
    expect(painted.indexOf('Decision_Output'))
      .to.be.above(painted.indexOf(decisionService.id));
  });


  it('should carry the contained Decisions when the Decision Service moves',
    async function() {

      // given
      const viewer = await open.call(this, containmentXML);
      const elementRegistry = viewer.get('elementRegistry');
      const modeling = viewer.get('modeling');

      const decisionService = elementRegistry.get('DecisionService_Approval'),
            output = elementRegistry.get('Decision_Output'),
            unrelated = elementRegistry.get('Decision_Unrelated');

      // when
      modeling.moveElements([ decisionService ], { x: 50, y: 40 });

      // then
      expect({ x: output.x, y: output.y }).to.eql({ x: 170, y: 140 });

      // and the Decision it does not contain stays put
      expect({ x: unrelated.x, y: unrelated.y }).to.eql({ x: 260, y: 220 });
    }
  );


  it('should keep the membership a moved Decision Service declares',
    async function() {

      // given
      const viewer = await open.call(this, containmentXML);
      const elementRegistry = viewer.get('elementRegistry');
      const modeling = viewer.get('modeling');

      const decisionService = elementRegistry.get('DecisionService_Approval');

      // when
      modeling.moveElements([ decisionService ], { x: 50, y: 40 });

      // then
      expect(refs(decisionService, 'outputDecision')).to.eql([ '#Decision_Output' ]);
      expect(refs(decisionService, 'encapsulatedDecision'))
        .to.eql([ '#Decision_Encapsulated' ]);
      expect(refs(decisionService, 'inputDecision')).to.eql([ '#Decision_Boundary' ]);
    }
  );


  it('should not nest on a membership its geometry contradicts', async function() {

    // when
    // both members sit in the upper compartment, so the geometry says both are
    // output decisions while the document says one is encapsulated; nesting must
    // not quietly rewrite either
    const viewer = await open.call(this, mismatchedMembershipXML);
    const elementRegistry = viewer.get('elementRegistry');

    const decisionService = elementRegistry.get('DecisionService_Approval');

    // then
    expect(refs(decisionService, 'outputDecision')).to.eql([ '#Decision_Output' ]);
    expect(refs(decisionService, 'encapsulatedDecision'))
      .to.eql([ '#Decision_Encapsulated' ]);
  });

});
