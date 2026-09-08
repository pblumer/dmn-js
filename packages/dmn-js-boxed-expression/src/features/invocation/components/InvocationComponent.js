import { is } from 'dmn-js-shared/lib/util/ModelUtil';


export class InvocationComponentProvider {
  static $inject = [ 'components' ];

  constructor(components) {
    components.onGetComponent('expression', ({ expression }) => {
      if (is(expression, 'dmn:Invocation')) {
        return InvocationComponent;
      }
    });
  }
}

function InvocationComponent({ expression }, context) {
  const calledFunction = expression.get('calledFunction');
  const bindings = expression.get('binding') || [];

  return (
    <div className="invocation-expression">
      <div className="invocation-called-function">
        <Expression expression={ calledFunction } />
      </div>
      <div className="invocation-bindings">
        {
          bindings.map((binding, index) => {
            return <Binding binding={ binding } key={ index } />;
          })
        }
      </div>
    </div>
  );
}

function Binding({ binding }, context) {
  const parameter = binding.get('parameter');
  const bindingFormula = binding.get('bindingFormula');

  return (
    <div className="invocation-binding">
      <div className="invocation-parameter">
        { parameter && parameter.name }
      </div>
      <div className="invocation-binding-expression">
        <Expression expression={ bindingFormula } />
      </div>
    </div>
  );
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
