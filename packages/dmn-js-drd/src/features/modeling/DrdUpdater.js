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

import { clampDecisionServiceDividerY } from './DecisionServiceUtil';


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

    if (is(shape, 'dmn:DecisionService') &&
        context.oldDecisionServiceDividerY === undefined) {
      var divider = shape.businessObject.di.get('decisionServiceDividerLine');

      if (divider && divider.waypoint && divider.waypoint.length) {
        context.oldDecisionServiceDividerY = divider.waypoint[0].y;
      }
    }

    self.updateBounds(shape);
  }

  function revertBounds(context) {
    var shape = context.shape;

    if (!(is(shape, 'dmn:DRGElement') || is(shape, 'dmn:TextAnnotation'))) {
      return;
    }

    self.updateBounds(shape, context.oldDecisionServiceDividerY);
  }

  this.executed([ 'shape.create', 'shape.move', 'shape.resize' ], updateBounds, true);

  this.reverted([ 'shape.create', 'shape.move', 'shape.resize' ], revertBounds, true);

  function updateDecisionServiceMembership(context) {
    var shape = context.shape;

    if (!is(shape, 'dmn:Decision')) {
      return;
    }

    if (!context.oldDecisionServiceMemberships) {
      context.oldDecisionServiceMemberships =
        self.getDecisionServiceMemberships(shape);
    }

    self.updateDecisionServiceMembership(shape, context.oldParent);
  }

  function revertDecisionServiceMembership(context) {
    self.restoreDecisionServiceMemberships(
      context.shape,
      context.oldDecisionServiceMemberships
    );
  }

  this.executed('shape.move', updateDecisionServiceMembership, true);
  this.reverted('shape.move', revertDecisionServiceMembership, true);

  function updateDecisionServiceMembershipFromDivider(context) {
    var decisionServiceShape = context.element,
        divider = context.moddleElement;

    if (!is(decisionServiceShape, 'dmn:DecisionService') ||
        !is(divider, 'dmndi:DMNDecisionServiceDividerLine')) {
      return;
    }

    if (!context.oldDecisionServiceMembershipSnapshot) {
      context.oldDecisionServiceMembershipSnapshot =
        self.getDecisionServiceMembershipSnapshot(decisionServiceShape);
    }

    self.reclassifyDecisionServiceMemberships(decisionServiceShape);
  }

  function revertDecisionServiceMembershipFromDivider(context) {
    var decisionServiceShape = context.element,
        divider = context.moddleElement;

    if (!is(decisionServiceShape, 'dmn:DecisionService') ||
        !is(divider, 'dmndi:DMNDecisionServiceDividerLine')) {
      return;
    }

    self.restoreDecisionServiceMembershipSnapshot(
      decisionServiceShape,
      context.oldDecisionServiceMembershipSnapshot
    );
  }

  this.executed(
    'element.updateModdleProperties',
    updateDecisionServiceMembershipFromDivider,
    true
  );
  this.reverted(
    'element.updateModdleProperties',
    revertDecisionServiceMembershipFromDivider,
    true
  );

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
        target = connection && (connection.target || context.target),
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

DrdUpdater.prototype.updateBounds = function(shape, dividerY) {
  var businessObject = shape.businessObject,
      bounds = businessObject.di.bounds,
      previousBounds = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      };

  // update bounds
  assign(bounds, {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height
  });

  if (is(businessObject, 'dmn:DecisionService')) {
    this.updateDecisionServiceDivider(shape, previousBounds, dividerY);
  }
};

