/**
 * Based on and containing parts from: KWin Quick Tile Enhancements 0.2.0 by @thetarkus, Mike Mob
 * https://github.com/thetarkus/kwin-quick-tile-enhancements
 */

// user vars
workspace.gap = readConfig("gap", 10);
workspace.screenEdgeTolerance = readConfig("tolerance", 25);
workspace.topMargin = readConfig("topMargin", 16);

// list of clients to exclude
var excludes = [
    "Desktop — Plasma",
    "Latte Dock",
    "Latte Shell — Latte Dock"
];

// constants
var ScreenEdge = {
  FLOATING:    -2,
  MAXIMIZED:   -1,
  LEFT:         0,
  RIGHT:        1,
  TOP_LEFT:     2,
  TOP_RIGHT:    3,
  BOTTOM_LEFT:  4,
  BOTTOM_RIGHT: 5,
};

// electricBorderMaximise doesnt place windows
// properly so it has been replaced
options.electricBorderMaximize = false;

// gogo
connectClients();

// called when a window is maximised
function onClientMaximize(client, h, v) {
    if (h && v) {
        var x = client.geometry.x;
        var y = client.geometry.y;
        var height = client.geometry.height;
        var width = client.geometry.width;
        // unmaximise, but restore the maximised geometry
        client.setMaximize(false, false);
        client.geometry = { x: x, y: y, width: width, height: height };        
        maximise(client);
    }
}

// called whilst a window is moving
function movingStepper(client) {
    var max = isReadyToMaximise(client);
    if(!!max) {
        workspace.hideOutline();
        workspace.showOutline(max['x'], max['y'] + workspace.topMargin, max['width'], max['height']);
    }
    else {
        workspace.hideOutline();
    }
}

// called when a window has finished moving or resizing
function onClientMoved(client) {
    var screenEdge = getScreenEdge(client);
    print("screen edge is: " + screenEdge);
    if(screenEdge != ScreenEdge.FLOATING && screenEdge != ScreenEdge.MAXIMIZED) {
        maxAndGap(client, screenEdge);
    }
    maximise(client);

    // make sure we clear the outline
    workspace.hideOutline();
}

// resize + add the gaps
function maxAndGap(client, screenEdge) {
    if (clientIsExcluded(client)) return
        
    var maxArea = workspace.clientArea(workspace.MaximizeArea, client);
    var height = maxArea.height;
    var width = maxArea.width;
    
    var gap = {
        top: workspace.gap,
        right: workspace.gap,
        left: workspace.gap,
        bottom: workspace.gap        
    }
    
    // size the window and make sure that the gap doesnt double up, just looks nicer to me
    switch(screenEdge) {
        case ScreenEdge.LEFT:
            gap['right'] = workspace.gap/2;
            width = width/2;
            break;
        case ScreenEdge.RIGHT:
            gap['left'] = workspace.gap/2;
            width = width/2;            
            break;
        case ScreenEdge.TOP_LEFT:
            gap['bottom'] = workspace.gap/2;
            gap['right'] = workspace.gap/2;
            height = height/2;
            width = width/2;            
            break;
        case ScreenEdge.TOP_RIGHT:
            gap['bottom'] = workspace.gap/2;
            gap['left'] = workspace.gap/2;
            height = height/2;
            width = width/2;            
            break;
        case ScreenEdge.BOTTOM_LEFT:
            gap['top'] = workspace.gap/2;
            gap['right'] = workspace.gap/2;
            height = height/2;
            width = width/2;            
            break;
        case ScreenEdge.BOTTOM_RIGHT:
            gap['top'] = workspace.gap/2;
            gap['left'] = workspace.gap/2;
            height = height/2;
            width = width/2;
            break;
    }

    client.geometry = { 
        x: client.geometry.x + gap['left'], 
        y: client.geometry.y + gap['top'], 
        width: width - gap['left'] - gap['right'], 
        height: height - gap['top'] - gap['bottom'] 
    };
    print("new geometry: " + JSON.stringify(client.geometry));
}

