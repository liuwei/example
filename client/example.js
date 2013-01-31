Meteor.subscribe("posts");

/* before callbacks */
function setPost (context) {
    var post = Posts.findOne( context.params._id );
    if (post) Session.set("post", post);
}

function newPost (context) {
    Session.set("post", {});
}

function authorize (context) {
    // fake some authorization here
    if (!Session.get("authorized")) {
        context.redirect(Meteor.loginPath());
    }
}

Meteor.pages({
    '/': { to: 'postIndex', as: 'root', nav: 'posts' },
    '/posts': { to: 'postIndex', nav: 'posts' },
    '/posts/new': { to: 'postForm', nav: 'posts', as: 'postNew', before: [newPost] },
    '/posts/:_id': { to: 'postShow', nav: 'posts', before: [setPost] },
    '/posts/:_id/edit': { to: 'postForm', nav: 'posts', as: 'postEdit', before: [setPost] },
    '/secret': { to: 'secret', nav: 'secret', before: authorize },
    '/login': 'login',
    '*': '404'
});

Handlebars.registerHelper("post", function (options) {
    return Session.get("post");
});

Handlebars.registerHelper("navClassFor", function (name, options) {
    return Session.equals("nav", name) ? "active" : "";
});

Template.postIndex.helpers({
    posts: function () {
      return Posts.find();
    }
});

Template.postIndex.events({
    'click #picker':function(){
        filepicker.pick(
            function(FPFile){
                var newModel = Posts.insert({
                    "name" : FPFile.filename,
                    "type": "ascii",
                    "scale": "",
                    "url" :  FPFile.url
                });
            }
        );
    }
});

Template.postShow.rendered = function () {
    var self = this;
    self.node = self.find(".showplace");
    container = self.node;

    renderer = new THREE.WebGLRenderer( {
        antialias: true,
        preserveDrawingBuffer: true  // required to support .toDataURL()
    } );

    renderer.domElement.style.position = "relative";
    renderer.setSize(container.clientWidth, container.clientHeight);
//    renderer.setClearColor( result.bgColor, result.bgAlpha );
    container.appendChild( renderer.domElement );

    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.physicallyBasedShading = true;


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
        "fov":50,
        "aspect":1.33333,
        "near":1,
        "far":1000,
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
        "bgalpha":1,
        "camera":"camera1"
    };

    loader.parse(json1, callbackFinished, geometry.url);

    window.addEventListener( 'resize', onWindowResize, false );
};

var container;

var camera, scene, loaded;
var renderer;

var rotatingObjects = [];
var morphAnimatedObjects = [];

var clock = new THREE.Clock();

function callbackFinished( result ) {
//    $( "message" ).style.display = "none";
//    $( "progressbar" ).style.display = "none";


    camera = result.currentCamera;
    camera.aspect = container.clientWidth/container.clientHeight;
    camera.updateProjectionMatrix();

    scene = result.scene;

    var opts = {};

    opts.callback = function(url) {
        var selectedObject = Session.get("post");
        Posts.update({"_id" : selectedObject}, {"$set" : {"picture" : url}});
//        var result = document.getElementById("read-img");
//        result.src = Geometries.findOne({"_id" : selectedObject}).picture;
    };

    THREEx.Screenshot.bindKey(renderer, opts);
    if( THREEx.FullScreen.available() ) {
        THREEx.FullScreen.bindKey();
//        document.getElementById('inlineDoc').innerHTML	+= "- <i>f</i> for fullscreen";
    }

    scene.traverse( function ( object ) {

        if (object.geometry) {

            morphColorsToFaceColors(object.geometry);
            object.geometry.computeMorphNormals();

            if (object.geometry.boundingSphere) {
                var radius = object.geometry.boundingSphere.radius;
                Posts.update({"name" : object.name}, {"$set" :{"scale" : 50/radius}});
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

    camera.aspect = container.clientWidth/container.clientHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( container.clientWidth, container.clientHeight);
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