DrdUpdater.prototype.updateDecisionServiceDivider = function(
    shape,
    previousBounds,
    dividerY
) {
  var drdFactory = this._drdFactory,
      di = shape.businessObject.di,
      divider = di.get('decisionServiceDividerLine'),
      hasDividerWaypoints = divider && divider.waypoint && divider.waypoint.length;

  if (!divider) {
    divider = drdFactory.create('dmndi:DMNDecisionServiceDividerLine', {
      waypoint: []
    });
    divider.$parent = di;
    di.set('decisionServiceDividerLine', divider);
  }

  if (dividerY === undefined) {
    if (hasDividerWaypoints && previousBounds && previousBounds.y !== undefined) {
      dividerY = divider.waypoint[0].y + shape.y - previousBounds.y;
    } else {
      dividerY = shape.y + Math.round(shape.height * 0.6);
    }
  }

  dividerY = clampDecisionServiceDividerY(shape, dividerY);

  divider.waypoint = drdFactory.createDiWaypoints([
    { x: shape.x, y: dividerY },
    { x: shape.x + shape.width, y: dividerY }
  ]).map(function(waypoint) {
    waypoint.$parent = divider;

    return waypoint;
  });

  this.reclassifyDecisionServiceMemberships(shape);
};

DrdUpdater.prototype.reclassifyDecisionServiceMemberships = function(shape) {
  if (!shape || !is(shape, 'dmn:DecisionService')) {
    return;
  }

  var decisionService = shape.businessObject,
      definitions = decisionService.$parent;

  if (!definitions || !is(definitions, 'dmn:Definitions')) {
    return;
  }

  var outputReferences = decisionService.get('outputDecision'),
      encapsulatedReferences = decisionService.get('encapsulatedDecision'),
      memberHrefs = [],
      originalProperties = {},
      decisionsByHref = {},
      outputHrefs = [],
      encapsulatedHrefs = [];

  outputReferences.forEach(function(reference) {
    addUnique(memberHrefs, reference.href);
    originalProperties[reference.href] = 'outputDecision';
  });

  encapsulatedReferences.forEach(function(reference) {
    addUnique(memberHrefs, reference.href);

    if (!originalProperties[reference.href]) {
      originalProperties[reference.href] = 'encapsulatedDecision';
    }
  });

  definitions.get('drgElement').forEach(function(drgElement) {
    if (is(drgElement, 'dmn:Decision')) {
      decisionsByHref['#' + drgElement.id] = drgElement;
    }
  });

  var divider = decisionService.di &&
        decisionService.di.get('decisionServiceDividerLine'),
      dividerY = divider && divider.waypoint && divider.waypoint.length
        ? divider.waypoint[0].y
        : shape.y + Math.round(shape.height * 0.6);

  memberHrefs.forEach(function(href) {
    var decision = decisionsByHref[href],
        bounds = decision && decision.di && decision.di.bounds,
        property = originalProperties[href];

    if (bounds) {
      property = bounds.y + bounds.height / 2 < dividerY
        ? 'outputDecision'
        : 'encapsulatedDecision';
    }

    if (property === 'outputDecision') {
      outputHrefs.push(href);
    } else {
      encapsulatedHrefs.push(href);
    }
  });

  replaceReferences(
    this._drdFactory,
    decisionService,
    'outputDecision',
    outputHrefs
  );
  replaceReferences(
    this._drdFactory,
    decisionService,
    'encapsulatedDecision',
    encapsulatedHrefs
  );

  this.updateDecisionServiceInputs(definitions);
};

DrdUpdater.prototype.getDecisionServiceMembershipSnapshot = function(shape) {
  if (!shape || !is(shape, 'dmn:DecisionService')) {
    return null;
  }

  var decisionService = shape.businessObject;

  return {
    outputDecision: decisionService.get('outputDecision').map(function(reference) {
      return reference.href;
    }),
    encapsulatedDecision: decisionService.get('encapsulatedDecision').map(function(reference) {
      return reference.href;
    })
  };
};

DrdUpdater.prototype.restoreDecisionServiceMembershipSnapshot = function(
    shape,
    snapshot
) {
  if (!shape || !is(shape, 'dmn:DecisionService') || !snapshot) {
    return;
  }

  var decisionService = shape.businessObject,
      definitions = decisionService.$parent;

  if (!definitions || !is(definitions, 'dmn:Definitions')) {
    return;
  }

  replaceReferences(
    this._drdFactory,
    decisionService,
    'outputDecision',
    snapshot.outputDecision
  );
  replaceReferences(
    this._drdFactory,
    decisionService,
    'encapsulatedDecision',
    snapshot.encapsulatedDecision
  );

  this.updateDecisionServiceInputs(definitions);
};

