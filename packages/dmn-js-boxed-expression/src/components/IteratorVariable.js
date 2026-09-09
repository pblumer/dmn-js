import Input from 'dmn-js-shared/lib/components/Input';

import { withChangeSupport } from '../util/withChangeSupport';

export default function IteratorVariable({ expression }, context) {
  const expressionAuthoring = context.injector.get('expressionAuthoring', false);

  if (!expressionAuthoring) {
    return expression.get('iteratorVariable') || '';
  }

  return <EditableIteratorVariable expression={ expression } />;
}

const EditableIteratorVariable = withChangeSupport(
  function({ expression }, context) {
    const expressionAuthoring = context.injector.get('expressionAuthoring');
    const translate = context.injector.get('translate');

    return <Input
      label={ translate('Iterator variable') }
      className="iterator-variable-input editor"
      value={ expression.get('iteratorVariable') || '' }
      onChange={ iteratorVariable => {
        expressionAuthoring.updateIteratorVariable(expression, iteratorVariable);
      } }
    />;
  },
  props => [ props.expression ]
);
