import { is } from 'dmn-js-shared/lib/util/ModelUtil';


export class ForComponentProvider {
  static $inject = [ 'components' ];

  constructor(components) {
    components.onGetComponent('expression', ({ expression }) => {
      if (is(expression, 'dmn:For')) {
        return ForComponent;
      }
    });
  }
}

function ForComponent({ expression }) {
  const inExpression = getChildExpression(expression.get('in'));
  const returnExpression = getChildExpression(expression.get('return'));
  const iteratorVariable = expression.get('iteratorVariable') || '';

  return (
    <div className="for-expression">
      <div className="for-iterator">{ iteratorVariable }</div>
      <div className="for-in">
        <Expression expression={ inExpression } />
      </div>
      <div className="for-return">
        <Expression expression={ returnExpression } />
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
