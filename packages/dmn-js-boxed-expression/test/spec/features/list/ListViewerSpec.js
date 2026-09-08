import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import Viewer from '../../../helper/Viewer';

import listXML from '../../list.dmn';


describe('ListViewer', function() {

  let testContainer;

  beforeEach(function() {
    testContainer = TestContainer.get(this);
  });

  it('should render DMN 1.5 list entries', async function() {

    // given
    const viewer = new Viewer({
      container: testContainer,
      dmnVersion: '1.5'
    });

    const { warnings } = await viewer.importXML(listXML, { open: false });

    expect(warnings).to.have.lengthOf(0);

    const listView = viewer.getViews().find(
      view => view.id === 'Decision_List'
    );

    expect(listView).to.exist;

    // when
    await viewer.open(listView);

    // then
    const list = testContainer.querySelector('.list-expression');
    const entries = testContainer.querySelectorAll('.list-entry');

    expect(list).to.exist;
    expect(entries).to.have.lengthOf(3);
    expect(entries[0].textContent).to.contain('1');
    expect(entries[1].textContent).to.contain('2');
    expect(entries[2].textContent).to.contain('3');
    expect(testContainer.textContent).to.not.contain('is not supported');

    viewer.destroy();
  });
});
