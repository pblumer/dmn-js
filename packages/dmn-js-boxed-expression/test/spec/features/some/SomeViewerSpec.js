import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import Viewer from '../../../helper/Viewer';

import someXML from '../../some.dmn';


describe('SomeViewer', function() {

  let testContainer;

  beforeEach(function() {
    testContainer = TestContainer.get(this);
  });

  it('should render DMN 1.5 some expression', async function() {

    // given
    const viewer = new Viewer({
      container: testContainer,
      dmnVersion: '1.5'
    });

    const { warnings } = await viewer.importXML(someXML, { open: false });

    expect(warnings).to.have.lengthOf(0);

    const someView = viewer.getViews().find(
      view => view.id === 'Decision_Some'
    );

    expect(someView).to.exist;

    // when
    await viewer.open(someView);

    // then
    const someExpression = testContainer.querySelector('.some-expression');
    const iterator = testContainer.querySelector('.some-iterator');
    const inExpression = testContainer.querySelector('.some-in');
    const satisfiesExpression = testContainer.querySelector('.some-satisfies');

    expect(someExpression).to.exist;
    expect(iterator).to.exist;
    expect(iterator.textContent).to.contain('x');
    expect(inExpression).to.exist;
    expect(satisfiesExpression).to.exist;
    expect(inExpression.textContent).to.contain('[-1, 0, 2]');
    expect(satisfiesExpression.textContent).to.contain('x > 0');
    expect(inExpression.querySelector('.textarea')).to.exist;
    expect(satisfiesExpression.querySelector('.textarea')).to.exist;
    expect(testContainer.textContent).to.not.contain('is not supported');

    viewer.destroy();
  });
});
