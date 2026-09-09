import { is } from 'dmn-js-shared/lib/util/ModelUtil';

import IteratorVariable from '../../../components/IteratorVariable';


export class SomeComponentProvider {
  static $inject = [ 'components' ];

  constructor(components) {
    components.onGetComponent('expression', ({ expression }) => {
      if (is(expression, 'dmn:Some')) {
        return SomeComponent;
      }
    });
  }
}

function SomeComponent({ expression }) {
  const inExpression = getChildExpression(expression.get('in'));
  const satisfiesExpression = getChildExpression(expression.get('satisfies'));

  return (
    <div className="some-expression">
      <div className="some-iterator">
        <IteratorVariable expression={ expression } />
      </div>
      <div className="some-in">
        <Expression expression={ inExpression } />
      </div>
      <div className="some-satisfies">
        <Expression expression={ satisfiesExpression } />
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
