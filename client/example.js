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
    '/posts/new': { to: 'postShow', nav: 'posts', as: 'postNew', before: [newPost] },
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