DrdUpdater.prototype.getDecisionServiceMemberships = function(shape) {
  if (!shape || !is(shape, 'dmn:Decision')) {
    return [];
  }

  var businessObject = shape.businessObject,
      definitions = businessObject.$parent,
      href = '#' + businessObject.id;

  if (!definitions || !is(definitions, 'dmn:Definitions')) {
    return [];
  }

  return definitions.get('drgElement')
    .filter(function(drgElement) {
      return is(drgElement, 'dmn:DecisionService');
    })
    .map(function(decisionService) {
      return {
        decisionService: decisionService,
        outputDecision: hasReference(
          decisionService.get('outputDecision'),
          href
        ),
        encapsulatedDecision: hasReference(
          decisionService.get('encapsulatedDecision'),
          href
        )
      };
    });
};

DrdUpdater.prototype.restoreDecisionServiceMemberships = function(
    shape,
    memberships
) {
  if (!shape || !is(shape, 'dmn:Decision') || !memberships) {
    return;
  }

  var businessObject = shape.businessObject,
      definitions = businessObject.$parent,
      href = '#' + businessObject.id,
      drdFactory = this._drdFactory;

  if (!definitions || !is(definitions, 'dmn:Definitions')) {
    return;
  }

  memberships.forEach(function(membership) {
    var decisionService = membership.decisionService;

    removeReference(decisionService.get('outputDecision'), href);
    removeReference(decisionService.get('encapsulatedDecision'), href);

    if (membership.outputDecision) {
      addReference(drdFactory, decisionService, 'outputDecision', href);
    }

    if (membership.encapsulatedDecision) {
      addReference(drdFactory, decisionService, 'encapsulatedDecision', href);
    }
  });

  this.updateDecisionServiceInputs(definitions);
};

DrdUpdater.prototype.updateDecisionServiceMembership = function(shape, oldParent) {
  if (!shape || !is(shape, 'dmn:Decision')) {
    return;
  }

  var businessObject = shape.businessObject,
      definitions = businessObject.$parent,
      href = '#' + businessObject.id,
      decisionServiceShape = shape.parent,
      decisionService = is(decisionServiceShape, 'dmn:DecisionService')
        ? decisionServiceShape.businessObject
        : null,
      oldDecisionService = oldParent && is(oldParent, 'dmn:DecisionService')
        ? oldParent.businessObject
        : null;

  if (!definitions || !is(definitions, 'dmn:Definitions')) {
    return;
  }

  if (oldDecisionService && oldDecisionService !== decisionService) {
    removeReference(oldDecisionService.get('outputDecision'), href);
    removeReference(oldDecisionService.get('encapsulatedDecision'), href);
  }

  if (decisionService) {
    removeReference(decisionService.get('outputDecision'), href);
    removeReference(decisionService.get('encapsulatedDecision'), href);

    var divider = decisionService.di.get('decisionServiceDividerLine'),
        currentDividerY = divider && divider.waypoint && divider.waypoint.length
          ? divider.waypoint[0].y
          : decisionServiceShape.y + Math.round(decisionServiceShape.height * 0.6),
        centerY = shape.y + shape.height / 2,
        property = centerY < currentDividerY
          ? 'outputDecision'
          : 'encapsulatedDecision';

    addReference(this._drdFactory, decisionService, property, href);
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

function addReference(drdFactory, decisionService, property, href) {
  var reference = drdFactory.create('dmn:DMNElementReference', {
    href: href
  });

  reference.$parent = decisionService;
  decisionService.get(property).push(reference);
}

function hasReference(references, href) {
  return references.some(function(reference) {
    return reference.href === href;
  });
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
    addReference(drdFactory, decisionService, property, href);
  });
}