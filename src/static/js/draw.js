// Please refactor me, this is mostly a complete car crash with globals everywhere.

tool.minDistance = 1;
tool.maxDistance = 45;

var room = window.location.pathname.split("/")[2];
var redoStack = new Array(); // stack to store undo items
$('#exportPNG').attr('download',room+'png');
$('#exportSVG').attr('download',room+'png');

function pickColor(color) {
    $('#color').val(color);
    var rgb = hexToRgb(color);
    $('#activeColorSwatch').css('background-color', 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')');
    update_active_color();
}
var pageCount = 0; // keep track of number of times the canvas cleared, so we can override the correct previous page at db
var currentPageNumber = 1; // when a previous page is loaded, this value should be the previous-page number.
/*
* 0 - latest page
* 1,2,3,4,5 - previous page
*/
var textBoxCoordinate;   // coordinate of the text box. once user complete the required content in text box, draw a pointText on this coordinate
/*http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb*/
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}


$(document).ready(function () {
    //alert('asdasd');
    var drawurl = window.location.href.split("?")[0]; // get the drawing url
    $('#embedinput').val("<iframe name='embed_readwrite' src='" + drawurl + "?showControls=true&showChat=true&showLineNumbers=true&useMonospaceFont=false' width=600 height=400></iframe>"); // write it to the embed input
    $('#linkinput').val(drawurl); // and the share/link input
    $('#drawTool > a').css({
        background: "#eee"
    }); // set the drawtool css to show it as active

    $('#myCanvas').bind('mousewheel', function (ev) {
        scrolled(ev.pageX, ev.pageY, -ev.wheelDelta);
    });

    $('#myCanvas').bind('DOMMouseScroll', function (ev) {
        scrolled(ev.pageX, ev.pageY, ev.detail);
    });

    var drawingPNG = localStorage.getItem("drawingPNG" + room);

    // Temporarily set background as image from memory to improve UX
    $('#canvasContainer').css("background-image", 'url(' + drawingPNG + ')');

    if (paper.project.activeLayer.hasChildren())  // notifying user that he can undo now
        $('.buttonicon-undo').css({opacity: 1});

});

var scaleFactor = 1.1;

function scrolled(x, y, delta) {
    // Far too buggy for now
    /*
     console.log("Scrolling");
     var pt = new Point(x, y),
     scale = 1;
     if(delta < 0) {
     scale *= scaleFactor;
     } else if(delta > 0) {
     scale /= scaleFactor;
     }
     //view.scale(scale, pt);
     $('#myCanvas').
     view.draw();
     */
}


$('#activeColorSwatch').css('background-color', $('.colorSwatch.active').css('background-color'));

// Initialise Socket.io
var socket = io.connect('/');

// Random User ID
// Used when sending data
var uid = (function () {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}());

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.search);
    if (results == null) {
        return "";
    } else {
        return decodeURIComponent(results[1].replace(/\+/g, " "));
    }
}

// Join the room
socket.emit('subscribe', {
    room: room
});

// JSON data of the users current drawing
// Is sent to the user
var path_to_send = {};

// Calculates colors
var active_color_rgb;
var active_color_json = {};
var $opacity = $('#opacityRangeVal');
var update_active_color = function () {
    var rgb_array = $('#activeColorSwatch').css('background-color');
    $('#editbar').css("border-bottom", "solid 2px " + rgb_array);

    while (rgb_array.indexOf(" ") > -1) {
        rgb_array = rgb_array.replace(" ", "");
    }
    rgb_array = rgb_array.substr(4, rgb_array.length - 5);
    rgb_array = rgb_array.split(',');
    var red = rgb_array[0] / 255;
    var green = rgb_array[1] / 255;
    var blue = rgb_array[2] / 255;
    var opacity = $opacity.val() / 255;

    active_color_rgb = new RgbColor(red, green, blue, opacity);
    active_color_rgb._alpha = opacity;
    active_color_json = {
        "red": red || 0,
        "green": green,
        "blue": blue,
        "opacity": opacity
    };
};

// Get the active color from the UI eleements
var authorColor = getParameterByName('authorColor');
var authorColors = {};
if (authorColor != "" && authorColor.substr(0, 4) == "rgb(") {
    authorColor = authorColor.substr(4, authorColor.indexOf(")") - 4);
    authorColors = authorColor.split(",");
    $('#activeColorSwatch').css('background-color', 'rgb(' + authorColors[0] + ',' + authorColors[1] + ',' + authorColors[2] + ')');
}
update_active_color();


