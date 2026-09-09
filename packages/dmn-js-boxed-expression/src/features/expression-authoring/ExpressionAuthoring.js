import { is } from 'dmn-js-shared/lib/util/ModelUtil';

const EXPRESSION_DEFINITIONS = {
  'dmn:For': {
    iteratorVariable: 'item',
    children: [ 'in', 'return' ]
  },
  'dmn:Every': {
    iteratorVariable: 'item',
    children: [ 'in', 'satisfies' ]
  },
  'dmn:Some': {
    iteratorVariable: 'item',
    children: [ 'in', 'satisfies' ]
  },
  'dmn:Filter': {
    children: [ 'in', 'match' ]
  }
};

export class ExpressionAuthoring {
  static $inject = [ 'dmnFactory', 'modeling' ];

  constructor(dmnFactory, modeling) {
    this._dmnFactory = dmnFactory;
    this._modeling = modeling;
  }

  updateIteratorVariable(expression, iteratorVariable) {
    this._modeling.updateProperties(expression, { iteratorVariable });
  }

  replaceRootExpression(element, type) {
    if (!is(element, 'dmn:Decision')) {
      throw new Error('root expression authoring is only supported for decisions');
    }

    const definition = EXPRESSION_DEFINITIONS[type];

    if (!definition) {
      throw new Error(`unsupported expression type <${ type }>`);
    }

    const expression = this._createExpression(type, definition);

    expression.$parent = element;

    this._modeling.updateProperties(element, {
      decisionLogic: expression
    });
  }

  _createExpression(type, definition) {
    const attrs = {};

    if (definition.iteratorVariable) {
      attrs.iteratorVariable = definition.iteratorVariable;
    }

    const expression = this._dmnFactory.create(type, attrs);

    definition.children.forEach(property => {
      const literalExpression = this._dmnFactory.create('dmn:LiteralExpression', {
        text: ''
      });
      const childExpression = this._dmnFactory.create('dmn:ChildExpression', {
        value: literalExpression
      });

      literalExpression.$parent = childExpression;
      childExpression.$parent = expression;

      expression.set(property, childExpression);
    });

    return expression;
  }
}
