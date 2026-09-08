import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import Editor from '../../../helper/Editor';

import contextXML from '../../context.dmn';


describe('ContextEditor', function() {

  let testContainer;

  beforeEach(function() {
    testContainer = TestContainer.get(this);
  });

  async function createEditor(xml = contextXML) {
    const editor = new Editor({
      container: testContainer,
      dmnVersion: '1.5'
    });

    const { warnings } = await editor.importXML(xml, { open: false });
    const warningMessages = warnings.map(warning => warning.message).join('\n');

    expect(warnings, `${warningMessages}\n${xml}`).to.have.lengthOf(0);

    const contextView = editor.getViews().find(
      view => view.id === 'Decision_Score'
    );

    expect(contextView).to.exist;

    await editor.open(contextView);

    return editor;
  }

  it('should render editable context variable names', async function() {

    // given
    const editor = await createEditor();

    // when
    const variableInputs = testContainer.querySelectorAll(
      '.context-entry-variable .dms-input'
    );

    // then
    expect(variableInputs).to.have.lengthOf(2);
    expect(variableInputs[0].value).to.eql('Base');
    expect(variableInputs[1].value).to.eql('Bonus');

    editor.destroy();
  });


  it('should update variable with undo/redo and save/re-import', async function() {

    // given
    const editor = await createEditor();
    const activeViewer = editor.getActiveViewer();
    const rootElement = activeViewer.getRootElement();
    const contextExpression = rootElement.get('decisionLogic');
    const firstEntry = contextExpression.get('contextEntry')[0];
    const variable = firstEntry.get('variable');

    const context = activeViewer.get('context');
    const commandStack = activeViewer.get('commandStack');

    // when
    context.updateVariable(variable, { name: 'BaseAmount' });

    // then
    expect(variable.name).to.eql('BaseAmount');

    // when
    commandStack.undo();

    // then
    expect(variable.name).to.eql('Base');

    // when
    commandStack.redo();

    // then
    expect(variable.name).to.eql('BaseAmount');

    // when
    const { xml } = await editor.saveXML();

    editor.destroy();

    const reloadedEditor = await createEditor(xml);
    const reloadedViewer = reloadedEditor.getActiveViewer();
    const reloadedContext = reloadedViewer.getRootElement().get('decisionLogic');
    const reloadedVariable = reloadedContext.get('contextEntry')[0].get('variable');

    // then
    expect(reloadedVariable.name).to.eql('BaseAmount');

    reloadedEditor.destroy();
  });
});