// returns false if the window is not being dragged across the top of the screen
// otherwise returns {x y height width} of the monitor we're at the top of
function isReadyToMaximise(client) {
    var tolerance = workspace.screenEdgeTolerance;
    var clientArea = workspace.clientArea(workspace.MaximizeArea, client);
    
    var lowerMonitorY = workspace.displayHeight - clientArea.height - workspace.topMargin;
    var rightMonitorX = workspace.displayWidth - clientArea.width;
    var midPointX = client.geometry.x + (client.geometry.width / 2);
    
    if(nearToInt(client.geometry.y, 0, tolerance)) {
        if(midPointX > rightMonitorX) { // top right
            return { x: rightMonitorX, y: 0, height: clientArea.height, width: clientArea.width };
        }
        else { // top left
            return { x: 0, y: 0, height: clientArea.height, width: clientArea.width };
        }
    }
    
    if(nearToInt(client.geometry.y, lowerMonitorY, tolerance)) {
        if(midPointX > rightMonitorX) { // bottom right
            return { x: rightMonitorX, y: lowerMonitorY, height: clientArea.height, width: clientArea.width };
        }
        else { // bottom left
            return { x: 0, y: lowerMonitorY, height: clientArea.height, width: clientArea.width };
        }
    }
    
    return false;
}

// get what edge we're stuck to
function getScreenEdge(client) {
    var clientArea = workspace.clientArea(workspace.MaximizeArea, client);
    var displayArea = { width: workspace.displayWidth, height: workspace.displayHeight };    
    var tolerance = workspace.screenEdgeTolerance;
    // Left Side
    if (nearToInt(client.x, clientArea.x, tolerance)) {
        // Left or Top Left
        if (nearToInt(client.y, clientArea.y, tolerance)) {
            // Maximized or Left
            if (nearToInt(client.height + workspace.gap, clientArea.height, tolerance)) {
                // Maximized
                if (nearToInt(client.width + workspace.gap, clientArea.width, tolerance)) {
                    return ScreenEdge.MAXIMIZED;
                }
                // Left
                return ScreenEdge.LEFT;
            }
            // Top Left
            return ScreenEdge.TOP_LEFT;                
        }

        // Bottom Left
        if (nearToInt(client.y + client.height, clientArea.height, tolerance) || 
                nearToInt(client.y + client.height, displayArea.height, tolerance)) {
            return ScreenEdge.BOTTOM_LEFT;
        }
    }

    // Right Side
    if (nearToInt(client.x + client.width, clientArea.width, tolerance) || nearToInt(client.x + client.width, displayArea.width, tolerance)) {
        // Right or Top Right
        if (nearToInt(client.y, clientArea.y, tolerance)) {
            // Right
            if (nearToInt(client.height + workspace.gap, clientArea.height, tolerance)) {
                return ScreenEdge.RIGHT;
            }
            // Top Right
            return ScreenEdge.TOP_RIGHT;
        }

        // Bottom Right
        if (nearToInt(client.y + client.height, clientArea.height, tolerance) || 
                nearToInt(client.y + client.height, displayArea.height, tolerance)) {
            return ScreenEdge.BOTTOM_RIGHT;
        }
    }

    return ScreenEdge.FLOATING;
}

function maximise(client) {
    if (clientIsExcluded(client)) return

    var max = isReadyToMaximise(client);
    if(!!max) {
        client.geometry = {
            x: max['x'],
            y: max['y'] + workspace.topMargin,
            width: max['width'],
            height: max['height']
        };
        maxAndGap(client, ScreenEdge.MAXIMIZED);
    }
}

function tileLeft() {
    var client = workspace.activeClient;
    if (clientIsExcluded(client)) return

    var edge = getScreenEdge(client);
    print("Screen edge is: " + edge)
    var monitor = getClientMonitor(client);

    if(edge != ScreenEdge.LEFT) {
        client.geometry = { x: monitor['x'], y: monitor['y'] + workspace.topMargin, width: monitor['width']/2, height: monitor['height'] };
        maxAndGap(client, ScreenEdge.LEFT);
        return
    }
    
    // wrap left
    print("Already left - checking for wrap. monitor x (" + client.geometry.x + ") > 0?")
    if(monitor['x'] > 0) {
        client.geometry = { x: client.geometry.x - monitor['width'], y: client.geometry.y, width: client.geometry.width, height: client.geometry.height };
        tileRight();
    }
}

