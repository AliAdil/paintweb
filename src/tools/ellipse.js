/*
 * Copyright (C) 2008, 2009 Mihai Şucan
 *
 * This file is part of PaintWeb.
 *
 * PaintWeb is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * PaintWeb is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with PaintWeb.  If not, see <http://www.gnu.org/licenses/>.
 *
 * $URL: http://code.google.com/p/paintweb $
 * $Date: 2009-05-20 14:05:41 +0300 $
 */

/**
 * @author <a lang="ro" href="http://www.robodesign.ro/mihai">Mihai Şucan</a>
 * @fileOverview Holds the ellipse tool implementation.
 */

/**
 * @class The ellipse tool.
 *
 * @param {PaintWeb} app Reference to the main paint application object.
 */
PaintWebInstance.toolAdd('ellipse', function (app) {
  var _self         = this,
      MathMax       = Math.max,
      MathMin       = Math.min,
      clearInterval = window.clearInterval,
      config        = app.config,
      context       = app.buffer.context,
      image         = app.image,
      layerUpdate   = app.layerUpdate,
      mouse         = app.mouse,
      setInterval   = window.setInterval,
      snapXY        = app.toolSnapXY,
      statusShow    = app.statusShow;

  /**
   * The interval ID used for running the pencil drawing operation every few 
   * milliseconds.
   *
   * @private
   * @see PaintWeb.config.toolDrawDelay
   */
  var timer = null;

  /**
   * Tells if the <kbd>Shift</kbd> key is down or not. This is used by the 
   * drawing function.
   *
   * @private
   * @type Boolean
   * @default false
   */
  var shiftKey = false;

  /**
   * Tells if the drawing canvas needs to be updated or not.
   *
   * @private
   * @type Boolean
   * @default false
   */
  var needsRedraw = false;

  var K = 4*((Math.SQRT2-1)/3);

  /**
   * Holds the starting point on the <var>x</var> axis of the image, for the 
   * current drawing operation.
   *
   * @private
   * @type Number
   */
  var x0 = 0;

  /**
   * Holds the starting point on the <var>y</var> axis of the image, for the 
   * current drawing operation.
   *
   * @private
   * @type Number
   */
  var y0 = 0;

  /**
   * Tool deactivation event handler.
   */
  this.deactivate = function () {
    if (timer) {
      clearInterval(timer);
      timer = null;
      needsRedraw = false;
      context.clearRect(0, 0, image.width, image.height);
    }

    return true;
  };

  /**
   * Initialize the drawing operation.
   *
   * @param {Event} ev The DOM Event object.
   */
  this.mousedown = function (ev) {
    // The mouse start position
    x0 = mouse.x;
    y0 = mouse.y;

    if (!timer) {
      timer = setInterval(_self.draw, config.toolDrawDelay);
    }
    shiftKey = ev.shiftKey;
    needsRedraw = false;

    statusShow('ellipseMousedown');

    return true;
  };

  /**
   * Store the <kbd>Shift</kbd> key state which is used by the drawing function.
   *
   * @param {Event} ev The DOM Event object.
   */
  this.mousemove = function (ev) {
    shiftKey = ev.shiftKey;
    needsRedraw = true;
  };

  /**
   * Perform the drawing operation. This function is called every few 
   * milliseconds.
   *
   * <p>Hold down the <kbd>Shift</kbd> key to draw a circle.
   * <p>Press <kbd>Escape</kbd> to cancel the drawing operation.
   *
   * @see PaintWeb.config.toolDrawDelay
   */
  this.draw = function () {
    if (!needsRedraw) {
      return;
    }

    context.clearRect(0, 0, image.width, image.height);

    var rectx0 = MathMin(mouse.x, x0),
        rectx1 = MathMax(mouse.x, x0),
        recty0 = MathMin(mouse.y, y0),
        recty1 = MathMax(mouse.y, y0);

    /*
      ABCD - rectangle
      A(rectx0, recty0), B(rectx1, recty0), C(rectx1, recty1), D(rectx0, recty1)
    */

    var w = rectx1-rectx0,
        h = recty1-recty0;

    if (!w || !h) {
      return;
    }

    // Constrain the ellipse to be a circle
    if (shiftKey) {
      if (w > h) {
        recty1 = recty0+w;
        if (recty0 == mouse.y) {
          recty0 -= w-h;
          recty1 -= w-h;
        }
        h = w;
      } else {
        rectx1 = rectx0+h;
        if (rectx0 == mouse.x) {
          rectx0 -= h-w;
          rectx1 -= h-w;
        }
        w = h;
      }
    }

    // Ellipse radius
    var rx = w/2,
        ry = h/2; 

    // Ellipse center
    var cx = rectx0+rx,
        cy = recty0+ry;

    // Ellipse radius*Kappa, for the Bézier curve control points
    rx *= K;
    ry *= K;

    context.beginPath();

    // startX, startY
    context.moveTo(cx, recty0);

    // Control points: cp1x, cp1y, cp2x, cp2y, destx, desty
    // go clockwise: top-middle, right-middle, bottom-middle, then left-middle
    context.bezierCurveTo(cx + rx, recty0, rectx1, cy - ry, rectx1, cy);
    context.bezierCurveTo(rectx1, cy + ry, cx + rx, recty1, cx, recty1);
    context.bezierCurveTo(cx - rx, recty1, rectx0, cy + ry, rectx0, cy);
    context.bezierCurveTo(rectx0, cy - ry, cx - rx, recty0, cx, recty0);

    if (config.shapeType != 'stroke') {
      context.fill();
    }
    if (config.shapeType != 'fill') {
      context.stroke();
    }

    context.closePath();

    needsRedraw = false;
  };

  /**
   * End the drawing operation, once the user releases the mouse button.
   */
  this.mouseup = function () {
    // Allow click+mousemove, not only mousedown+move+up
    if (mouse.x == x0 && mouse.y == y0) {
      return true;
    }

    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    _self.draw();
    layerUpdate();
    statusShow('ellipseActive');

    return true;
  };

  /**
   * Allows the user to press <kbd>Escape</kbd> to cancel the drawing operation.
   *
   * @param {Event} ev The DOM Event object.
   *
   * @returns {Boolean} True if the drawing operation was cancelled, or false if 
   * not.
   */
  this.keydown = function (ev) {
    if (!mouse.buttonDown || ev.kid_ != 'Escape') {
      return false;
    }

    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    context.clearRect(0, 0, image.width, image.height);
    mouse.buttonDown = false;
    needsRedraw = false;

    statusShow('ellipseActive');

    return true;
  };
});


// vim:set spell spl=en fo=wan1croqlt tw=80 ts=2 sw=2 sts=2 sta et ai cin fenc=utf-8 ff=unix:


