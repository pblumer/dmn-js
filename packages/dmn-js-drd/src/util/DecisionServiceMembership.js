import {
  is
} from 'dmn-js-shared/lib/util/ModelUtil';


/**
 * The Decisions a Decision Service publishes and evaluates internally.
 *
 * `inputDecision` is deliberately not part of this: it names the boundary the
 * *caller* supplies, which DMN draws outside the service (DMN 1.5 §10.4).
 *
 * @param {ModdleElement} decisionService
 *
 * @return {string[]} member hrefs, in reference order
 */
export function getDecisionServiceMemberHrefs(decisionService) {
  if (!is(decisionService, 'dmn:DecisionService')) {
    return [];
  }

  return decisionService.get('outputDecision')
    .concat(decisionService.get('encapsulatedDecision'))
    .map(function(reference) {
      return reference.href;
    });
}

/**
 * Find the Decision Service a Decision is drawn inside of.
 *
 * Membership alone does not make one: a Decision belongs to a service's picture
 * only when the service names it AND draws it within its own bounds. DMN keeps
 * the two apart - membership lives in references, position in DI - and nothing
 * in the format holds them in step. Nesting a Decision its service does not draw
 * around would move it somewhere nobody put it, so a mismatch stays flat and the
 * diagram reads as it was authored.
 *
 * Where services overlap, the smallest containing one wins: that is the box a
 * reader sees the Decision sitting in.
 *
 * @param {ModdleElement} decision
 *
 * @return {ModdleElement|null}
 */
export function getContainingDecisionService(decision) {
  if (!is(decision, 'dmn:Decision') || !decision.di || !decision.di.bounds) {
    return null;
  }

  var definitions = decision.$parent;

  if (!definitions || !is(definitions, 'dmn:Definitions')) {
    return null;
  }

  var href = '#' + decision.id,
      bounds = decision.di.bounds,
      containing = null;

  definitions.get('drgElement').forEach(function(drgElement) {
    if (!is(drgElement, 'dmn:DecisionService') ||
        !drgElement.di ||
        !drgElement.di.bounds) {
      return;
    }

    if (getDecisionServiceMemberHrefs(drgElement).indexOf(href) === -1) {
      return;
    }

    if (!contains(drgElement.di.bounds, bounds)) {
      return;
    }

    if (!containing || area(drgElement.di.bounds) < area(containing.di.bounds)) {
      containing = drgElement;
    }
  });

  return containing;
}


// helpers //////////

function contains(outer, inner) {
  return inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height;
}

function area(bounds) {
  return bounds.width * bounds.height;
}
