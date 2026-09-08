import { is } from 'dmn-js-shared/lib/util/ModelUtil';


export class ConditionalComponentProvider {
  static $inject = [ 'components' ];

  constructor(components) {
    components.onGetComponent('expression', ({ expression }) => {
      if (is(expression, 'dmn:Conditional')) {
        return ConditionalComponent;
      }
    });
  }
}

function ConditionalComponent({ expression }) {
  const ifExpression = getChildExpression(expression.get('if'));
  const thenExpression = getChildExpression(expression.get('then'));
  const elseExpression = getChildExpression(expression.get('else'));

  return (
    <div className="conditional-expression">
      <div className="conditional-if">
        <Expression expression={ ifExpression } />
      </div>
      <div className="conditional-then">
        <Expression expression={ thenExpression } />
      </div>
      <div className="conditional-else">
        <Expression expression={ elseExpression } />
      </div>
    </div>
  );
}

function getChildExpression(childExpression) {
  return childExpression && childExpression.get('value');
}

function Expression({ expression }, context) {
  if (!expression) {
    return null;
  }

  const Component = context.components.getComponent('expression', {
    expression
  });

  return <Component expression={ expression } />;
}
