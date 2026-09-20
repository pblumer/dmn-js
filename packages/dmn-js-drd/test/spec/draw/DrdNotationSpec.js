import { expect } from 'chai';

import TestContainer from 'mocha-test-container-support';

import DrdModeler from '../../helper/DrdModeler';

import notationXML from '../../fixtures/dmn/drd-notation-15.dmn';


/**
 * The DRD notation, held as one table.
 *
 * In a DRD the shape carries the meaning: it is the only thing telling a reader a
 * decision from an input datum, or a decision from the service that publishes it.
 * A rounded corner is therefore not a style choice, and a test that only says "it
 * rendered" cannot see the difference between the right shape and the wrong one.
 *
 * So the table below is the notation, one row per element, and every row is read
 * back off the drawn geometry rather than off the markup that produced it. That
 * matters twice over: it is what the specification actually states (a shape, not an
 * attribute), and it keeps the guard alive through a rewrite — a shape may move from
 * a <rect> to a <path> and stay right, and this still says so.
 *
 * DrdRendererSpec covers what is drawn at all; DecisionServiceNotationSpec covers
 * how a decision service is laid out inside its own box — its name, its divider, its
 * collapsed marker. This file covers one question only: what shape is each element
 * drawn as.
 *
 * Source: DMN 1.5, section 5.3.3, Table 5-2 and Figure 5-10.
 */
