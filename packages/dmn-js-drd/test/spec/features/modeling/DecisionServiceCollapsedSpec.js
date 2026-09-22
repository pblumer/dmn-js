import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import DrdModeler from '../../../helper/DrdModeler';

import collapsedXML from '../../../fixtures/dmn/decision-service-collapsed-members-15.dmn';


/**
 * A collapsed Decision Service is not reclassified from geometry.
 *
 * Which compartment a decision sits in is re-decided from its bounds whenever the
 * service is resized: above the divider it is an output decision, below it an
 * encapsulated one. That reading needs a box to read from, and a collapsed service
 * draws none — §6.2.4 says its definition is not depicted at all.
 *
 * Asking anyway is not a cosmetic mistake. The rule is purely "is the decision above
 * the divider", so against a small collapsed box every member falls below it, every
 * output decision becomes encapsulated, and the service is left publishing nothing —
 * a service that compiles, is listed, is callable, and answers with nothing at all.
 * That is the failure this area exists to prevent, and it is reachable from a
 * document that draws a service collapsed while keeping its members' shapes.
 */
describe('features/modeling - DMN 1.5 collapsed Decision Service', function() {

  let modeler, viewer;

  afterEach(function() {
    modeler && modeler.destroy();

    modeler = viewer = null;
  });


  async function open(xml) {
    modeler = new DrdModeler({
      container: TestContainer.get(this),
      dmnVersion: '1.5'
    });

    const { warnings } = await modeler.importXML(xml);

    expect(warnings.map(warning => warning.message).join('\n')).to.eql('');

    viewer = modeler.getActiveViewer();

    return viewer;
  }

  const get = (id) => viewer.get('elementRegistry').get(id);

  const hrefs = (id, property) => get(id).businessObject
    .get(property)
    .map(reference => reference.href);


  it('should keep what it publishes when it is resized', async function() {

    // given
    await open.call(this, collapsedXML);

    const service = get('DecisionService_Approval');

    expect(hrefs('DecisionService_Approval', 'outputDecision'))
      .to.eql([ '#Decision_Output' ]);

    // when
    viewer.get('modeling').resizeShape(service, {
      x: service.x,
      y: service.y,
      width: 220,
      height: 140
    });

    // then
    // without the guard the output decision is read off the collapsed box, lands
    // below its divider, and is rewritten into an encapsulated one
    expect(hrefs('DecisionService_Approval', 'outputDecision'))
      .to.eql([ '#Decision_Output' ]);
    expect(hrefs('DecisionService_Approval', 'encapsulatedDecision'))
      .to.eql([ '#Decision_Encapsulated' ]);
  });


  // A regression guard, not a second proof of the one above: a move is already
  // spared reclassification because it is a translation, so this passes with the
  // collapsed guard removed. It is here so that if the translation guard ever goes,
  // the collapsed case is not left depending on it.
  it('should keep what it publishes when it is moved', async function() {

    // given
    await open.call(this, collapsedXML);

    const service = get('DecisionService_Approval');

    // when
    viewer.get('modeling').moveShape(service, { x: 0, y: 260 });

    // then
    expect(hrefs('DecisionService_Approval', 'outputDecision'))
      .to.eql([ '#Decision_Output' ]);
    expect(hrefs('DecisionService_Approval', 'encapsulatedDecision'))
      .to.eql([ '#Decision_Encapsulated' ]);
  });


  it('should still reclassify an expanded service, so the guard is the narrow one',
    async function() {

      // given
      await open.call(this, collapsedXML);

      const service = get('DecisionService_Approval');

      // when
      // the same document read as an expanded service: unfold the flag, then grow the
      // box over both decisions, which is the case reclassification is for
      viewer.get('modeling').updateModdleProperties(
        service,
        service.businessObject.di,
        { isCollapsed: false }
      );

      viewer.get('modeling').resizeShape(service, {
        x: 100,
        y: 80,
        width: 300,
        height: 420
      });

      // then
      // both decisions now sit below the divider the resize placed, so both read as
      // encapsulated — the behaviour the guard above must not have switched off
      expect(hrefs('DecisionService_Approval', 'outputDecision')).to.eql([]);
      expect(hrefs('DecisionService_Approval', 'encapsulatedDecision'))
        .to.eql([ '#Decision_Output', '#Decision_Encapsulated' ]);
    });
});
