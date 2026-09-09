import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import Viewer from '../../../helper/Viewer';

import filterXML from '../../filter.dmn';


describe('FilterViewer', function() {

  let testContainer;

  beforeEach(function() {
    testContainer = TestContainer.get(this);
  });

  it('should render DMN 1.5 filter expression', async function() {

    // given
    const viewer = new Viewer({
      container: testContainer,
      dmnVersion: '1.5'
    });

    const { warnings } = await viewer.importXML(filterXML, { open: false });

    expect(warnings).to.have.lengthOf(0);

    const filterView = viewer.getViews().find(
      view => view.id === 'Decision_Filter'
    );

    expect(filterView).to.exist;

    // when
    await viewer.open(filterView);

    // then
    const filterExpression = testContainer.querySelector('.filter-expression');
    const inExpression = testContainer.querySelector('.filter-in');
    const matchExpression = testContainer.querySelector('.filter-match');

    expect(filterExpression).to.exist;
    expect(inExpression).to.exist;
    expect(matchExpression).to.exist;
    expect(inExpression.textContent).to.contain('[-1, 0, 2, 3]');
    expect(matchExpression.textContent).to.contain('item > 0');
    expect(inExpression.querySelector('.textarea')).to.exist;
    expect(matchExpression.querySelector('.textarea')).to.exist;
    expect(testContainer.textContent).to.not.contain('is not supported');

    viewer.destroy();
  });
});
