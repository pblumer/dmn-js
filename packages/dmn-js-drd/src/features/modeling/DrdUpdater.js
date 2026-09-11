import { assign } from 'min-dash';

import inherits from 'inherits-browser';

import {
  remove as collectionRemove,
  add as collectionAdd
} from 'diagram-js/lib/util/Collections';

import {
  is,
  isAny
} from 'dmn-js-shared/lib/util/ModelUtil';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';


/**
 * Update DMN 1.3 information.
 */
export default function DrdUpdater(
    connectionDocking,
    definitionPropertiesView,
    drdFactory,
    drdRules,
    injector
) {
  injector.invoke(CommandInterceptor, this);

  this._definitionPropertiesView = definitionPropertiesView;
  this._drdFactory = drdFactory;
  this._drdRules = drdRules;

  var self = this;

  function cropConnection(context) {
    var connection = context.connection,
        cropped = context.cropped;

    if (!cropped) {
      connection.waypoints = connectionDocking.getCroppedWaypoints(connection);

      context.cropped = true;
    }
  }

  this.executed([
    'connection.create',
    'connection.layout'
  ], cropConnection, true);

  this.reverted([ 'connection.layout' ], function(context) {
    delete context.cropped;
  }, true);

  function updateParent(context) {
    var connection = context.connection,
        parent = context.parent,
        shape = context.shape;

    if (connection && !is(connection, 'dmn:Association')) {
      parent = connection.target;
    }

    self.updateParent(shape || connection, parent);
  }

  function reverseUpdateParent(context) {
    var connection = context.connection,
        shape = context.shape;

    var oldParent = context.parent || context.newParent;

    if (connection && !is(connection, 'dmn:Association')) {
      oldParent = connection.target;
    }

    self.updateParent(shape || connection, oldParent);
  }

  this.executed([
    'connection.create',
    'connection.delete',
    'connection.move',
    'shape.create',
    'shape.delete'
  ], updateParent, true);

  this.reverted([
    'connection.create',
    'connection.delete',
    'connection.move',
    'shape.create',
    'shape.delete'
  ], reverseUpdateParent, true);

  function updateBounds(context) {
    var shape = context.shape;

    if (!(is(shape, 'dmn:DRGElement') || is(shape, 'dmn:TextAnnotation'))) {
      return;
    }

    self.updateBounds(shape);
  }

  this.executed([ 'shape.create', 'shape.move', 'shape.resize' ], updateBounds, true);

  this.reverted([ 'shape.create', 'shape.move', 'shape.resize' ], updateBounds, true);

  function updateDecisionServiceMembership(context) {
    self.updateDecisionServiceMembership(context.shape);
  }

  this.executed('shape.move', updateDecisionServiceMembership, true);
  this.reverted('shape.move', updateDecisionServiceMembership, true);

  function updateConnectionWaypoints(context) {
    self.updateConnectionWaypoints(context);
  }

  this.executed([
    'connection.create',
    'connection.layout',
    'connection.move',
    'connection.updateWaypoints'
  ], updateConnectionWaypoints, true);

  this.reverted([
    'connection.create',
    'connection.layout',
    'connection.move',
    'connection.updateWaypoints'
  ], updateConnectionWaypoints, true);

  this.executed('connection.create', function(context) {
    var connection = context.connection,
        connectionBo = connection.businessObject,
        target = context.target,
        targetBo = target.businessObject;

    if (is(connection, 'dmn:Association')) {
      updateParent(context);
    } else {

      // parent is target
      self.updateSemanticParent(connectionBo, targetBo);
    }
  }, true);

  this.reverted('connection.create', function(context) {
    reverseUpdateParent(context);
  }, true);

  this.executed('connection.reconnect', function(context) {
    var connection = context.connection,
        connectionBo = connection.businessObject,
        newTarget = context.newTarget,
        newTargetBo = newTarget.businessObject;

    if (is(connectionBo, 'dmn:Association')) {
      return;
    }

    self.updateSemanticParent(connectionBo, newTargetBo);
  }, true);

  this.reverted('connection.reconnect', function(context) {
    var connection = context.connection,
        connectionBo = connection.businessObject,
        oldTarget = context.oldTarget,
        oldTargetBo = oldTarget.businessObject;

    if (is(connectionBo, 'dmn:Association')) {
      return;
    }

    self.updateSemanticParent(connectionBo, oldTargetBo);
  }, true);

  function updateDecisionServiceInputs(context) {
    var connection = context.connection,
        target = connection && connection.target,
        targetBo = target && target.businessObject,
        definitions = targetBo && targetBo.$parent;

    if (!connection || !is(connection, 'dmn:InformationRequirement')) {
      return;
    }

    self.updateDecisionServiceInputs(definitions);
  }

  this.executed([
    'connection.create',
    'connection.delete'
  ], updateDecisionServiceInputs, true);

  this.reverted([
    'connection.create',
    'connection.delete'
  ], updateDecisionServiceInputs, true);

  this.executed('element.updateProperties', function(context) {
    definitionPropertiesView.update();
  }, true);

  this.reverted('element.updateProperties', function(context) {
    definitionPropertiesView.update();
  }, true);

}

