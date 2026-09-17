import { expect } from 'chai';
import {
  bootstrapModeler,
  getDrdJS,
  inject
} from '../../../TestHelper';

import coreModule from 'src/core';
import createModule from 'diagram-js/lib/features/create';
import modelingModule from 'src/features/modeling';

import {
  createCanvasEvent as canvasEvent
} from '../../../util/MockEvents';

var testModules = [ coreModule, modelingModule ];


describe('features/rules', function() {

  describe('move', function() {

    var diagramXML = require('./DrdRules.grouped.dmn');

    beforeEach(bootstrapModeler(diagramXML, {
      modules: testModules
    }));


    Array.prototype.forEach.call('ABCDEFGHIJ', function(group) {

      it('should move Group <' + group + '>', inject(
        function(elementRegistry, drdRules) {

          // given
          var shape_1 = elementRegistry.get(group + '1');
          var shape_2 = elementRegistry.get(group + '2');

          var connection = shape_1.incoming[0] || shape_1.outgoing[0];

          var parent = shape_1.parent;

          // when
          var allowed = drdRules.canMove([ shape_1, shape_2, connection ], parent);

          // then
          expect(allowed).to.be.true;
        }
      ));

    });

  });


  describe('connect', function() {

    var diagramXML = require('./drd-rules.dmn');

    beforeEach(bootstrapModeler(diagramXML, { modules: testModules }));


    it('self', expectCanConnect(
      'Decision_1',
      'Decision_1',
      false
    ));


    it('business knowledge model -> business knowledge model', expectCanConnect(
      'BusinessKnowledgeModel_1',
      'BusinessKnowledgeModel_2',
      { type: 'dmn:KnowledgeRequirement' }
    ));


    it('business knowledge model -> decision', expectCanConnect(
      'BusinessKnowledgeModel_1',
      'Decision_1',
      { type: 'dmn:KnowledgeRequirement' }
    ));


    it('business knowledge model -> input data', expectCanConnect(
      'BusinessKnowledgeModel_1',
      'InputData_1',
      false
    ));


    it('business knowledge model -> knowledge source', expectCanConnect(
      'BusinessKnowledgeModel_1',
      'KnowledgeSource_1',
      false
    ));


    it('decision -> business knowledge model', expectCanConnect(
      'Decision_1',
      'BusinessKnowledgeModel_1',
      false
    ));


    it('decision -> decision', expectCanConnect(
      'Decision_1',
      'Decision_2',
      { type: 'dmn:InformationRequirement' }
    ));


    it('decision -> input data', expectCanConnect(
      'Decision_1',
      'InputData_1',
      false
    ));


    it('decision -> knowledge source', expectCanConnect(
      'Decision_1',
      'KnowledgeSource_1',
      { type: 'dmn:AuthorityRequirement' }
    ));


    it('input data -> business knowledge model', expectCanConnect(
      'InputData_1',
      'BusinessKnowledgeModel_1',
      false
    ));


    it('input data -> decision', expectCanConnect(
      'InputData_1',
      'Decision_1',
      { type: 'dmn:InformationRequirement' }
    ));


    it('input data -> input data', expectCanConnect(
      'InputData_1',
      'InputData_2',
      false
    ));


    it('input data -> knowledge source', expectCanConnect(
      'InputData_1',
      'KnowledgeSource_1',
      { type: 'dmn:AuthorityRequirement' }
    ));


    it('knowledge source -> business knowledge model', expectCanConnect(
      'KnowledgeSource_1',
      'BusinessKnowledgeModel_1',
      { type: 'dmn:AuthorityRequirement' }
    ));


    it('knowledge source -> decision', expectCanConnect(
      'KnowledgeSource_1',
      'Decision_1',
      { type: 'dmn:AuthorityRequirement' }
    ));


    it('knowledge source -> input data', expectCanConnect(
      'KnowledgeSource_1',
      'InputData_1',
      false
    ));


    it('knowledge source -> knowledge source', expectCanConnect(
      'KnowledgeSource_1',
      'KnowledgeSource_2',
      { type: 'dmn:AuthorityRequirement' }
    ));


    it('decision -> text annotation', expectCanConnect(
      'Decision_2',
      'TextAnnotation_1',
      { type: 'dmn:Association' }
    ));


    it('text annotation -> decision', expectCanConnect(
      'TextAnnotation_1',
      'Decision_2',
      { type: 'dmn:Association' }
    ));

  });


  describe('create', function() {

    var diagramXML = require('./drd-rules.dmn');

    beforeEach(bootstrapModeler(diagramXML, { modules: testModules }));


    it('decision -> definitions', inject(
      function(drdRules, elementFactory, elementRegistry) {

        // given
        var decision = elementFactory.create('shape', { type: 'dmn:Decision' });

        var definitions = elementRegistry.get('Definitions_1');

        // when
        var allowed = drdRules.canCreate(decision, definitions);

        // then
        expect(allowed).to.be.true;
      }
    ));


    it('decision -> input data', inject(
      function(drdRules, elementFactory, elementRegistry) {

        // given
        var decision = elementFactory.create('shape', { type: 'dmn:Decision' });

        var inputData = elementRegistry.get('InputData_1');

        // when
        var allowed = drdRules.canCreate(decision, inputData);

        // then
        expect(allowed).to.be.false;
      }
    ));


    it('decision service -> definitions', expectCanCreate(
      'dmn:DecisionService',
      'Definitions_1',
      true
    ));

  });


  describe('create decision service', function() {

    var diagramXML = require('./drd-rules.dmn');

    beforeEach(bootstrapModeler(diagramXML, {
      modules: testModules.concat(createModule)
    }));


    it('should create on definitions', inject(
      function(canvas, create, dragging, elementFactory, elementRegistry) {

        // given
        var decisionService = elementFactory.createShape({
          type: 'dmn:DecisionService'
        });

        var root = canvas.getRootElement();

        // when
        create.start(canvasEvent({ x: 0, y: 0 }), decisionService);

        dragging.move(canvasEvent({ x: 700, y: 400 }));
        dragging.hover({ element: root });
        dragging.move(canvasEvent({ x: 700, y: 400 }));
        dragging.end();

        // then
        expect(elementRegistry.get(decisionService.id)).to.exist;
        expect(decisionService.parent).to.equal(root);
        expect(decisionService.businessObject.$parent)
          .to.equal(root.businessObject);
      }
    ));


    it('should lay out divider line', inject(
      function(canvas, create, dragging, elementFactory) {

        // given
        var decisionService = elementFactory.createShape({
          type: 'dmn:DecisionService'
        });

        var root = canvas.getRootElement();

        // when
        create.start(canvasEvent({ x: 0, y: 0 }), decisionService);

        dragging.move(canvasEvent({ x: 700, y: 400 }));
        dragging.hover({ element: root });
        dragging.move(canvasEvent({ x: 700, y: 400 }));
        dragging.end();

        // then
        var divider = decisionService.businessObject.di
          .get('decisionServiceDividerLine');

        var waypoints = divider && divider.get('waypoint');

        var dividerY = decisionService.y +
          Math.round(decisionService.height * 0.6);

        expect(waypoints).to.have.lengthOf(2);
        expect(waypoints[0].x).to.eql(decisionService.x);
        expect(waypoints[0].y).to.eql(dividerY);
        expect(waypoints[1].x).to.eql(
          decisionService.x + decisionService.width
        );
        expect(waypoints[1].y).to.eql(dividerY);
      }
    ));


    it('should not create decision in decision service', inject(
      function(canvas, create, dragging, elementFactory, elementRegistry) {

        // given
        var decisionService = elementFactory.createShape({
          type: 'dmn:DecisionService'
        });

        var root = canvas.getRootElement();

        create.start(canvasEvent({ x: 0, y: 0 }), decisionService);

        dragging.move(canvasEvent({ x: 700, y: 400 }));
        dragging.hover({ element: root });
        dragging.move(canvasEvent({ x: 700, y: 400 }));
        dragging.end();

        var decision = elementFactory.createShape({ type: 'dmn:Decision' });

        // when
        create.start(canvasEvent({ x: 0, y: 0 }), decision);

        dragging.move(canvasEvent({ x: 700, y: 400 }));
        dragging.hover({ element: decisionService });
        dragging.move(canvasEvent({ x: 700, y: 400 }));
        dragging.end();

        // then
        expect(elementRegistry.get(decision.id)).not.to.exist;
        expect(decisionService.children).to.be.empty;
      }
    ));

  });


  describe('move decision', function() {

    it('decision -> definitions', inject(
      function(drdRules, elementRegistry) {

        // given
        var decision = elementRegistry.get('Decision_1'),
            definitions = elementRegistry.get('Definitions_1');

        // when
        var allowed = drdRules.canMove(decision, definitions);

        // then
        expect(allowed).to.be.true;
      }
    ));


    it('decision -> input data', inject(
      function(drdRules, elementRegistry) {

        // given
        var decision = elementRegistry.get('Decision_1'),
            inputData = elementRegistry.get('InputData_1');

        // when
        var allowed = drdRules.canMove(decision, inputData);

        // then
        expect(allowed).to.be.false;
      }
    ));

  });


  describe('resize', function() {

    var diagramXML = require('./drd-rules.dmn');

    beforeEach(bootstrapModeler(diagramXML, { modules: testModules }));


    it('decision', expectCanResize('Decision_1', false));


    it('text annotation', expectCanResize('TextAnnotation_1', true));

  });

});

// helpers //////////

function expectCanConnect(source, target, canConnect) {
  return function() {
    getDrdJS().invoke(function(drdRules, elementRegistry) {
      expect(drdRules.canConnect(
        elementRegistry.get(source),
        elementRegistry.get(target)
      )).to.eql(canConnect);
    });
  };
}

function expectCanCreate(type, target, canCreate) {
  return function() {
    getDrdJS().invoke(function(elementFactory, elementRegistry, rules) {
      expect(rules.allowed(
        'shape.create',
        {
          position: { x: 0, y: 0 },
          shape: elementFactory.createShape({ type: type }),
          target: elementRegistry.get(target)
        }
      )).to.equal(canCreate);
    });
  };
}

function expectCanResize(shape, canResize) {
  return function() {
    getDrdJS().invoke(function(rules, elementRegistry) {
      expect(rules.allowed(
        'shape.resize',
        {
          shape: elementRegistry.get(shape)
        }
      )).to.equal(canResize);
    });
  };
}
