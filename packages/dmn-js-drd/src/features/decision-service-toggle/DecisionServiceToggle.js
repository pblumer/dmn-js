import {
  delegate as domDelegate
} from 'min-dom';

import {
  is
} from 'dmn-js-shared/lib/util/ModelUtil';

// The button sits exactly on the marker DrdRenderer paints on a folded service, so
// a folded service has one thing at the bottom of its box rather than two.
import {
  COLLAPSED_MARKER_MARGIN,
  COLLAPSED_MARKER_SIZE,
  isDecisionServiceCollapsed
} from '../modeling/DecisionServiceUtil';


/**
 * The fold switch, drawn inside the Decision Service rather than beside it.
 *
 * It was on the context pad, which meant selecting the box first and reading an icon
 * strip to find it. A collapsed sub-process carries its switch in the shape, at the
 * bottom edge, and that is where a reader looks for it — so this one is there too:
 * a plus while the definition is folded away, a minus while it is shown, in the same
 * place either way, so the two states are one control rather than two.
 *
 * An overlay rather than something the renderer draws: the renderer says what the
 * notation is, and a button is not notation. It is also why this is a modeler
 * feature — a viewer draws the marker and offers nothing to press.
 */
export default class DecisionServiceToggle {

  constructor(eventBus, overlays, modeling, translate) {
    this._overlays = overlays;
    this._modeling = modeling;
    this._translate = translate;

    this._overlayIds = {};

    eventBus.on('shape.added', ({ element }) => this._update(element));

    // A fold flips the flag and resizes the box, so both the glyph and where it
    // belongs have changed. An overlay is positioned once, when it is added, so the
    // answer is a new one rather than a moved one.
    eventBus.on('element.changed', ({ element }) => this._update(element));

    eventBus.on([ 'shape.removed', 'diagram.clear' ], ({ element }) => {
      if (element) {
        this._remove(element);
      } else {
        this._overlayIds = {};
      }
    });
  }

  _update(element) {
    if (!is(element, 'dmn:DecisionService')) {
      return;
    }

    this._remove(element);

    const collapsed = isDecisionServiceCollapsed(element),
          translate = this._translate;

    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'dmn-decision-service-toggle ' +
      (collapsed ? 'dmn-icon-plus' : 'dmn-icon-minus');
    button.title = collapsed
      ? translate('Expand decision service')
      : translate('Collapse decision service');

    const id = this._overlays.add(element, 'decision-service-toggle', {
      position: {
        bottom: COLLAPSED_MARKER_MARGIN + COLLAPSED_MARKER_SIZE,
        left: Math.round((element.width - COLLAPSED_MARKER_SIZE) / 2)
      },
      html: button
    });

    this._overlayIds[element.id] = id;

    domDelegate.bind(
      this._overlays._overlayRoot,
      '[data-overlay-id="' + id + '"]',
      'click',
      () => this._modeling.collapseDecisionService(element, !collapsed)
    );
  }

  _remove(element) {
    const id = this._overlayIds[element.id];

    if (id) {
      this._overlays.remove(id);

      delete this._overlayIds[element.id];
    }
  }
}

DecisionServiceToggle.$inject = [
  'eventBus',
  'overlays',
  'modeling',
  'translate'
];