inherits(DrdUpdater, CommandInterceptor);

DrdUpdater.$inject = [
  'connectionDocking',
  'definitionPropertiesView',
  'drdFactory',
  'drdRules',
  'injector'
];

DrdUpdater.prototype.updateBounds = function(shape) {
  var businessObject = shape.businessObject,
      bounds = businessObject.di.bounds;

  // update bounds
  assign(bounds, {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height
  });

  if (is(businessObject, 'dmn:DecisionService')) {
    this.updateDecisionServiceDivider(shape);
  }
};

DrdUpdater.prototype.updateDecisionServiceDivider = function(shape) {
  var drdFactory = this._drdFactory,
      di = shape.businessObject.di,
      divider = di.get('decisionServiceDividerLine');

  if (!divider) {
    divider = drdFactory.create('dmndi:DMNDecisionServiceDividerLine', {
      waypoint: []
    });
    divider.$parent = di;
    di.set('decisionServiceDividerLine', divider);
  }

  var dividerY = shape.y + Math.round(shape.height * 0.6);

  divider.waypoint = drdFactory.createDiWaypoints([
    { x: shape.x, y: dividerY },
    { x: shape.x + shape.width, y: dividerY }
  ]).map(function(waypoint) {
    waypoint.$parent = divider;

    return waypoint;
  });
};

DrdUpdater.prototype.updateDecisionServiceMembership = function(shape) {
  if (!shape || !is(shape, 'dmn:Decision')) {
    return;
  }

  var businessObject = shape.businessObject,
      definitions = businessObject.$parent,
      href = '#' + businessObject.id;

  if (!definitions || !is(definitions, 'dmn:Definitions')) {
    return;
  }

  definitions.get('drgElement').forEach(function(drgElement) {
    if (!is(drgElement, 'dmn:DecisionService')) {
      return;
    }

    removeReference(drgElement.get('outputDecision'), href);
    removeReference(drgElement.get('encapsulatedDecision'), href);
  });

  var decisionServiceShape = shape.parent;

  if (is(decisionServiceShape, 'dmn:DecisionService')) {
    var decisionService = decisionServiceShape.businessObject,
        divider = decisionService.di.get('decisionServiceDividerLine'),
        dividerY = divider && divider.waypoint && divider.waypoint.length
          ? divider.waypoint[0].y
          : decisionServiceShape.y + Math.round(decisionServiceShape.height * 0.6),
        centerY = shape.y + shape.height / 2,
        property = centerY < dividerY
          ? 'outputDecision'
          : 'encapsulatedDecision',
        reference = this._drdFactory.create('dmn:DMNElementReference', {
          href: href
        });

    reference.$parent = decisionService;
    decisionService.get(property).push(reference);
  }

  this.updateDecisionServiceInputs(definitions);
};

