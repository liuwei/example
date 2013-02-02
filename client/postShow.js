Template.postShow.rendered = function () {
//    var self = this;
//    self.node = self.find(".showplace");
//    container = self.node;
    container = document.createElement( 'div' );
    container.id = "postShow";
    document.body.appendChild( container );

    renderer = new THREE.WebGLRenderer( {
        antialias: true,
        preserveDrawingBuffer: true  // required to support .toDataURL()
    } );


//    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
    renderer.domElement.style.position = "relative";
    container.appendChild( renderer.domElement );

    loader = new THREE.SceneLoader();

    var geometry = Posts.findOne(Session.get("post"));

    var json1 = new Object();
    json1.urlBaseType = "relativeToHTML";
    json1.objects = {};
    json1.geometries = {};
    json1.materials = {};

    json1.objects[geometry.name] = {
        "geometry":geometry.name,
        "material" : "flamingo",
        "position":[ 0, 0, 0 ],
        "rotation":[ 0, 0, 0 ],
        "scale":[ geometry.scale, geometry.scale, geometry.scale ],
        "visible":true,
        "mirroredLoop":true,
        "properties":{
            "rotating":true,
            "rotateY":true
        }
    };
    json1.objects["light1"] = {
        "type":"DirectionalLight",
        "direction":[ 0, 1, 1 ],
        "color":16777215,
        "intensity":1
    };
    json1.objects["camera1"] = {
        "type":"PerspectiveCamera",
        "fov":70,
        "aspect":window.innerWidth / window.innerHeight,
        "near":1,
        "far":1100,
        "position":[ 0, 0, 100 ],
        "target":[ 0, 0, 0 ]
    };

    json1.geometries[geometry.name] = {
        "type":geometry.type,
        "url":geometry.url
    };

    json1.materials["flamingo"] = {
        "type": "MeshPhongMaterial",
        "parameters": {
            color: 0xffffff,
            specular: 0xffffff,
            shininess: 20,
            morphTargets: true,
            morphNormals: true,
            vertexColors: THREE.FaceColors,
            shading: THREE.SmoothShading
        }
    };

    json1.materials["flamingo1"] = {
        "type": "MeshLambertMaterial",
        "parameters": { color: 0xffffff, morphTargets: true, morphNormals: true, vertexColors: THREE.FaceColors, shading: THREE.FlatShading }};

    json1.defaults = {
        "bgcolor":[255, 255, 255],
        "bgalpha":0.5,
        "camera":"camera1"
    };

    loader.parse(json1, callbackFinished, geometry.url);

    window.addEventListener( 'resize', onWindowResize, false );
};

var fov = 70;

var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight;

var container;

var camera, cubeCamera, scene, loaded;
var renderer;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var rotatingObjects = [];
var morphAnimatedObjects = [];

var clock = new THREE.Clock();

function callbackFinished( result ) {
//    $( "message" ).style.display = "none";
//    $( "progressbar" ).style.display = "none";
//    var texture = THREE.ImageUtils.loadTexture('room.jpg', new THREE.UVMapping());

    camera = result.currentCamera;
//    camera.aspect = container.clientWidth/container.clientHeight;
    camera.updateProjectionMatrix();

    scene = result.scene;

    var opts = {};

    opts.callback = function(url) {
        var selectedObject = Session.get("post");
        Posts.update({"_id" : selectedObject._id}, {"$set" : {"picture" : url}});
    };
    opts.element = document.getElementById("postShow");

    THREEx.Screenshot.bindKey(renderer, opts);

    if( THREEx.FullScreen.available() ) {
        THREEx.FullScreen.bindKey(opts);
    }

    scene.traverse( function ( object ) {

        if (object.geometry) {

            morphColorsToFaceColors(object.geometry);
            object.geometry.computeMorphNormals();

            if (object.geometry.boundingSphere) {
                var radius = object.geometry.boundingSphere.radius;
                Posts.update({"name" : object.name}, {"$set" :{"scale" : 60/radius}});
            }
        }

        if ( object.properties.rotating === true ) {

            rotatingObjects.push( object );

        }

        if ( object instanceof THREE.MorphAnimMesh ) {

            morphAnimatedObjects.push( object );

        }

        if ( object instanceof THREE.SkinnedMesh ) {

            if ( object.geometry.animation ) {

                THREE.AnimationHandler.add( object.geometry.animation );

                var animation = new THREE.Animation( object, object.geometry.animation.name );
                animation.JITCompile = false;
                animation.interpolationType = THREE.AnimationHandler.LINEAR;

                animation.play();

            }

        }

    } );

    controls = new THREE.TrackballControls( camera, renderer.domElement );
    controls.target.set( 0, 0, 0 );

    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;

    controls.noZoom = false;
    controls.noPan = false;

    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.15;

    controls.keys = [ 65, 83, 68 ];

    mesh = new THREE.Mesh( new THREE.SphereGeometry( 500, 60, 40 ), new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture( '/room.jpg' ) } ) );
    mesh.scale.x = -1;
    mesh.name = "Room";
    scene.add( mesh );

    animate();
}


function morphColorsToFaceColors( geometry ) {

    if ( geometry.morphColors && geometry.morphColors.length ) {

        var colorMap = geometry.morphColors[ 0 ];

        for ( var i = 0; i < colorMap.colors.length; i ++ ) {

            geometry.faces[ i ].color = colorMap.colors[ i ];

        }

    }

}

function onWindowResize() {

//    camera.aspect = container.clientWidth/container.clientHeight;
//    camera.updateProjectionMatrix();
//
//    renderer.setSize( container.clientWidth, container.clientHeight);
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    controls.handleResize();

}

function animate() {

    requestAnimationFrame( animate );

    render();
}

function render() {

    var delta = clock.getDelta();

    controls.update();

    // update skinning

    THREE.AnimationHandler.update( delta * 1 );

    for ( var i = 0; i < rotatingObjects.length; i ++ ) {

        var object = rotatingObjects[ i ];

        if ( object.properties.rotateX ) object.rotation.x += 1 * delta;
        if ( object.properties.rotateY ) object.rotation.y += 0.5 * delta;

    }

    for ( var i = 0; i < morphAnimatedObjects.length; i ++ ) {

        var object = morphAnimatedObjects[ i ];

        object.updateAnimation( 1000 * delta );

    }

    renderer.render( scene, camera );
}


