import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import Viewer from '../../../helper/Viewer';

import conditionalXML from '../../conditional.dmn';


describe('ConditionalViewer', function() {

  let testContainer;

  beforeEach(function() {
    testContainer = TestContainer.get(this);
  });

  it('should render DMN 1.5 conditional branches', async function() {

    // given
    const viewer = new Viewer({
      container: testContainer,
      dmnVersion: '1.5'
    });

    const { warnings } = await viewer.importXML(conditionalXML, { open: false });

    expect(warnings).to.have.lengthOf(0);

    const conditionalView = viewer.getViews().find(
      view => view.id === 'Decision_Conditional'
    );

    expect(conditionalView).to.exist;

    // when
    await viewer.open(conditionalView);

    // then
    const conditional = testContainer.querySelector('.conditional-expression');
    const ifBranch = testContainer.querySelector('.conditional-if');
    const thenBranch = testContainer.querySelector('.conditional-then');
    const elseBranch = testContainer.querySelector('.conditional-else');

    expect(conditional).to.exist;
    expect(ifBranch).to.exist;
    expect(thenBranch).to.exist;
    expect(elseBranch).to.exist;
    expect(ifBranch.textContent).to.contain('score >= 60');
    expect(thenBranch.textContent).to.contain('"pass"');
    expect(elseBranch.textContent).to.contain('"fail"');
    expect(ifBranch.querySelector('.literal-expression')).to.exist;
    expect(thenBranch.querySelector('.literal-expression')).to.exist;
    expect(elseBranch.querySelector('.literal-expression')).to.exist;
    expect(testContainer.textContent).to.not.contain('is not supported');

    viewer.destroy();
  });
});