$('#colorToggle').on('click', function () {
    clearText();
    $('.tool-box .tool').css({
        border: "none"
    }); // remove the backgrounds from other buttons
    $('.shape-box>li> a').css({
        background: "none"
    }); // remove the shapes tool css to show it as in-active
    $('#colorToggle').css({
        border: "1px solid orange"
    }); // set the selected tool css to show it as active
    $('#mycolorpicker').fadeToggle();
});

$('#clearImage').click(function () {
    clearText();
    $('.tool-box .tool').css({
        border: "none"
    }); // remove the backgrounds from other buttons
    $('.shape-box>li> a').css({
        background: "none"
    }); // remove the shapes tool css to show it as in-active
    $('#clearImage').css({
        border: "1px solid orange"
    }); // set the selected tool css to show it as active
    var p = confirm("Are you sure you want to clear the drawing?");
    if (p) {
        clearCanvas();
        socket.emit('canvas:clear', room);
    }
});

$('.toggleBackground').click(function () {
    clearText();
    $('#myCanvas').toggleClass('whiteBG');
});
$('#whiteboardtool').click(function () {
    clearText();
    //alert();
    localStorage.getItem('board')
    $(this).toggleClass('Enabled');
    if($(this).hasClass('Enabled')){
        $(this).children('.grouped-right').attr('title','Whiteboard Enabled');
    } else {
        $(this).children('.grouped-right').attr('title','Whiteboard Disabled');
    }
   // $(this).next('.grouped-right').attr('title','Whitboard Enabled');
    //send(room);
    var board = false;
    var id = room.split('-');
    id = "myId-"+id[1];
    if($(this).hasClass('Enabled')){
         board = true;
    }
    var data = {
        board:board,
        room:id,
        method:'collab'
    }
    window.parent.postMessage(data, '*');
});
$('#text-box-cancel').click(function () {
    clearText();
});
function clearText(){
    activeTool = "none";
    textBoxCoordinate = null;
    $('#text-box').val('');  // empty the text box
    $('#whiteboard-text-box-container').css({"display": "none"}); // hide the text box container
    $('#myCanvas').css('cursor', 'pointer');
}
// --------------------------------- 
// DRAWING EVENTS


var send_paths_timer;
var timer_is_active = false;
var paper_object_count = 0;
var activeTool = "pencil";
var mouseTimer = 0; // used for getting if the mouse is being held down but not dragged IE when bringin up color picker
var mouseHeld; // global timer for if mouse is held.

var shapeStartPoint;
var shapeEndPoint;
var imageToCrop = null;
var selectionRectangle = null;
var selectionRectangleScale = 0;
var currentRatio = 1;
var previousRatio = 1;
var selectToolMode = "ITEM_DRAG";

