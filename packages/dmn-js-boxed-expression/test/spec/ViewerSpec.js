import * as sinon from 'sinon';
import { expect } from 'chai';


import TestContainer from 'mocha-test-container-support';

import axe from 'axe-core';

import {
  bootstrapViewer,
  inject,
  getLiteralExpression
} from 'test/TestHelper';

import Viewer from '../helper/Viewer';

import { domify } from 'min-dom';

import simpleXML from './literal-expression.dmn';
import bkmXML from './bkm-literal-expression.dmn';
import invocationXML from './invocation.dmn';


const singleStart = window.__env__ && window.__env__.SINGLE_START === 'viewer';


describe('Viewer', function() {

  let testContainer;

  beforeEach(function() {
    testContainer = TestContainer.get(this);
  });

  function createViewer(xml) {
    const viewer = new Viewer({
      container: testContainer
    });

    return viewer.importXML(xml);
  }


  // TODO(nikku): test re-import and #clear() interaction
  it.skip('should re-open, clearing the previous diagram');


  it('should import decision', function() {
    return createViewer(simpleXML);
  });


  (singleStart ? it.only : it)('should import business knowledge model', function() {
    return createViewer(bkmXML);
  });


  it('should render DMN 1.5 invocation', async function() {

    // given
    const viewer = new Viewer({
      container: testContainer,
      dmnVersion: '1.5'
    });

    // when
    const { warnings } = await viewer.importXML(invocationXML, { open: false });

    // then
    expect(warnings).to.have.lengthOf(0);

    const invocationView = viewer.getViews().find(view => view.id === 'Decision_Discount');

    expect(invocationView).to.exist;

    await viewer.open(invocationView);

    const invocation = testContainer.querySelector('.invocation-expression');

    expect(invocation).to.exist;
    expect(invocation.textContent).to.contain('Discount Rate');
    expect(invocation.textContent).to.contain('total');
    expect(invocation.textContent).to.contain('Order Total');
    expect(testContainer.textContent).to.not.contain('is not supported');
  });


  describe('#getRootElement', function() {

    beforeEach(bootstrapViewer(simpleXML, { container: testContainer }));

    it('should provide viewed decision', inject(function(viewer) {

      // when
      const decision = viewer.getRootElement();

      // then
      expect(decision).to.exist;
      expect(decision.id).to.eql('season');
    }));

  });


  describe('#attachTo', function() {

    let literalExpressionViewer;

    beforeEach(bootstrapViewer(simpleXML, { container: testContainer }));

    beforeEach(function() {
      literalExpressionViewer = getLiteralExpression();
    });


    it('should attach', function() {

      // given
      const container = domify('<div></div>');

      // when
      literalExpressionViewer.attachTo(container);

      // then
      expect(literalExpressionViewer._container.parentNode).to.equal(container);
    });


    it('should fire on attach', function() {

      // given
      const container = domify('<div></div>');

      const spy = sinon.spy();

      literalExpressionViewer.on('attach', spy);

      // when
      literalExpressionViewer.attachTo(container);

      // then
      expect(spy).to.have.been.called;
    });

  });


  describe('#detach', function() {

    let literalExpressionViewer;

    beforeEach(bootstrapViewer(simpleXML, { container: testContainer }));

    beforeEach(function() {
      literalExpressionViewer = getLiteralExpression();
    });


    it('should detach', function() {

      // when
      literalExpressionViewer.detach();

      // then
      expect(literalExpressionViewer._container.parentNode).to.not.exist;
    });


    it('should fire on attach', function() {

      // given
      const spy = sinon.spy();

      literalExpressionViewer.on('detach', spy);

      // when
      literalExpressionViewer.detach();

      // then
      expect(spy).to.have.been.called;
    });

  });


  describe('#destroy', function() {

    let literalExpressionViewer;

    beforeEach(bootstrapViewer(simpleXML, { container: testContainer }));

    beforeEach(function() {
      literalExpressionViewer = getLiteralExpression();
    });

    it('should destroy', function() {

      // when
      literalExpressionViewer.destroy();

      // then
      expect(literalExpressionViewer._container.parentNode).to.not.exist;
    });

  });


  describe('#on', function() {

    let literalExpressionViewer;

    beforeEach(bootstrapViewer(simpleXML, { container: testContainer }));

    beforeEach(function() {
      literalExpressionViewer = getLiteralExpression();
    });

    it('should add listener', function() {

      // when
      literalExpressionViewer.on('foo', () => {
        return 'bar';
      });

      // then
      const result = literalExpressionViewer.get('eventBus').fire('foo');

      expect(result).to.eql('bar');
    });

  });


  describe('#off', function() {

    let literalExpressionViewer;

    beforeEach(bootstrapViewer(simpleXML, { container: testContainer }));

    beforeEach(function() {
      literalExpressionViewer = getLiteralExpression();
    });

    it('should remove listener', function() {

      // given
      const listener = () => {
        return 'bar';
      };

      literalExpressionViewer.on('foo', listener);

      // when
      literalExpressionViewer.off('foo', listener);

      // then
      const result = literalExpressionViewer.get('eventBus').fire('foo');

      expect(result).to.not.exist;
    });

  });


  describe('accessibility', function() {

    beforeEach(bootstrapViewer(simpleXML, { container: testContainer }));

    it('should report no issues', async function() {

      // when
      const results = await axe.run(testContainer);

      // then
      expect(results.passes).to.be.not.empty;
      expect(results.violations).to.be.empty;
    });
  });
});