DrdUpdater.prototype.updateDecisionServiceInputs = function(definitions) {
  if (!definitions || !is(definitions, 'dmn:Definitions')) {
    return;
  }

  var drdFactory = this._drdFactory,
      drgElements = definitions.get('drgElement'),
      decisionsByHref = {};

  drgElements.forEach(function(drgElement) {
    if (is(drgElement, 'dmn:Decision')) {
      decisionsByHref['#' + drgElement.id] = drgElement;
    }
  });

  drgElements.forEach(function(decisionService) {
    if (!is(decisionService, 'dmn:DecisionService')) {
      return;
    }

    var internalReferences = decisionService.get('outputDecision')
          .concat(decisionService.get('encapsulatedDecision')),
        internalHrefs = {},
        inputDecisionHrefs = [],
        inputDataHrefs = [];

    internalReferences.forEach(function(reference) {
      internalHrefs[reference.href] = true;
    });

    internalReferences.forEach(function(reference) {
      var decision = decisionsByHref[reference.href];

      if (!decision) {
        return;
      }

      decision.get('informationRequirement').forEach(function(requirement) {
        var requiredDecision = requirement.get('requiredDecision'),
            requiredInput = requirement.get('requiredInput');

        if (requiredDecision && !internalHrefs[requiredDecision.href]) {
          addUnique(inputDecisionHrefs, requiredDecision.href);
        }

        if (requiredInput) {
          addUnique(inputDataHrefs, requiredInput.href);
        }
      });
    });

    replaceReferences(
      drdFactory,
      decisionService,
      'inputDecision',
      inputDecisionHrefs
    );

    replaceReferences(
      drdFactory,
      decisionService,
      'inputData',
      inputDataHrefs
    );
  });
};

DrdUpdater.prototype.updateConnectionWaypoints = function(context) {
  var drdFactory = this._drdFactory;

  var connection = context.connection,
      businessObject = connection.businessObject,
      edge = businessObject.di;

  edge.waypoint = drdFactory.createDiWaypoints(connection.waypoints)
    .map(function(waypoint) {
      waypoint.$parent = edge;

      return waypoint;
    });
};

DrdUpdater.prototype.updateParent = function(element, oldParent) {
  var parent = element.parent;

  if (!is(element, 'dmn:DRGElement') && !is(element, 'dmn:Artifact')) {
    parent = oldParent;
  }

  var businessObject = element.businessObject,
      parentBo = parent && parent.businessObject;

  this.updateSemanticParent(businessObject, parentBo);

  this.updateDiParent(businessObject.di, parentBo && parentBo.di);
};

DrdUpdater.prototype.updateSemanticParent = function(businessObject, parent) {
  var children,
      containment;

  if (businessObject.$parent === parent) {
    return;
  }

  if (is(businessObject, 'dmn:DRGElement')) {
    containment = 'drgElement';
  } else if (is(businessObject, 'dmn:Artifact')) {
    containment = 'artifact';
  } else if (is(businessObject, 'dmn:InformationRequirement')) {
    containment = 'informationRequirement';
  } else if (is(businessObject, 'dmn:AuthorityRequirement')) {
    containment = 'authorityRequirement';
  } else if (is(businessObject, 'dmn:KnowledgeRequirement')) {
    containment = 'knowledgeRequirement';
  }

  if (businessObject.$parent) {

    // remove from old parent
    children = businessObject.$parent.get(containment);

    collectionRemove(children, businessObject);
  }

  if (parent) {

    // add to new parent
    children = parent.get(containment);

    if (children) {
      children.push(businessObject);

      businessObject.$parent = parent;
    }
  } else {
    businessObject.$parent = null;
  }
};

DrdUpdater.prototype.updateDiParent = function(di, parentDi) {

  if (di.$parent === parentDi) {
    return;
  }

  if (isAny(di, [ 'dmndi:DMNEdge', 'dmndi:DMNShape' ])) {

    var diagram = parentDi || di;
    while (!is(diagram, 'dmndi:DMNDiagram')) {
      diagram = diagram.$parent;
    }

    var diagramElements = diagram.get('diagramElements');
    if (parentDi) {
      di.$parent = diagram;

      collectionAdd(diagramElements, di);
    } else {
      di.$parent = null;

      collectionRemove(diagramElements, di);
    }
  } else {
    throw new Error('unsupported');
  }
};


function addUnique(values, value) {
  if (values.indexOf(value) === -1) {
    values.push(value);
  }
}

function removeReference(references, href) {
  for (var index = references.length - 1; index >= 0; index--) {
    if (references[index].href === href) {
      references.splice(index, 1);
    }
  }
}

function replaceReferences(drdFactory, decisionService, property, hrefs) {
  var references = decisionService.get(property);

  references.splice(0, references.length);

  hrefs.forEach(function(href) {
    var reference = drdFactory.create('dmn:DMNElementReference', {
      href: href
    });

    reference.$parent = decisionService;
    references.push(reference);
  });
}
