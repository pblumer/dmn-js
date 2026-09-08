import Input from 'dmn-js-shared/lib/components/Input';
import { is } from 'dmn-js-shared/lib/util/ModelUtil';

import { withChangeSupport } from '../../../util/withChangeSupport';


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

function ContextEntry({ entry }, context) {
  const variable = entry.get('variable');
  const expression = entry.get('value');
  const contextEditor = context.injector.get('context', false);

  return (
    <div className="context-entry">
      <div className="context-entry-variable">
        {
          contextEditor && variable
            ? <ContextVariable variable={ variable } />
            : variable && variable.name
        }
      </div>
      <div className="context-entry-expression">
        <Expression expression={ expression } />
      </div>
    </div>
  );
}

const ContextVariable = withChangeSupport(
  function({ variable }, context) {
    const contextEditor = context.injector.get('context');
    const translate = context.injector.get('translate');

    return <Input
      label={ translate('Variable') }
      className="context-variable-input editor"
      value={ variable.name || '' }
      onChange={ name => contextEditor.updateVariable(variable, { name }) }
    />;
  },
  props => [ props.variable ]
);

function Expression({ expression }, context) {
  if (!expression) {
    return null;
  }

  const Component = context.components.getComponent('expression', {
    expression
  });

  return <Component expression={ expression } />;
}