describe('draw - DRD notation', function() {

  let modeler, viewer;

  beforeEach(async function() {
    modeler = new DrdModeler({
      container: TestContainer.get(this),
      dmnVersion: '1.5'
    });

    const { warnings } = await modeler.importXML(notationXML);

    expect(warnings.map(warning => warning.message).join('\n')).to.eql('');

    viewer = modeler.getActiveViewer();
  });

  afterEach(function() {
    modeler && modeler.destroy();

    modeler = viewer = null;
  });


  describe('shapes', function() {

    // What each element is drawn as, and what that is recognised by. The right-hand
    // column is a measurement, so a row fails when the drawn form changes and not
    // when the code around it does.
    const SHAPES = [
      {
        element: 'a Decision',
        id: 'Decision_Standalone',
        drawnAs: 'a plain rectangle',
        expect(shape) {
          cornerRadii(shape).forEach(radius => expect(radius).to.be.below(1));
        }
      },
      {
        element: 'an Input Data',
        id: 'InputData_Amount',
        drawnAs: 'a stadium - a rectangle with fully rounded ends',

        // Fully rounded means the round runs the whole height: half the height, not
        // a radius that happens to be close to it at the default size.
        expect(shape, element) {
          cornerRadii(shape).forEach(radius => {
            expect(radius).to.be.closeTo(element.height / 2, 1.5);
          });
        }
      },
      {
        element: 'a Decision Service',
        id: 'DecisionService_Approval',
        drawnAs: 'a rounded rectangle',

        // Rounded, and rounded on every corner alike - but not so far that it turns
        // into the stadium an input datum owns, which is the row above.
        expect(shape, element) {
          const radii = cornerRadii(shape);

          expect(Math.min(...radii)).to.be.above(4);
          expect(Math.max(...radii) - Math.min(...radii)).to.be.below(1);
          expect(Math.max(...radii)).to.be.below(element.height / 2 - 4);
        }
      },
      {
        element: 'a Business Knowledge Model',
        id: 'BKM_Instalment',
        drawnAs: 'a rectangle with two opposite corners cut off',

        // Two corners square, two not, on a diagonal - no other element in the table
        // has that signature, so the pairing is what identifies it. Whether the two
        // are cut straight or rounded is a finer point this does not judge.
        //
        // The sides are the second half of it: what is drawn is still a rectangle,
        // with two corners taken off. Slanting both whole sides instead satisfies the
        // corners alone and draws a parallelogram, which is not a shape the notation
        // has.
        expect(shape, element) {
          const [ topLeft, topRight, bottomRight, bottomLeft ] = cornerRadii(shape);

          expect(topLeft).to.be.above(4);
          expect(bottomRight).to.be.above(4);
          expect(topRight).to.be.below(1);
          expect(bottomLeft).to.be.below(1);

          const { left, right } = sideRuns(shape);

          expect(left).to.be.above(element.height * 0.5);
          expect(right).to.be.above(element.height * 0.5);
        }
      },
      {
        element: 'a Knowledge Source',
        id: 'KnowledgeSource_Policy',
        drawnAs: 'a shape with a straight top and a wavy bottom',
        expect(shape) {
          const { top, bottom } = profile(shape);

          expect(straightness(top)).to.be.below(1);
          expect(straightness(bottom)).to.be.above(4);
        }
      },
      {
        element: 'a Text Annotation',
        id: 'TextAnnotation_Note',
        drawnAs: 'an open bracket down its left side, and no box',

        // An annotation is not enclosed: the bracket is the whole of what is drawn,
        // which is why it is narrow and why nothing else in its group is stroked.
        expect(shape, element) {
          const bounds = shape.getBBox();

          expect(bounds.width).to.be.below(element.width * 0.2);
          expect(bounds.height).to.be.above(element.height * 0.9);
          expect(strokedShapes(viewer, element.id)).to.have.lengthOf(1);
        }
      }
    ];

    SHAPES.forEach(function(row) {

      it('should draw ' + row.element + ' as ' + row.drawnAs, function() {

        // given
        const element = viewer.get('elementRegistry').get(row.id);

        // when
        const shape = outlineOf(viewer, row.id);

        // then
        row.expect(shape, element);
      });

    });

  });


  describe('connections', function() {

    // What each requirement is drawn as: the line, and what the line ends in. A
    // knowledge requirement and an authority requirement are both dashed, so the
    // head is the only thing telling them apart - it carries as much of the meaning
    // as the line does.
    const CONNECTIONS = [
      {
        element: 'an Information Requirement',
        id: 'InformationRequirement_Amount',
        line: 'solid',
        head: 'filled-arrow'
      },
      {
        element: 'a Knowledge Requirement',
        id: 'KnowledgeRequirement_Instalment',
        line: 'dashed',
        head: 'open-arrow'
      },
      {
        element: 'an Authority Requirement',
        id: 'AuthorityRequirement_Policy',
        line: 'dashed',
        head: 'filled-circle'
      },
      {
        element: 'an Association',
        id: 'Association_Note',
        line: 'dotted',
        head: 'none'
      }
    ];

    CONNECTIONS.forEach(function(row) {

      it('should draw ' + row.element + ' as a ' + row.line +
         ' line ending in ' + row.head, function() {

        // when
        const line = outlineOf(viewer, row.id);

        // then
        expect(lineStyle(line)).to.eql(row.line);
        expect(headOf(line)).to.eql(row.head);
      });

    });

  });

});


// reading a drawn element ///////////////

/**
 * What a drawn property resolves to. Presentation properties are written into the
 * inline style rather than into attributes, and a stylesheet may still have the last
 * word, so both have to be asked - in that order, because an element parked in
 * <defs> is never laid out and has no computed style worth reading.
 */