function onMouseDown(event) {
    if (event.which === 2) return; // If it's middle mouse button do nothing -- This will be reserved for panning in the future.
    $('.popup').fadeOut();

    // Ignore middle or right mouse button clicks for now
    if (event.event.button == 1 || event.event.button == 2) {
        return;
    }

    //remove cropping tool availability. itz only available just after image is uploaded
    if(activeTool != "crop" && imageToCrop){
        $('.buttonicon-crop').css({opacity: 0.5});
        imageToCrop = null;
    }

    // remove the selectionRectangle
    if(activeTool != "select" && selectionRectangle){
        currentRatio = 1;
        previousRatio = 1;
        selectionRectangle.remove();
        selectionRectangle = null;
        selectionRectangleScale = 0;
    }

    // remove the color picker after picking color and start drawing again
    if($('#mycolorpicker').is(':visible')){
        $('#mycolorpicker').fadeToggle();
        $('.tool-box .tool').css({
            border: "none"
        }); // remove the backgrounds from other buttons
        $('.shape-box>li> a').css({
            background: "none"
        }); // remove the shapes tool css to show it as in-active
    }

    //mouseTimer = 0;
    //mouseHeld = setInterval(function() { // is the mouse being held and not dragged?
    //  mouseTimer++;
    //  if (mouseTimer > 5) {
    //    mouseTimer = 0;
    //    $('#mycolorpicker').toggle(); // show the color picker
    //    $('#mycolorpicker').css({
    //      "left": event.event.pageX - 250,
    //      "top": event.event.pageY - 100
    //    }); // make it in the smae position
    //  }
    //}, 100);

    if (activeTool == "draw" || activeTool == "pencil" || activeTool == "eraser" || activeTool == "line" ) {
        // The data we will send every 100ms on mouse drag

        var point = event.point;
        path = new Path();
        path.add(event.point);
        path.name = uid + ":" + (++paper_object_count);
        path_to_send = {
            name: path.name,
            rgba: active_color_json,
            start: event.point,
            path: [],
            tool: activeTool
        };
        if (activeTool == "draw") {
            path.fillColor = active_color_rgb;
        } else if (activeTool == "pencil") {
            path.strokeColor = active_color_rgb;
            path.strokeWidth = 2;
        } else if (activeTool == "eraser") {
            path.strokeColor = "rgb(252, 252, 252)";
            console.log(path.strokeColor);
            path.strokeWidth = 15; // increase this size for a larger eraser
            // The data we will send every 100ms on mouse drag
            path_to_send = {
                name: path.name,
                rgba: {
                    "red": 252,
                    "green": 252,
                    "blue": 252,
                    "opacity": 1
                },
                start: event.point,
                path: [],
                tool: activeTool
            };
        }
        else if (activeTool == "line"  ) {
            shapeStartPoint = point;
            //path.add(2);
            //path.insert(0, 3);
            //var rectangle = new Rectangle(new Point(50, 50), new Point(150, 100));
            //var cornerSize = new Size(20, 20);
            //var path = new Path.RoundRectangle(rectangle, cornerSize);
            //path.fillColor = 'black';

        }

        view.draw();


    }
   else if(activeTool == "textBox"){
        textBoxCoordinate = event.point;
        $('#whiteboard-text-box-container').css({"top": event.point.y + 'px', "left": event.point.x + 'px', "display": "block"});
    }
}

var item_move_delta;
var send_item_move_timer;
var item_move_timer_is_active = false;

function onMouseDrag(event) {

    mouseTimer = 0;
    clearInterval(mouseHeld);

    // Ignore middle or right mouse button clicks for now
    if (event.event.button == 1 || event.event.button == 2) {
        return;
    }

    if (activeTool == "draw" || activeTool == "pencil" || activeTool == "eraser" || activeTool == "line" ) {
        var step = event.delta / 2;
        step.angle += 90;
        if (activeTool == "draw") {
            var top = event.middlePoint + step;
            var bottom = event.middlePoint - step;
        } else if (activeTool == "pencil") {
            var top = event.middlePoint;
            bottom = event.middlePoint;
        } else if (activeTool == "eraser") {
            var top = event.middlePoint + 10; // 10 is added since clicking point is taken as the top left corner of cursor_eraser
            var bottom = event.middlePoint + 10; // increase this size appropriately for a larger eraser
        }


        //path.smooth();
        if (activeTool == "line") {
            paper.project.activeLayer.lastChild.remove();
            shapeEndPoint = event.point;
            path = new Path.Line(shapeStartPoint, shapeEndPoint);
            path.name = uid + ":" + (paper_object_count);
            path.strokeColor = active_color_rgb;
            path.strokeWidth = 2;
            path_to_send.path = {
                start: shapeStartPoint,
                end: shapeEndPoint
            };
        }
       
        else {
            path.add(top);
            path.insert(0, bottom);
            // Add data to path
            path_to_send.path.push({
                top: top,
                bottom: bottom
            });
        }
        view.draw();


        // Send paths every 100ms
        if (!timer_is_active) {

            send_paths_timer = setInterval(function () {
                if ((activeTool != "line" ) || path_to_send.path.start) {
                    socket.emit('draw:progress', room, uid, JSON.stringify(path_to_send));
                    console.log("sending");
                    console.log(path_to_send.path.start);
                }
                else {
                    console.log("not send");
                }
                path_to_send.path = new Array();

            }, 100);

        }

        timer_is_active = true;
    }


}


