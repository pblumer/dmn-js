import CollapsedDecisionServiceMoveBehavior from
  './CollapsedDecisionServiceMoveBehavior';
import DecisionServiceDeleteBehavior from './DecisionServiceDeleteBehavior';
import DecisionServicePaintsBehindBehavior from
  './DecisionServicePaintsBehindBehavior';
import CreateConnectionBehavior from './CreateConnectionBehavior';
import CreateShapeBehavior from './CreateShapeBehavior';
import LayoutConnectionBehavior from './LayoutConnectionBehavior';
import ReplaceConnectionBehavior from './ReplaceConnectionBehavior';
import ReplaceElementBehavior from './ReplaceElementBehavior';
import IdChangeBehavior from
  'dmn-js-shared/lib/features/modeling/behavior/IdChangeBehavior';
import NameChangeBehavior from
  'dmn-js-shared/lib/features/modeling/behavior/NameChangeBehavior';
export default {
  __init__: [
    'collapsedDecisionServiceMoveBehavior',
    'decisionServiceDeleteBehavior',
    'decisionServicePaintsBehindBehavior',
    'createConnectionBehavior',
    'createShapeBehavior',
    'idChangeBehavior',
    'nameChangeBehavior',
    'layoutConnectionBehavior',
    'replaceConnectionBehavior',
    'replaceElementBehavior'
  ],
  collapsedDecisionServiceMoveBehavior: [
    'type', CollapsedDecisionServiceMoveBehavior
  ],
  decisionServiceDeleteBehavior: [ 'type', DecisionServiceDeleteBehavior ],
  decisionServicePaintsBehindBehavior: [
    'type', DecisionServicePaintsBehindBehavior
  ],
  createConnectionBehavior: [ 'type', CreateConnectionBehavior ],
  createShapeBehavior: [ 'type', CreateShapeBehavior ],
  idChangeBehavior: [ 'type', IdChangeBehavior ],
  nameChangeBehavior: [ 'type', NameChangeBehavior ],
  layoutConnectionBehavior: [ 'type', LayoutConnectionBehavior ],
  replaceConnectionBehavior: [ 'type', ReplaceConnectionBehavior ],
  replaceElementBehavior: [ 'type', ReplaceElementBehavior ]
};
