import { is } from 'dmn-js-shared/lib/util/ModelUtil';


export class RelationComponentProvider {
  static $inject = [ 'components' ];

  constructor(components) {
    components.onGetComponent('expression', ({ expression }) => {
      if (is(expression, 'dmn:Relation')) {
        return RelationComponent;
      }
    });
  }
}

function RelationComponent({ expression }) {
  const columns = expression.get('column') || [];
  const rows = expression.get('row') || [];

  return (
    <div className="relation-expression">
      <div className="relation-columns">
        {
          columns.map((column, index) => {
            return (
              <div className="relation-column" key={ index }>
                { column.get('name') || '' }
              </div>
            );
          })
        }
      </div>
      <div className="relation-rows">
        {
          rows.map((row, index) => {
            return (
              <div className="relation-row" key={ index }>
                <Expression expression={ row } />
              </div>
            );
          })
        }
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