function onMouseUp(event) {
    if (paper.project.activeLayer.hasChildren())  // notifying user that he can undo now
        $('.buttonicon-undo').css({opacity: 1});

    if (activeTool != 'undo' && activeTool != 'redo' && redoStack.length > 0) {  // clearing redo stack after user restarts drawing
        $('.buttonicon-redo').css({opacity: 0.5}); // notifying user that he can't redo now
        redoStack.length = 0;
    }

    // Ignore middle or right mouse button clicks for now
    if (event.event.button == 1 || event.event.button == 2) {
        return;
    }

    clearInterval(mouseHeld);

    if (activeTool == "line" ) {
        shapeEndPoint = event.point;
        path_to_send.path = {
            start: shapeStartPoint,
            end: shapeEndPoint
        };
        path.closed = true;
        view.draw();

        socket.emit('draw:progress', room, uid, JSON.stringify(path_to_send));
        socket.emit('draw:end', room, uid, JSON.stringify(path_to_send));

        // Stop new path data being added & sent
        clearInterval(send_paths_timer);
        path_to_send.path = new Array();
        timer_is_active = false;
    }
    
    else if (activeTool == "draw" || activeTool == "pencil" || activeTool == "eraser") {
        // Close the users path
        path.add(event.point);
        path.closed = true;
        //path.smooth();
        view.draw();

        // Send the path to other users
        path_to_send.end = event.point;
        // This covers the case where paths are created in less than 100 seconds
        // it does add a duplicate segment, but that is okay for now.
        socket.emit('draw:progress', room, uid, JSON.stringify(path_to_send));
        socket.emit('draw:end', room, uid, JSON.stringify(path_to_send));

        // Stop new path data being added & sent
        clearInterval(send_paths_timer);
        path_to_send.path = new Array();
        timer_is_active = false;
    }
    

}

var key_move_delta;
var send_key_move_timer;
var key_move_timer_is_active = false;

function onKeyDown(event) {
    if (activeTool == "select") {
        var point = null;

        if (event.key == "up") {
            point = new paper.Point(0, -1);
        } else if (event.key == "down") {
            point = new paper.Point(0, 1);
        } else if (event.key == "left") {
            point = new paper.Point(-1, 0);
        } else if (event.key == "right") {
            point = new paper.Point(1, 0);
        }

        // Move objects 1 pixel with arrow keys
        if (point) {
            moveItemsBy1Pixel(point);
        }

        // Store delta
        if (paper.project.selectedItems && point) {
            if (!key_move_delta) {
                key_move_delta = point;
            } else {
                key_move_delta += point;
            }
        }

        // Send move updates every 100 ms as batch updates
        if (!key_move_timer_is_active && point) {
            send_key_move_timer = setInterval(function () {
                if (key_move_delta) {
                    var itemNames = new Array();
                    for (x in paper.project.selectedItems) {
                        var item = paper.project.selectedItems[x];
                        itemNames.push(item._name);
                    }
                    socket.emit('item:move:progress', room, uid, itemNames, key_move_delta);
                    key_move_delta = null;
                }
            }, 100);
        }
        key_move_timer_is_active = true;
    }
}

function onKeyUp(event) {

    if (event.key == "delete") {
        // Delete selected items
        var items = paper.project.selectedItems;
        if (items) {
            for (x in items) {
                var item = items[x];
                socket.emit('item:remove', room, uid, item.name);
                item.remove();
                view.draw();
            }
        }
    }

    if (activeTool == "select") {
        // End arrow key movement timer
        clearInterval(send_key_move_timer);
        if (key_move_delta) {
            // Send any remaining movement info
            var itemNames = new Array();
            for (x in paper.project.selectedItems) {
                var item = paper.project.selectedItems[x];
                itemNames.push(item._name);
            }
            socket.emit('item:move:end', room, uid, itemNames, key_move_delta);
        } else {
            // delta is null, so send 0 change
            socket.emit('item:move:end', room, uid, itemNames, new Point(0, 0));
        }
        key_move_delta = null;
        key_move_timer_is_active = false;
    }
}

function moveItemsBy1Pixel(point) {
    if (!point) {
        return;
    }

    if (paper.project.selectedItems.length < 1) {
        return;
    }

    // Move locally
    var itemNames = new Array();
    for (x in paper.project.selectedItems) {
        var item = paper.project.selectedItems[x];
        item.position += point;
        itemNames.push(item._name);
    }

    // Redraw screen for item position update
    view.draw();
}

// Drop image onto canvas to upload it
$('#myCanvas').bind('dragover dragenter', function (e) {
    e.preventDefault();
});

