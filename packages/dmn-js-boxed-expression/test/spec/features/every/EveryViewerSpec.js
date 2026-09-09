import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import Viewer from '../../../helper/Viewer';

import everyXML from '../../every.dmn';


describe('EveryViewer', function() {

  let testContainer;

  beforeEach(function() {
    testContainer = TestContainer.get(this);
  });

  it('should render DMN 1.5 every expression', async function() {

    // given
    const viewer = new Viewer({
      container: testContainer,
      dmnVersion: '1.5'
    });

    const { warnings } = await viewer.importXML(everyXML, { open: false });

    expect(warnings).to.have.lengthOf(0);

    const everyView = viewer.getViews().find(
      view => view.id === 'Decision_Every'
    );

    expect(everyView).to.exist;

    // when
    await viewer.open(everyView);

    // then
    const everyExpression = testContainer.querySelector('.every-expression');
    const iterator = testContainer.querySelector('.every-iterator');
    const inExpression = testContainer.querySelector('.every-in');
    const satisfiesExpression = testContainer.querySelector('.every-satisfies');

    expect(everyExpression).to.exist;
    expect(iterator).to.exist;
    expect(iterator.textContent).to.contain('x');
    expect(inExpression).to.exist;
    expect(satisfiesExpression).to.exist;
    expect(inExpression.textContent).to.contain('[1, 2, 3]');
    expect(satisfiesExpression.textContent).to.contain('x > 0');
    expect(inExpression.querySelector('.textarea')).to.exist;
    expect(satisfiesExpression.querySelector('.textarea')).to.exist;
    expect(testContainer.textContent).to.not.contain('is not supported');

    viewer.destroy();
  });
});
