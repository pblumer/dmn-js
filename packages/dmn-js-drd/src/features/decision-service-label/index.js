import DecisionServiceLabelMove from './DecisionServiceLabelMove';
import DecisionServiceLabelMoveHandle from './DecisionServiceLabelMoveHandle';
import DecisionServiceLabelResize from './DecisionServiceLabelResize';


export default {
  __init__: [
    'decisionServiceLabelMove',
    'decisionServiceLabelResize',
    'decisionServiceLabelMoveHandle'
  ],
  decisionServiceLabelMove: [ 'type', DecisionServiceLabelMove ],
  decisionServiceLabelResize: [ 'type', DecisionServiceLabelResize ],
  decisionServiceLabelMoveHandle: [ 'type', DecisionServiceLabelMoveHandle ]
};