$('#myCanvas').bind('drop', function (e) {
    e = e || window.event; // get window.event if e argument missing (in IE)
    if (e.preventDefault) { // stops the browser from redirecting off to the image.
        e.preventDefault();
    }
    e = e.originalEvent;
    var dt = e.dataTransfer;
    var files = dt.files;
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        uploadImage(file);
    }
});


// ---------------------------------
// CONTROLS EVENTS

var $color = $('.colorSwatch:not(#pickerSwatch)');
$color.on('click', function () {

    $color.removeClass('active');
    $(this).addClass('active');
    $('#activeColorSwatch').css('background-color', $(this).css('background-color'));
    update_active_color();

});

$('#pickerSwatch').on('click', function () {
    clearText();
    $('#myColorPicker').fadeToggle();
});
$('#settingslink').on('click', function () {
    clearText();
    $('#settings').fadeToggle();
});
$('#embedlink').on('click', function () {
    clearText();
    $('#embed').fadeToggle();
});
$('#importExport').on('click', function () {
    clearText();
    $('.tool-box .tool').css({
        border: "none"
    }); // remove the backgrounds from other buttons
    $('.shape-box>li> a').css({
        background: "none"
    }); // remove the shapes tool css to show it as in-active
    $('#importExport').css({
        border: "1px solid orange"
    }); // set the selected tool css to show it as active
    $('#importexport').fadeToggle();
    if (redoStack.length > 0) {  // clearing redo stack after user restarts drawing
        $('.buttonicon-redo').css({opacity: 0.5}); // notifying user that he can't redo now
        redoStack.length = 0;
    }
});
/*$('#usericon').on('click', function () {
    $('#mycolorpicker').fadeToggle();
});*/
$('#clearCanvas').on('click', function () {
    clearText();
    $('.tool-box .tool').css({
        border: "none"
    }); // remove the backgrounds from other buttons
    $('.shape-box>li> a').css({
        background: "none"
    }); // remove the shapes tool css to show it as in-active
    $('#clearCanvas').css({
        border: "1px solid orange"
    }); // set the selected tool css to show it as active
    clearCanvas();
    socket.emit('canvas:clear', room);
});
$('#exportSVG').on('click', function () {
    clearText();
    //this.href = document.getElementById('myCanvas').toDataURL('image/svg');
    exportSVG();
});
$('#exportPNG').on('click', function () {
    clearText();
    this.href = document.getElementById('myCanvas').toDataURL();
    //exportPNG();
});

$('#drawTool').on('click', function () {
    clearText();
    $('.tool-box .tool').css({
        border: "none"
    }); // remove the backgrounds from other buttons
    $('.shape-box>li> a').css({
        background: "none"
    }); // remove the shapes tool css to show it as in-active
    $('#drawTool').css({
        border: "1px solid orange"
    }); // set the selected tool css to show it as active
    activeTool = "draw";
    $('#myCanvas').css('cursor', 'pointer');
    paper.project.activeLayer.selected = false;
});

$('#pencilTool').on('click', function () {
    clearText();
    $('.tool-box .tool').css({
        border: "none"
    }); // remove the backgrounds from other buttons
    $('.shape-box>li> a').css({
        background: "none"
    }); // remove the shapes tool css to show it as in-active
    $('#pencilTool').css({
        border: "1px solid orange"
    }); // set the selected tool css to show it as active
    activeTool = "pencil";
    $('#myCanvas').css('cursor', 'pointer');
    paper.project.activeLayer.selected = false;
});

$('#textBoxTool').on('click', function () {
    $('.tool-box .tool').css({
        border: "none"
    }); // remove the backgrounds from other buttons
    $('.shape-box>li> a').css({
        background: "none"
    }); // remove the shapes tool css to show it as in-active
    $('#textBoxTool').css({
        border: "1px solid orange"
    }); // set the selected tool css to show it as active    activeTool = "point";
    $('#myCanvas').css('cursor', 'text');
    activeTool = "textBox";
});

