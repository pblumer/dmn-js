import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import Viewer from '../../../helper/Viewer';

import relationXML from '../../relation.dmn';


describe('RelationViewer', function() {

  let testContainer;

  beforeEach(function() {
    testContainer = TestContainer.get(this);
  });

  it('should render DMN 1.5 relation columns and rows', async function() {

    // given
    const viewer = new Viewer({
      container: testContainer,
      dmnVersion: '1.5'
    });

    const { warnings } = await viewer.importXML(relationXML, { open: false });

    expect(warnings).to.have.lengthOf(0);

    const relationView = viewer.getViews().find(
      view => view.id === 'Decision_Relation'
    );

    expect(relationView).to.exist;

    // when
    await viewer.open(relationView);

    // then
    const relation = testContainer.querySelector('.relation-expression');
    const columns = testContainer.querySelectorAll('.relation-column');
    const rows = testContainer.querySelectorAll('.relation-row');

    expect(relation).to.exist;
    expect(columns).to.have.lengthOf(2);
    expect(columns[0].textContent).to.contain('name');
    expect(columns[1].textContent).to.contain('age');
    expect(rows).to.have.lengthOf(2);
    expect(rows[0].textContent).to.contain('Ann');
    expect(rows[0].textContent).to.contain('30');
    expect(rows[1].textContent).to.contain('Bob');
    expect(rows[1].textContent).to.contain('15');
    expect(rows[0].querySelector('.list-expression')).to.exist;
    expect(rows[1].querySelector('.list-expression')).to.exist;
    expect(testContainer.textContent).to.not.contain('is not supported');

    viewer.destroy();
  });
});
