import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import Viewer from '../../../helper/Viewer';

import forXML from '../../for.dmn';


describe('ForViewer', function() {

  let testContainer;

  beforeEach(function() {
    testContainer = TestContainer.get(this);
  });

  it('should render DMN 1.5 for expression', async function() {

    // given
    const viewer = new Viewer({
      container: testContainer,
      dmnVersion: '1.5'
    });

    const { warnings } = await viewer.importXML(forXML, { open: false });

    expect(warnings).to.have.lengthOf(0);

    const forView = viewer.getViews().find(
      view => view.id === 'Decision_For'
    );

    expect(forView).to.exist;

    // when
    await viewer.open(forView);

    // then
    const forExpression = testContainer.querySelector('.for-expression');
    const iterator = testContainer.querySelector('.for-iterator');
    const inExpression = testContainer.querySelector('.for-in');
    const returnExpression = testContainer.querySelector('.for-return');

    expect(forExpression).to.exist;
    expect(iterator).to.exist;
    expect(iterator.textContent).to.contain('x');
    expect(inExpression).to.exist;
    expect(returnExpression).to.exist;
    expect(inExpression.textContent).to.contain('[1, 2, 3]');
    expect(returnExpression.textContent).to.contain('x * 2');
    expect(inExpression.querySelector('.textarea')).to.exist;
    expect(returnExpression.querySelector('.textarea')).to.exist;
    expect(testContainer.textContent).to.not.contain('is not supported');

    viewer.destroy();
  });
});
