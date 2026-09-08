import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import Editor from '../../../helper/Editor';

import invocationXML from '../../invocation.dmn';


describe('InvocationEditor', function() {

  let testContainer;

  beforeEach(function() {
    testContainer = TestContainer.get(this);
  });

  async function createEditor(xml = invocationXML) {
    const editor = new Editor({
      container: testContainer,
      dmnVersion: '1.5'
    });

    const { warnings } = await editor.importXML(xml, { open: false });

    expect(warnings).to.have.lengthOf(0);

    const invocationView = editor.getViews().find(
      view => view.id === 'Decision_Discount'
    );

    expect(invocationView).to.exist;

    await editor.open(invocationView);

    return editor;
  }

  it('should render editable binding parameter', async function() {

    // given
    const editor = await createEditor();

    // when
    const parameterInput = testContainer.querySelector(
      '.invocation-parameter .dms-input'
    );

    // then
    expect(parameterInput).to.exist;
    expect(parameterInput.value).to.eql('total');

    editor.destroy();
  });


  it('should update binding parameter with undo/redo and save/re-import', async function() {

    // given
    const editor = await createEditor();
    const activeViewer = editor.getActiveViewer();
    const rootElement = activeViewer.getRootElement();
    const invocationExpression = rootElement.get('decisionLogic');
    const binding = invocationExpression.get('binding')[0];
    const parameter = binding.get('parameter');

    const invocation = activeViewer.get('invocation');
    const commandStack = activeViewer.get('commandStack');

    // when
    invocation.updateParameter(parameter, { name: 'amount' });

    // then
    expect(parameter.name).to.eql('amount');

    // when
    commandStack.undo();

    // then
    expect(parameter.name).to.eql('total');

    // when
    commandStack.redo();

    // then
    expect(parameter.name).to.eql('amount');

    // when
    const { xml } = await editor.saveXML();

    editor.destroy();

    const reloadedEditor = await createEditor(xml);
    const reloadedViewer = reloadedEditor.getActiveViewer();
    const reloadedInvocation = reloadedViewer.getRootElement().get('decisionLogic');
    const reloadedParameter = reloadedInvocation.get('binding')[0].get('parameter');

    // then
    expect(reloadedParameter.name).to.eql('amount');

    reloadedEditor.destroy();
  });
});
