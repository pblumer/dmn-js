import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import Editor from '../../../helper/Editor';

import authoringXML from '../../authoring.dmn';
import everyXML from '../../every.dmn';
import filterXML from '../../filter.dmn';
import forXML from '../../for.dmn';
import someXML from '../../some.dmn';


describe('DMN 1.5 iterator and filter authoring', function() {

  let testContainer;

  beforeEach(function() {
    testContainer = TestContainer.get(this);
  });

  async function createEditor(xml, viewId) {
    const editor = new Editor({
      container: testContainer,
      dmnVersion: '1.5'
    });

    const { warnings } = await editor.importXML(xml, { open: false });
    const warningMessages = warnings.map(warning => warning.message).join('\n');

    expect(warnings, warningMessages).to.have.lengthOf(0);

    const view = editor.getViews().find(candidate => candidate.id === viewId);

    expect(view).to.exist;

    await editor.open(view);

    return editor;
  }

  function getLogic(editor) {
    return editor.getActiveViewer().getRootElement().get('decisionLogic');
  }

  it('should expose editable iterator variables for for, every and some', async function() {
    const cases = [
      { xml: forXML, viewId: 'Decision_For', selector: '.for-iterator .dms-input', value: 'x' },
      { xml: everyXML, viewId: 'Decision_Every', selector: '.every-iterator .dms-input', value: 'x' },
      { xml: someXML, viewId: 'Decision_Some', selector: '.some-iterator .dms-input', value: 'x' }
    ];

    for (const testCase of cases) {
      const editor = await createEditor(testCase.xml, testCase.viewId);
      const input = testContainer.querySelector(testCase.selector);

      expect(input).to.exist;
      expect(input.value).to.eql(testCase.value);

      editor.destroy();
    }
  });


  it('should update iterator variables with undo/redo and save/re-import', async function() {
    const cases = [
      { xml: forXML, viewId: 'Decision_For', type: 'dmn:For' },
      { xml: everyXML, viewId: 'Decision_Every', type: 'dmn:Every' },
      { xml: someXML, viewId: 'Decision_Some', type: 'dmn:Some' }
    ];

    for (const testCase of cases) {
      const editor = await createEditor(testCase.xml, testCase.viewId);
      const activeViewer = editor.getActiveViewer();
      const expressionAuthoring = activeViewer.get('expressionAuthoring');
      const commandStack = activeViewer.get('commandStack');
      const expression = getLogic(editor);

      expect(expression.$type).to.eql(testCase.type);
      expect(expression.get('iteratorVariable')).to.eql('x');

      expressionAuthoring.updateIteratorVariable(expression, 'item');
      expect(expression.get('iteratorVariable')).to.eql('item');

      commandStack.undo();
      expect(expression.get('iteratorVariable')).to.eql('x');

      commandStack.redo();
      expect(expression.get('iteratorVariable')).to.eql('item');

      const { xml } = await editor.saveXML();
      editor.destroy();

      const reloadedEditor = await createEditor(xml, testCase.viewId);
      const reloadedExpression = getLogic(reloadedEditor);

      expect(reloadedExpression.$type).to.eql(testCase.type);
      expect(reloadedExpression.get('iteratorVariable')).to.eql('item');

      reloadedEditor.destroy();
    }
  });


  it('should edit filter child expressions with undo/redo and save/re-import', async function() {
    const editor = await createEditor(filterXML, 'Decision_Filter');
    const activeViewer = editor.getActiveViewer();
    const literalExpression = activeViewer.get('literalExpression');
    const commandStack = activeViewer.get('commandStack');
    const filter = getLogic(editor);
    const match = filter.get('match').get('value');

    literalExpression.setText(match, 'item >= 2');
    expect(match.get('text')).to.eql('item >= 2');

    commandStack.undo();
    expect(match.get('text')).to.eql('item > 0');

    commandStack.redo();
    expect(match.get('text')).to.eql('item >= 2');

    const { xml } = await editor.saveXML();
    editor.destroy();

    const reloadedEditor = await createEditor(xml, 'Decision_Filter');
    const reloadedFilter = getLogic(reloadedEditor);

    expect(reloadedFilter.get('match').get('value').get('text')).to.eql('item >= 2');

    reloadedEditor.destroy();
  });


  it('should expose root expression creation choices', async function() {
    const editor = await createEditor(authoringXML, 'Decision_Authoring');
    const select = testContainer.querySelector('.expression-type-select');

    expect(select).to.exist;

    const values = Array.from(select.options).map(option => option.value);

    expect(values).to.include('dmn:For');
    expect(values).to.include('dmn:Every');
    expect(values).to.include('dmn:Some');
    expect(values).to.include('dmn:Filter');

    editor.destroy();
  });


  it('should create for, every, some and filter with undo/redo and save/re-import', async function() {
    const cases = [
      { type: 'dmn:For', resultProperty: 'return', iterator: true },
      { type: 'dmn:Every', resultProperty: 'satisfies', iterator: true },
      { type: 'dmn:Some', resultProperty: 'satisfies', iterator: true },
      { type: 'dmn:Filter', resultProperty: 'match', iterator: false }
    ];

    for (const testCase of cases) {
      const editor = await createEditor(authoringXML, 'Decision_Authoring');
      const activeViewer = editor.getActiveViewer();
      const rootElement = activeViewer.getRootElement();
      const expressionAuthoring = activeViewer.get('expressionAuthoring');
      const commandStack = activeViewer.get('commandStack');

      expressionAuthoring.replaceRootExpression(rootElement, testCase.type);

      let expression = rootElement.get('decisionLogic');

      expect(expression.$type).to.eql(testCase.type);
      expect(expression.get('in').get('value').$type).to.eql('dmn:LiteralExpression');
      expect(expression.get(testCase.resultProperty).get('value').$type).to.eql('dmn:LiteralExpression');

      if (testCase.iterator) {
        expect(expression.get('iteratorVariable')).to.eql('item');
      }

      commandStack.undo();
      expect(rootElement.get('decisionLogic').$type).to.eql('dmn:LiteralExpression');

      commandStack.redo();
      expression = rootElement.get('decisionLogic');
      expect(expression.$type).to.eql(testCase.type);

      const { xml } = await editor.saveXML();
      editor.destroy();

      const reloadedEditor = await createEditor(xml, 'Decision_Authoring');
      const reloadedExpression = getLogic(reloadedEditor);

      expect(reloadedExpression.$type).to.eql(testCase.type);
      expect(reloadedExpression.get('in').get('value').$type).to.eql('dmn:LiteralExpression');
      expect(reloadedExpression.get(testCase.resultProperty).get('value').$type).to.eql('dmn:LiteralExpression');

      reloadedEditor.destroy();
    }
  });
});
