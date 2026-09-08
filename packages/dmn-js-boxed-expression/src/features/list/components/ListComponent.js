import { is } from 'dmn-js-shared/lib/util/ModelUtil';


export class ListComponentProvider {
  static $inject = [ 'components' ];

  constructor(components) {
    components.onGetComponent('expression', ({ expression }) => {
      if (is(expression, 'dmn:List')) {
        return ListComponent;
      }
    });
  }
}

function ListComponent({ expression }) {
  const elements = expression.get('elements') || [];

  return (
    <div className="list-expression">
      {
        elements.map((element, index) => {
          return (
            <div className="list-entry" key={ index }>
              <Expression expression={ element } />
            </div>
          );
        })
      }
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
