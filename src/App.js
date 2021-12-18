// import logo from './logo.svg';
import "./App.css";
import { Loader } from "@googlemaps/js-api-loader";

const loader = new Loader({
    apiKey: "",
    version: "weekly",
    libraries: ["places"],
});

const mapOptions = {
    center: {
        lat: 0,
        lng: 0,
    },
    zoom: 4,
};

var google;
var map;
var infoWindow;
var SRTMmap;
var tiles = {}

/**
 * Note that by dividing the pixel coordinates by the tile size and taking the integer parts of the result, you produce as a by-product the tile coordinate at the current zoom level.
 */
function calculateTileCoordinateFromPixelCoordinate(pixelCoordinate, tileSize) {
    let y = Math.trunc(pixelCoordinate.y / tileSize);
    let x = Math.trunc(pixelCoordinate.x / tileSize);

    return {
        x: x,
        y: y,
    };
}

function calculateInternalTilePixelCoordinate(latLng, tileSize, zoom) {
    var worldCoordinate = project(latLng, tileSize);
    var pixelCoordinate = calculatePixelCoordinateFromWorldCoordinate(worldCoordinate, zoom);

    let x = pixelCoordinate.x % tileSize;
    let y = pixelCoordinate.y % tileSize;

    return {
        x: x,
        y: y
    }
}

function calculatePixelCoordinateFromWorldCoordinate(worldCoordinate, zoomLevel) {
    let zoomFactor = Math.pow(2, zoomLevel)

    return {
        x: worldCoordinate.x * zoomFactor,
        y: worldCoordinate.y * zoomFactor
    }        
}

// function calculateWorldCoordinateFromPixelCoordinate(pixelCoordinate, zoomLevel) {
//     let zoomFactor = Math.pow(2, zoomLevel)
//     return pixelCoordinate / zoomFactor;
// }

function calculateTileCoordinateFromWorldCoordinate(worldCoordinate, zoomLevel, tileSize) {
    let pixelCoordinate = calculatePixelCoordinateFromWorldCoordinate(worldCoordinate, zoomLevel);
    console.log("pixel coordinate calculated", pixelCoordinate)
    return calculateTileCoordinateFromPixelCoordinate(pixelCoordinate, tileSize);
}

function calculateTileCoordinateFromLatLng(latLng, zoomLevel, tileSize) {
    var worldCoordinate = project(latLng, tileSize);
    console.log("got world coordinates", worldCoordinate)
    return calculateTileCoordinateFromWorldCoordinate(worldCoordinate, zoomLevel, tileSize);

}


function project(latLng, tileSize) {
    let siny = Math.sin((latLng.lat() * Math.PI) / 180);

    // Truncating to 0.9999 effectively limits latitude to 89.189. This is
    // about a third of a tile past the edge of the world tile.
    siny = Math.min(Math.max(siny, -0.9999), 0.9999);
    return {
      x: tileSize * (0.5 + latLng.lng() / 360),
      y: tileSize * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
    };
}

// function loadData() {
//     var bounds = map.getBounds()
//     console.log("bounds", bounds)
//     var boundsNeLatLng = bounds.getNorthEast()
//     var boundsSwLatLng = bounds.getSouthWest()

//     // TODO: convert to using google map objects in future
//     // var boundsNwLatLng = new google.maps.LatLng(
//     //         boundsNeLatLng.lat(),
//     //         boundsSwLatLng.lng()
//     //     )
//     // var boundsSeLatLng = new google.maps.LatLng(
//     //         boundsSwLatLng.lat(),
//     //         boundsNeLatLng.lng()
//     //     )

//     var boundsNwLatLng = {
//         x
//     }

//     var zoomLevel = map.getZoom()

//     var tileSize = 256;

//     var tileCoordinateNw = calculateTileCoordinateFromWorldCoordinate(boundsNwLatLng, zoomLevel, tileSize);
//     var tileCoordinateSe = calculateTileCoordinateFromWorldCoordinate(boundsSeLatLng, zoomLevel, tileSize);

//     var tiles = []

//     var tileColumns = tileCoordinateSe.x - tileCoordinateNw.x + 1
//     var tileRows = tileCoordinateSe.y - tileCoordinateNw.y + 1
//     var minX = tileCoordinateNw.x
//     var minY = tileCoordinateNw.y