$('#text-box-save').on('click', function(){
    var text = $('#text-box').val().trim();
    var fontColor = $('select[name="font-colors"]').val();
    var fontSize = $('select[name="font-sizes"]').val();
    if(text.length > 0){
        var text = new PointText({
         point: textBoxCoordinate,
         content: text,
         fillColor: fontColor,
         fontSize: fontSize
         });
        text.name = uid + ":" + (++paper_object_count);
        var color = [];
        if(fontColor=='black') {
            color =[0,0,0,0.78431];
        } else if (fontColor == 'green') {
            color =[0.16863,0.73333,0.08627,0.78431];
        } else if (fontColor == 'blue') {
            color =[0.09804,0.03922,0.78039,0.78431];
        } else if (fontColor == 'red') {
            color =[1,0,0];
        }
         
        socket.emit('add:textbox', room, uid, text, color, fontSize, textBoxCoordinate, name, currentPageNumber);
        activeTool = "none";
        textBoxCoordinate = null;
        $('#text-box').val('');  // empty the text box
        $('#whiteboard-text-box-container').css({"display": "none"}); // hide the text box container
        $('#myCanvas').css('cursor', 'pointer');
    }
});
$('#eraserTool').on('click', function () {
    clearText();
    $('.tool-box .tool').css({
        border: "none"
    }); // remove the backgrounds from other buttons
    $('.shape-box>li> a').css({
        background: "none"
    }); // remove the shapes tool css to show it as in-active
    $('#eraserTool').css({
        border: "1px solid orange"
    }); // set the selected tool css to show it as active
    activeTool = "eraser";
    $('#myCanvas').css('cursor', 'url(/wb_assets/static/img/cursor_eraser.png),pointer');
    paper.project.activeLayer.selected = false;

});



$('#undoTool').on('click', function () {
    clearText();
    $('.tool-box .tool').css({
        border: "none"
    }); // remove the backgrounds from other buttons
    $('.shape-box>li> a').css({
        background: "none"
    }); // remove the shapes tool css to show it as in-active
    if (paper.project.activeLayer.hasChildren()) {
        $('#undoTool > a').css({
            background: "orange"
        }); // set the selecttool css to show it as active
        $('.buttonicon-redo').css({opacity: 1});
        activeTool = "undo";
        redoStack.push(paper.project.activeLayer.lastChild);
        socket.emit('undo', room, uid);
        paper.project.activeLayer.lastChild.remove();
        if (!paper.project.activeLayer.hasChildren())
            $('.buttonicon-undo').css({opacity: 0.5});
        view.draw();
    }
});

function clearCanvas() {
    // Remove all but the active layer
    if (project.layers.length > 1) {
        var activeLayerID = project.activeLayer._id;
        for (var i = 0; i < project.layers.length; i++) {
            if (project.layers[i]._id != activeLayerID) {
                project.layers[i].remove();
                i--;
            }
        }
    }

    // Remove all of the children from the active layer
    if (paper.project.activeLayer && paper.project.activeLayer.hasChildren()) {
        paper.project.activeLayer.removeChildren();
    }
    $('.buttonicon-undo').css({opacity: 0.5});
    $('.buttonicon-redo').css({opacity: 0.5});
    view.draw();
}

function exportSVG() {
    var svg = paper.project.exportSVG();
    encodeAsImgAndLink(svg);
}

// Encodes svg as a base64 text and opens a new browser window
// to the svg image that can be saved as a .svg on the users
// local filesystem. This skips making a round trip to the server
// for a POST.
function encodeAsImgAndLink(svg) {
    if ($.browser.msie) {
        // Add some critical information
        svg.setAttribute('version', '1.1');
        var dummy = document.createElement('div');
        dummy.appendChild(svg);
        window.winsvg = window.open('/static/html/export.html');
        window.winsvg.document.write(dummy.innerHTML);
        window.winsvg.document.body.style.margin = 0;
    } else {
        // Add some critical information
        svg.setAttribute('version', '1.1');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

        var dummy = document.createElement('div');
        dummy.appendChild(svg);

        var b64 = Base64.encode(dummy.innerHTML);

        //window.winsvg = window.open("data:image/svg+xml;base64,\n"+b64);
        var html = "<img style='height:100%;width:100%;' src='data:image/svg+xml;base64," + b64 + "' />"
        window.winsvg = window.open();
        window.winsvg.document.write(html);
        window.winsvg.document.body.style.margin = 0;
    }
}

