'use strict';

(function() {

  var socket = io();
  var canvas = document.getElementsByClassName('whiteboard')[0];
  var colors = document.getElementsByClassName('color');
  var button = document.getElementById('submit');
  var textInput = document.getElementById('textInput');
  var buttonDrawLine = document.getElementById('drawLine');
  var buttonEraserLine = document.getElementById('eraserLine');
  var context = canvas.getContext('2d');
  
  var texts = [];

  var $canvas = $("#canvasss");
  var current = {
    color: 'black',
    lineWidth: 2
  };
  var modeDrawing = false;
  var drawing = false;  
  var selectedText = -1;
  var canvasOffset = $canvas.offset();
  var offsetX = canvasOffset.left;
  var offsetY = canvasOffset.top;

  var startX;
  var startY;

  button.addEventListener("click", drawText);

  buttonDrawLine.addEventListener("click", function() {
    modeDrawing = !modeDrawing;
  });

  buttonEraserLine.addEventListener("click", function() {
    current.color = "white";
    current.lineWidth = 10;
  });


  canvas.addEventListener('mousedown', onMouseDown, false);
  canvas.addEventListener('mouseup', onMouseUp, false);
  canvas.addEventListener('mouseout', onMouseUp, false);
  canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);
  
  //Touch support for mobile devices
  canvas.addEventListener('touchstart', onMouseDown, false);
  canvas.addEventListener('touchend', onMouseUp, false);
  canvas.addEventListener('touchcancel', onMouseUp, false);
  canvas.addEventListener('touchmove', throttle(onMouseMove, 10), false);

  for (var i = 0; i < colors.length; i++){
    colors[i].addEventListener('click', onColorUpdate, false);
  }

  socket.on('drawing', onDrawingEvent);
  socket.on('moving_text', onMovingTextEvent);

  window.addEventListener('resize', onResize, false);
  onResize();

  function drawText(){
    // calc the y coordinate for this text on the canvas
    var y = texts.length * 20 + 200;

    // get the text from the input element
    var text = {
        text: textInput.value,
        x: 50,
        y: y
    };

    // calc the size of this text for hit-testing purposes
    context.font = "16px verdana";
    text.width = context.measureText(text.text).width;
    text.height = 16;
    
    // put this new text in the texts array
    texts.push(text);

    // redraw everything
    draw();
  }

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < texts.length; i++) {
        var text = texts[i];
        console.log(text);
        context.fillText(text.text, text.x, text.y);

    }
  }

  function drawLine(x0, y0, x1, y1, color, lineWidth, emit){
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.stroke();
    context.closePath();

    if (!emit) { return; }
    var w = canvas.width;
    var h = canvas.height;

    socket.emit('drawing', {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color: color,
      lineWidth: lineWidth
    });
  }

  function textHit(x, y, textIndex) {
    var text = texts[textIndex];
    return (x >= text.x && x <= text.x + text.width && y >= text.y - text.height && y <= text.y);
}

  function onMouseDown(e){
    console.log(e);
    if (!modeDrawing) {
      e.preventDefault();
      startX = parseInt(e.clientX - offsetX);
      startY = parseInt(e.clientY - offsetY);
      console.log(startX);
      // Put your mousedown stuff here
      for (var i = 0; i < texts.length; i++) {
          if (textHit(startX, startY, i)) {
              selectedText = i;
          }
      }
    } else {
      drawing = true;
      current.x = e.clientX||e.touches[0].clientX;
      current.y = e.clientY||e.touches[0].clientY;
    }
  }

  function onMouseUp(e){
    
    if(modeDrawing) {
      if (!drawing) { return; }
      drawing = false;
      drawLine(current.x, current.y, e.clientX||e.touches[0].clientX, e.clientY||e.touches[0].clientY, current.color, current.lineWidth, true);
    } else {
      e.preventDefault();
      selectedText = -1;
    }
  }

  function onMouseMove(e){
    if(modeDrawing) {
      if (!drawing) { return; }
      drawLine(current.x, current.y, e.clientX||e.touches[0].clientX, e.clientY||e.touches[0].clientY, current.color, current.lineWidth, true);
      current.x = e.clientX||e.touches[0].clientX;
      current.y = e.clientY||e.touches[0].clientY;
    } else {
      if (selectedText < 0) {
        return;
      }
      e.preventDefault();
      console.log(selectedText);
      let mouseX = parseInt(e.clientX - offsetX);
      let mouseY = parseInt(e.clientY - offsetY);

      // Put your mousemove stuff here
      var dx = mouseX - startX;
      var dy = mouseY - startY;
      startX = mouseX;
      startY = mouseY;

      var text = texts[selectedText];
      text.x += dx;
      text.y += dy;
      draw();
    }
    
  }

  function onColorUpdate(e){
    current.color = e.target.className.split(' ')[1];
    current.lineWidth = 2;
  }

  // limit the number of events per second
  function throttle(callback, delay) {
    var previousCall = new Date().getTime();
    return function() {
      var time = new Date().getTime();

      if ((time - previousCall) >= delay) {
        previousCall = time;
        callback.apply(null, arguments);
      }
    };
  }

  function onDrawingEvent(data){
    var w = canvas.width;
    var h = canvas.height;
    drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.lineWidth);
  }

  function onMovingTextEvent(data){

  }

  // make the canvas fill its parent
  function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

})();