import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import {
  query as domQuery,
  queryAll as domQueryAll
} from 'min-dom';

import DrdViewer from '../../helper/DrdViewer';

import decisionServiceXML from '../../fixtures/dmn/decision-service-15.dmn';


describe('draw - DMN 1.5 Decision Service', function() {

  let viewer;

  beforeEach(async function() {
    viewer = new DrdViewer({
      container: TestContainer.get(this),
      dmnVersion: '1.5'
    });

    const { warnings } = await viewer.importXML(decisionServiceXML);
    const warningMessages = warnings.map(warning => warning.message).join('\n');

    expect(warnings, warningMessages).to.have.lengthOf(0);
  });

  afterEach(function() {
    viewer.destroy();
  });


  it('should render Decision Service using DMNDI divider line', function() {
    const activeViewer = viewer.getActiveViewer();
    const elementRegistry = activeViewer.get('elementRegistry');
    const decisionService = elementRegistry.get('DecisionService_Approval');

    expect(decisionService).to.exist;
    expect(decisionService.businessObject.$type).to.eql('dmn:DecisionService');

    const divider = decisionService.businessObject.di.get('decisionServiceDividerLine');

    expect(divider).to.exist;
    expect(divider.get('waypoint')).to.have.lengthOf(2);
    expect(divider.get('waypoint')[0].x).to.eql(100);
    expect(divider.get('waypoint')[0].y).to.eql(200);
    expect(divider.get('waypoint')[1].x).to.eql(400);
    expect(divider.get('waypoint')[1].y).to.eql(200);

    const gfx = elementRegistry.getGraphics(decisionService);

    expect(gfx).to.exist;

    const visual = domQuery('.djs-visual', gfx);
    const rect = domQuery('rect', visual);
    const paths = domQueryAll('path', visual);
    const label = domQuery('text', visual);

    expect(rect).to.exist;
    expect(paths).to.have.lengthOf(1);
    expect(label).to.exist;
    expect(label.textContent).to.contain('Approval Service');

    const dividerPath = paths[0].getAttribute('d');

    expect(dividerPath).to.match(/M\s*0(?:\.0+)?[ ,]+120(?:\.0+)?\s*L\s*300(?:\.0+)?[ ,]+120(?:\.0+)?/);
  });
});