function tileRight() {
    var client = workspace.activeClient;
    if (clientIsExcluded(client)) return

    var edge = getScreenEdge(client);
    print("Screen edge is: " + edge)
    var monitor = getClientMonitor(client);

    if(edge != ScreenEdge.RIGHT) {
        client.geometry = { x: monitor['x'] + (monitor['width']/2), y: monitor['y'] + workspace.topMargin, width: monitor['width']/2, height: monitor['height'] };
        maxAndGap(client, ScreenEdge.RIGHT);
        return
    }
    
    print("Already right - checking for wrap. mon x (" + monitor['x'] + ") + mon width (" + monitor['width'] + ") < dsiaplywidth (" + workspace.displayWidth + ")?")
    // wrap right
    if(monitor['x'] + monitor['width'] < workspace.displayWidth) {
        client.geometry = { x: client.geometry.x + monitor['width'], y: client.geometry.y, width: client.geometry.width, height: client.geometry.height };
        tileLeft();
    }
}

// returns {x y height width} of the monitor the client is on
function getClientMonitor(client) {
    var clientArea = workspace.clientArea(workspace.MaximizeArea, client);
    
    var lowerMonitorY = workspace.displayHeight - clientArea.height - workspace.topMargin;
    var rightMonitorX = workspace.displayWidth - clientArea.width;
    var midPointX = client.geometry.x + (client.geometry.width / 2);
    
    if(client.geometry.y < clientArea.height) {
        if(midPointX > rightMonitorX) { // top right
            return { x: rightMonitorX, y: 0, height: clientArea.height, width: clientArea.width };
        }
        else { // top left
            return { x: 0, y: 0, height: clientArea.height, width: clientArea.width };
        }
    }
    
    if(client.geometry.x < clientArea.width) {
        if(midPointX > rightMonitorX) { // bottom right
            return { x: rightMonitorX, y: lowerMonitorY, height: clientArea.height, width: clientArea.width };
        }
        else { // bottom left
            return { x: 0, y: lowerMonitorY, height: clientArea.height, width: clientArea.width };
        }
    }   
}

function clientIsExcluded(client) {
    var result = excludes.indexOf(client.caption) != -1;
    if (result) {
        print(client.caption + " is in our exclude list, skipping");        
    }
    return result;
}

function connectClients() {
    registerShortcut('kwin-lazy-gaps: Tile Left', 'kwin-lazy-gaps: Tile Left', 'Meta+Left', tileLeft);
    registerShortcut('kwin-lazy-gaps: Tile Right', 'kwin-lazy-gaps: Tile Right', 'Meta+Right', tileRight);

    var clients = workspace.clientList();
    for (var i = clients.length; i > 0; i--) {
        onClientAdded(clients[i]);
    }
    workspace.clientAdded.connect(onClientAdded);
    workspace.clientRemoved.connect(onClientRemoved);
    workspace.clientMaximizeSet.connect(onClientMaximize);
}

function onClientAdded(client) {
    if (typeof client === 'undefined') {
        return;
    }

    print("adding client " + client.caption);
    var edge = getScreenEdge(client);
    if(edge == ScreenEdge.MAXIMIZED) {
        maximise(client);
    }

    client.clientFinishUserMovedResized.connect(onClientMoved);
    client.clientStepUserMovedResized.connect(movingStepper);
}

function onClientRemoved(client) {
    if (typeof client === 'undefined') {
        return;
    }
    client.clientFinishUserMovedResized.disconnect(onClientMoved);
    client.clientStepUserMovedResized.disconnect(movingStepper);
    workspace.hideOutline();
}

function nearToInt(a, b, tolerance) {
    return (b >= a - tolerance) && (b <= a + tolerance);
}
