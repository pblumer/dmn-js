import OverlaysModule from 'diagram-js/lib/features/overlays';
import TranslateModule from 'diagram-js/lib/i18n/translate';

import DecisionServiceToggle from './DecisionServiceToggle';

export default {
  __depends__: [
    OverlaysModule,
    TranslateModule
  ],
  __init__: [ 'decisionServiceToggle' ],
  decisionServiceToggle: [ 'type', DecisionServiceToggle ]
};