function styleOf(element, property) {
  return element.style.getPropertyValue(property) ||
         window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * The shapes of an element that a reader can actually see. A text annotation puts an
 * unstroked box in its group to carry the text, and that box is not part of what is
 * drawn.
 */
function strokedShapes(viewer, id) {
  const visual = viewer.get('elementRegistry').getGraphics(id)
    .querySelector('.djs-visual');

  return Array.from(visual.querySelectorAll('rect, path, polygon, polyline'))
    .filter(shape => styleOf(shape, 'stroke') !== 'none');
}

/**
 * The outline of an element: the first shape drawn for it.
 */
function outlineOf(viewer, id) {
  const shapes = strokedShapes(viewer, id);

  if (!shapes.length) {
    throw new Error('nothing is drawn for ' + id);
  }

  return shapes[0];
}


// geometry //////////////////////////////

const SAMPLES = 2000;

/**
 * Points along a shape's drawn edge, evenly spaced.
 */
function sample(shape) {
  const length = shape.getTotalLength(),
        points = [];

  for (let i = 0; i < SAMPLES; i++) {
    points.push(shape.getPointAtLength(length * i / SAMPLES));
  }

  return points;
}

/**
 * The radius the drawn edge turns each corner of its own bounding box with,
 * clockwise from the top left.
 *
 * A square corner leaves no gap and reports 0. A circular corner of radius r leaves
 * the corner a gap of r * (sqrt(2) - 1), which is what this undoes - so the number
 * that comes back is the radius a reader sees.
 */
function cornerRadii(shape) {
  const bounds = shape.getBBox(),
        points = sample(shape);

  return [
    [ bounds.x, bounds.y ],
    [ bounds.x + bounds.width, bounds.y ],
    [ bounds.x + bounds.width, bounds.y + bounds.height ],
    [ bounds.x, bounds.y + bounds.height ]
  ].map(([ x, y ]) => {
    const gap = Math.min(...points.map(
      point => Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2))
    ));

    return gap / (Math.sqrt(2) - 1);
  });
}

/**
 * The straight run the drawn edge keeps on the left and on the right side.
 *
 * This is what tells a rectangle with its corners taken off from a box sheared into
 * a parallelogram: the first keeps most of both sides, the second keeps none of
 * either.
 */
function sideRuns(shape) {
  const bounds = shape.getBBox(),
        points = sample(shape),
        run = (x) => {
          const ys = points
            .filter(point => Math.abs(point.x - x) < 0.5)
            .map(point => point.y);

          return ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
        };

  return { left: run(bounds.x), right: run(bounds.x + bounds.width) };
}

/**
 * The upper and the lower edge of a shape, one point per column across its width.
 */
function profile(shape) {
  const bounds = shape.getBBox(),
        points = sample(shape),
        columns = 60,
        top = [],
        bottom = [];

  for (let i = 0; i <= columns; i++) {
    const x = bounds.x + bounds.width * i / columns,
          near = points.filter(
            point => Math.abs(point.x - x) <= bounds.width / columns
          );

    if (!near.length) {
      continue;
    }

    top.push({ x: x, y: Math.min(...near.map(point => point.y)) });
    bottom.push({ x: x, y: Math.max(...near.map(point => point.y)) });
  }

  return { top, bottom };
}

/**
 * How far an edge strays from the straight line between its own two ends.
 */
function straightness(edge) {
  const first = edge[0],
        last = edge[edge.length - 1],
        length = Math.sqrt(
          Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2)
        ) || 1;

  return Math.max(...edge.map(point => Math.abs(
    (last.x - first.x) * (first.y - point.y) -
    (first.x - point.x) * (last.y - first.y)
  ) / length));
}


// reading a drawn connection ////////////

/**
 * What a connection's line is drawn as: 'solid', 'dashed' or 'dotted'. A dot is a
 * dash no longer than the line is thick, which is the difference a reader sees.
 */
function lineStyle(line) {
  const dashes = styleOf(line, 'stroke-dasharray').trim();

  if (!dashes || dashes === 'none') {
    return 'solid';
  }

  const on = parseFloat(dashes.split(/[\s,]+/)[0]),
        width = parseFloat(styleOf(line, 'stroke-width')) || 1;

  return on <= width ? 'dotted' : 'dashed';
}

/**
 * What a connection ends in, read off the marker it points at: 'filled-arrow',
 * 'open-arrow', 'filled-circle', 'open-circle' or 'none'.
 */
function headOf(line) {
  const reference = styleOf(line, 'marker-end').match(/url\(["']?#(.+?)["']?\)/);

  if (!reference) {
    return 'none';
  }

  const head = document.getElementById(reference[1]).firstElementChild,
        filled = styleOf(head, 'fill') !== 'none' ? 'filled' : 'open';

  if (head.tagName.toLowerCase() === 'circle') {
    return filled + '-circle';
  }

  return filled + '-arrow';
}
