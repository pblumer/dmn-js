import { is } from 'dmn-js-shared/lib/util/ModelUtil';


export class ContextComponentProvider {
  static $inject = [ 'components' ];

  constructor(components) {
    components.onGetComponent('expression', ({ expression }) => {
      if (is(expression, 'dmn:Context')) {
        return ContextComponent;
      }
    });
  }
}

function ContextComponent({ expression }) {
  const entries = expression.get('contextEntry') || [];

  return (
    <div className="context-expression">
      {
        entries.map((entry, index) => {
          return <ContextEntry entry={ entry } key={ index } />;
        })
      }
    </div>
  );
}

function ContextEntry({ entry }) {
  const variable = entry.get('variable');
  const expression = entry.get('value');

  return (
    <div className="context-entry">
      <div className="context-entry-variable">
        { variable && variable.name }
      </div>
      <div className="context-entry-expression">
        <Expression expression={ expression } />
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
