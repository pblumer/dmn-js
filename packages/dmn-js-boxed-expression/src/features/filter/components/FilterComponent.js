import { is } from 'dmn-js-shared/lib/util/ModelUtil';


export class FilterComponentProvider {
  static $inject = [ 'components' ];

  constructor(components) {
    components.onGetComponent('expression', ({ expression }) => {
      if (is(expression, 'dmn:Filter')) {
        return FilterComponent;
      }
    });
  }
}

function FilterComponent({ expression }) {
  const inExpression = getChildExpression(expression.get('in'));
  const matchExpression = getChildExpression(expression.get('match'));

  return (
    <div className="filter-expression">
      <div className="filter-in">
        <Expression expression={ inExpression } />
      </div>
      <div className="filter-match">
        <Expression expression={ matchExpression } />
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