//     while (tileRows--) {
//         while (tileColumns--) {
//             tiles.push({
//                 x: minX + tileColumns,
//                 y: minY,
//             });
//         }

//         minY++;
//         tileColumns = tileCoordinateSe.x - tileCoordinateNw.x + 1;
//     }

//     var boundingBoxes = []
//     var projection = map.getProjection()
//     var zoomFactor = Math.pow(2, zoomLevel)

//     tiles.forEach((tile) => {
//         boundingBoxes.push({
//             ne: projection.fromPointToLatLng(new google.maps.Point(tile.x * 256 / zoomFactor, tile.y * 256 / zoomFactor)),
//             sw: projection.fromPointToLatLng(new google.maps.Point((tile.x + 1) * 256 / zoomFactor, (tile.y + 1) * 256 / zoomFactor))
//         });
//     })

//     console.log("visible tiles", tiles)
//     console.log("bounding boxes of tiles", boundingBoxes)
// }

function App() {
    // Promise
    loader
        .load()
        .then((loadedGoogle) => {
            console.log("google has loaded")
            google = loadedGoogle;
            map = new loadedGoogle.maps.Map(
                document.getElementById("map"),
                mapOptions
            );
            createOverlayMap();
            createClickListener();
        })
        .catch((e) => {
            // do something
        });

    let createOverlayMap = () => {
        console.log("google is", google)
        console.log("map is", map)
        let url = "";

        SRTMmap = new google.maps.ImageMapType({
            getTileUrl: function (coord, zoom) {
               
                let tileUrl = url
                    .replace("{x}", coord.x)
                    .replace("{y}", coord.y)
                    .replace("{z}", zoom);
            
                    console.log(
                        `getting map url ${tileUrl}`
                    );
                function loadImage() {
                    let img = new Image();
                    img.src = tileUrl;
                    tiles[`${coord.x}${coord.y}${zoom}`] = img
                }
                loadImage()
                return tileUrl;
            },
            tileSize: new google.maps.Size(256, 256),
            maxZoom: 20,
            minZoom: 0
        });

        SRTMmap.addListener("tilesloaded", function () {
            // loadData();
        });

        map.overlayMapTypes.push(SRTMmap);
    };

    let createClickListener = () => {
        map.addListener("click", (mapsMouseEvent) => {
            var tileCoordinate = calculateTileCoordinateFromLatLng(mapsMouseEvent.latLng, map.getZoom(), 256)
            var internalPixelCoordinate = calculateInternalTilePixelCoordinate(mapsMouseEvent.latLng, 256, map.getZoom());

            var content = `
Lat: ${mapsMouseEvent.latLng.lat()}, Lng: ${mapsMouseEvent.latLng.lng()}
Tile coordinates: ${tileCoordinate.x}, ${tileCoordinate.y}
Internal tile pixel coordinates: ${internalPixelCoordinate.x}, ${internalPixelCoordinate.y}
`

            console.log(content)            

            let currentZoom = map.getZoom()
            let tile = tiles[`${tileCoordinate.x}${tileCoordinate.y}${currentZoom}`]

            // https://stackoverflow.com/questions/8751020/how-to-check-if-a-specific-pixel-of-an-image-is-transparent
            // example of using 1 x 1 pixel canvas for this too

            let canvas = document.createElement('canvas')
            canvas.width = tile.width;
            canvas.height = tile.height;
            canvas.getContext('2d').drawImage(tile, 0, 0, tile.width, tile.height);

            // do I need to flip the x and y as it starts from top left in the tile x,y
            // causes cors error due on getImageData call
            let pixelValue = canvas.getContext('2d').getImageData(internalPixelCoordinate.x, internalPixelCoordinate.y, 1, 1).data;
            console.log("got pixel value", pixelValue)

            // current doesn't work but would get pixel value then we could fit between min and maxes across bands
            // then we would be able to say this pixel value

            console.log("map mouse event", mapsMouseEvent)
            if(infoWindow) infoWindow.close()
            
            infoWindow = new google.maps.InfoWindow({
                position: mapsMouseEvent.latLng,
                content: content
            });

            infoWindow.open(map);
        })
    }

    return (
        <div className="App">
            <header className="App-header">
                {/* <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a> */}
                <div id="map" style={{ position: "absolute", height: "100%", width: "100%" }}></div>
            </header>
        </div>
    );
}

export default App;
