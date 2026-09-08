import { expect } from 'chai';

import Modeler from 'src/Modeler';


describe('Modeler - DMN 1.5', function() {

  const diagram = require('./dmn-15.dmn');

  let container;
  let editor;

  beforeEach(function() {
    container = document.createElement('div');
    container.className = 'test-container';

    document.body.appendChild(container);

    editor = new Modeler({
      container,
      dmnVersion: '1.5'
    });
  });

  afterEach(function() {
    if (editor) {
      editor.destroy();
      editor = null;
    }

    document.body.removeChild(container);
  });


  it('should import, open and save DMN 1.5 without semantic loss', async function() {

    // when
    const { warnings } = await editor.importXML(diagram, { open: false });

    // then
    expect(warnings).to.have.lengthOf(0);

    const definitions = editor.getDefinitions();
    const decision = definitions.drgElement.find(element => element.id === 'Decision_Eligibility');

    expect(definitions.$type).to.equal('dmn:Definitions');
    expect(decision.$type).to.equal('dmn:Decision');
    expect(decision.decisionLogic.$type).to.equal('dmn:DecisionTable');
    expect(definitions.dmnDI.$type).to.equal('dmndi:DMNDI');

    const views = editor.getViews();
    const decisionTableView = views.find(view => view.type === 'decisionTable');

    expect(decisionTableView).to.exist;

    const openResult = await editor.open(decisionTableView);

    expect(openResult.warnings).to.have.lengthOf(0);

    const { xml } = await editor.saveXML({ format: true });

    expect(xml).to.contain('https://www.omg.org/spec/DMN/20230324/MODEL/');
    expect(xml).to.contain('https://www.omg.org/spec/DMN/20230324/DMNDI/');
    expect(xml).to.contain('DecisionTable_Eligibility');
    expect(xml).to.contain('DMNShape_Decision_Eligibility');

    const reimportResult = await editor.importXML(xml, { open: false });

    expect(reimportResult.warnings).to.have.lengthOf(0);

    const reimportedDecision = editor.getDefinitions().drgElement.find(element => element.id === 'Decision_Eligibility');

    expect(reimportedDecision.decisionLogic.$type).to.equal('dmn:DecisionTable');
  });

});