// Encodes png as a base64 text and opens a new browser window
// to the png image that can be saved as a .png on the users
// local filesystem. This skips making a round trip to the server
// for a POST.
function exportPNG() {
    var canvas = document.getElementById('myCanvas');
    var html = "<img src='" + canvas.toDataURL('image/png') + "' />"
    if ($.browser.msie) {
        window.winpng = window.open('/static/html/export.html');
        window.winpng.document.write(html);
        window.winpng.document.body.style.margin = 0;
    } else {
        window.winpng = window.open();
        window.winpng.document.write(html);
        window.winpng.document.body.style.margin = 0;
    }

}

// User selects an image from the file browser to upload
$('#imageInput').bind('change', function (e) {
    // Get selected files
    var files = document.getElementById('imageInput').files;
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        uploadImage(file);
    }
    if (redoStack.length > 0) {  // clearing redo stack after user restarts drawing
        $('.buttonicon-redo').css({opacity: 0.5}); // notifying user that he can't redo now
        redoStack.length = 0;
    }
});

function uploadImage(file) {
    var reader = new FileReader();

    //attach event handler
    reader.readAsDataURL(file);
    $(reader).bind('loadend', function (e) {
        var bin = this.result;

        //Add to paper project here
        var raster = new Raster(bin);
        raster.position = view.center;
        raster.name = uid + ":" + (++paper_object_count);
        imageToCrop = raster;
        $('.buttonicon-crop').css({opacity: 1});
        $('.buttonicon-undo').css({opacity: 1});
        socket.emit('image:add', room, uid, JSON.stringify(bin), raster.position, raster.name);
    });
}


// ---------------------------------
// SOCKET.IO EVENTS
socket.on('settings', function (settings) {
    processSettings(settings);
});

socket.on('draw:progress', function (artist, data) {

    // It wasn't this user who created the event
    if (artist !== uid && data) {
        progress_external_path(JSON.parse(data), artist);
    }

});

socket.on('draw:end', function (artist, data) {

    // It wasn't this user who created the event
    if (artist !== uid && data) {
        end_external_path(JSON.parse(data), artist);
    }

});

socket.on('user:connect', function (user_count) {
    console.log("user:connect");
    update_user_count(user_count);
});

socket.on('user:disconnect', function (user_count) {
    update_user_count(user_count);
});

socket.on('project:load', function (json) {
    console.log("project:load");
    if(json.project.length !== 2){
        paper.project.activeLayer.remove();
        paper.project.importJSON(json.project);

        // Make color selector draggable
        $('#mycolorpicker').pep({});
        // Make sure the range event doesn't propogate to pep
        $('#opacityRangeVal').on('touchstart MSPointerDown mousedown', function (ev) {
            ev.stopPropagation();
        }).on('change', function (ev) {
            update_active_color();
        });

        view.draw();
    }
     //   $.get("../img/wheel.png");
});

socket.on('project:load:error', function () {
    $('#lostConnection').show();
});

socket.on('canvas:clear', function () {
    clearCanvas();
});

socket.on('loading:start', function () {
    // console.log("loading:start");
    $('#loading').show();
});

socket.on('loading:end', function () {
    $('#loading').hide();
    $('#colorpicker').farbtastic(pickColor); // make a color picker
    // cake
    $('#canvasContainer').css("background-image", 'none');

});

socket.on('item:remove', function (artist, name) {
    if (artist != uid && paper.project.activeLayer._namedChildren[name][0]) {
        paper.project.activeLayer._namedChildren[name][0].remove();
        view.draw();
    }
});

socket.on('item:move', function (artist, itemNames, delta) {
    if (artist != uid) {
        for (x in itemNames) {
            var itemName = itemNames[x];
            if (paper.project.activeLayer._namedChildren[itemName] && paper.project.activeLayer._namedChildren[itemName][0] ) {
                paper.project.activeLayer._namedChildren[itemName][0].position += new Point(delta[1], delta[2]);
            }
        }
        view.draw();
    }
});

socket.on('image:add', function (artist, data, position, name) {
    if (artist != uid) {
        var image = JSON.parse(data);
        var raster = new Raster(image);
        raster.position = new Point(position[1], position[2]);
        raster.name = name;
        imageToCrop = raster;
        view.draw();
    }
});

socket.on('undo', function (artist) {
    if (artist != uid) {
        redoStack.push(paper.project.activeLayer.lastChild);
        paper.project.activeLayer.lastChild.remove();
        view.draw();
    }
});



