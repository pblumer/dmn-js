import Input from 'dmn-js-shared/lib/components/Input';
import Select from 'dmn-js-shared/lib/components/Select';
import { is } from 'dmn-js-shared/lib/util/ModelUtil';

import { withChangeSupport } from '../../../util/withChangeSupport';

const AUTHORABLE_EXPRESSION_TYPES = [
  { label: 'For', value: 'dmn:For' },
  { label: 'Every', value: 'dmn:Every' },
  { label: 'Some', value: 'dmn:Some' },
  { label: 'Filter', value: 'dmn:Filter' }
];

const ElementName = withChangeSupport(function(props, context) {
  const { element } = props;
  const modeling = context.injector.get('modeling');
  const translate = context.injector.get('translate');

  const name = element.get('name');
  const onChange = name => {
    modeling.updateProperties(element, { name });
  };

  return <Input
    label={ translate('Element name') }
    className="element-name editor"
    value={ name }
    onChange={ onChange }
  />;
}, props => [ props.element ]);

const ExpressionType = withChangeSupport(function(props, context) {
  const { element } = props;
  const expressionAuthoring = context.injector.get('expressionAuthoring');
  const translate = context.injector.get('translate');
  const expression = element.get('decisionLogic');
  const currentType = expression && expression.$type;
  const options = AUTHORABLE_EXPRESSION_TYPES.slice();

  if (currentType && !options.some(option => option.value === currentType)) {
    options.unshift({
      label: currentType.replace(/^dmn:/, ''),
      value: currentType
    });
  }

  return <Select
    label={ translate('Expression type') }
    className="expression-type-select editor"
    value={ currentType }
    options={ options }
    onChange={ type => {
      if (type !== currentType) {
        expressionAuthoring.replaceRootExpression(element, type);
      }
    } }
  />;
}, props => [ props.element ]);

export default function ElementPropertiesEditorComponent(_, context) {
  const viewer = context.injector.get('viewer');

  const rootElement = viewer.getRootElement();

  return (
    <div className="element-properties">
      <ElementName element={ rootElement } />
      {
        is(rootElement, 'dmn:Decision')
          ? <ExpressionType element={ rootElement } />
          : null
      }
    </div>
  );
}
