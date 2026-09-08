import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import Viewer from '../../../helper/Viewer';

import contextXML from '../../context.dmn';


describe('ContextViewer', function() {

  let testContainer;

  beforeEach(function() {
    testContainer = TestContainer.get(this);
  });

  it('should render DMN 1.5 context entries', async function() {

    // given
    const viewer = new Viewer({
      container: testContainer,
      dmnVersion: '1.5'
    });

    const { warnings } = await viewer.importXML(contextXML, { open: false });

    expect(warnings).to.have.lengthOf(0);

    const contextView = viewer.getViews().find(
      view => view.id === 'Decision_Score'
    );

    expect(contextView).to.exist;

    // when
    await viewer.open(contextView);

    // then
    const context = testContainer.querySelector('.context-expression');
    const entries = testContainer.querySelectorAll('.context-entry');

    expect(context).to.exist;
    expect(entries).to.have.lengthOf(3);

    expect(entries[0].textContent).to.contain('Base');
    expect(entries[0].textContent).to.contain('Points * 2');

    expect(entries[1].textContent).to.contain('Bonus');
    expect(entries[1].textContent).to.contain('Base + 10');

    expect(entries[2].textContent).to.contain('Bonus');
    expect(testContainer.textContent).to.not.contain('is not supported');

    viewer.destroy();
  });
});