socket.on('image:resize', function (artist, imageName, scalingFactor) {
    if (artist != uid) {
        if (paper.project.activeLayer._namedChildren[imageName] && paper.project.activeLayer._namedChildren[imageName][0]) {
            paper.project.activeLayer._namedChildren[imageName][0].scale(scalingFactor);
        }
        view.draw();
    }
});
socket.on('add:textbox', function (artist, text, fontColor, fontSize, position, name) {
    if (artist != uid) {
        var text = new PointText({
            point: new Point(position[1], position[2]),
            content: text[1].content,
            fillColor: fontColor,
            fontSize: fontSize
        });
        text.name = name;
        view.draw();
    }
});

// --------------------------------- 
// SOCKET.IO EVENT FUNCTIONS

// Updates the active connections
var $user_count = $('#online_count');

function update_user_count(count) {
    $user_count.text((count === 1) ? "1" : " " + count);
}

var external_paths = {};

// Ends a path
var end_external_path = function (points, artist) {
    if(points.tool == "crop"){
        prevpath.clipMask = true;
        var group = new Group();
        group.addChild(imageToCrop);
        group.addChild(prevpath);
        var rasterizedItem = group.rasterize(); // ratserizing group into one item
        var rasterizedImage = new Raster(rasterizedItem.toDataURL()); // creating raster from rasterized item
        rasterizedImage.name = points.name; // name the raster to a new item of canvas
        rasterizedImage.position = imageToCrop.position;
        rasterizedImage.sendToBack();
        group.remove();  // remove the group after rasterizing
        rasterizedItem.remove(); // remove the rasterized item after creating image from it
        imageToCrop = null;
        view.draw();
    }
    prevpath = null;
    var path = external_paths[artist];
    if (path) {
        //path = new Path.Line(new Point(points.path.start[1], points.path.start[2]), new Point(points.path.end[1], points.path.end[2]));
        path.closed = true;
        //view.draw();
        external_paths[artist] = false;
    }
};

// Continues to draw a path in real time
var prevpath = null;
var progress_external_path = function (points, artist) {
    var color = new RgbColor(points.rgba.red, points.rgba.green, points.rgba.blue, points.rgba.opacity);
    if (points.tool == "line") {
        if (prevpath) {
            prevpath.remove();
        }
        path = external_paths[artist];
        if (!path) {
            //  // Creates the path in an easy to access way
            external_paths[artist] = new Path();
            path = external_paths[artist];
        }
        var line = new Path.Line(new Point(points.path.start[1], points.path.start[2]), new Point(points.path.end[1], points.path.end[2]));
        line.strokeColor = color;
        line.strokeWidth = 2;
        line.name = points.name;
        path = line;
        prevpath = path;


    }
    else {
        var path = external_paths[artist];

        // The path hasn't already been started
        // So start it
        if (!path) {

            // Creates the path in an easy to access way
            external_paths[artist] = new Path();
            path = external_paths[artist];

            // Starts the path
            var start_point = new Point(points.start[1], points.start[2]);

            if (points.tool == "draw") {
                path.fillColor = color;
            } else if (points.tool == "pencil") {
                path.strokeColor = color;
                path.strokeWidth = 2;
            }
            else if (points.tool == "eraser") {
                path.strokeColor = "rgb(252, 252, 252)";
                path.strokeWidth = 15;
            }
            if (points.tool == "line") {
                //start_point = new Line();
                //path.add(points.path);
            }
            else {
                path.name = points.name;
                path.add(start_point);
            }

        }

        // Draw all the points along the length of the path
        var paths = points.path;
        var length = paths.length;
        for (var i = 0; i < length; i++) {

            path.add(new Point(paths[i].top[1], paths[i].top[2]));
            path.insert(0, new Point(paths[i].bottom[1], paths[i].bottom[2]));

        }
    }

    view.draw();

};

function processSettings(settings) {

    $.each(settings, function (k, v) {

        // Handle tool changes
        if (k === "tool") {
            $('.buttonicon-' + v).click();
        }

    })

}

// Periodically save drawing
setInterval(function () {
    saveDrawing();
}, 1000);

function saveDrawing() {
    var canvas = document.getElementById('myCanvas');
    // Save image to localStorage
    //localStorage.setItem("drawingPNG" + room, canvas.toDataURL('image/png'));
}
