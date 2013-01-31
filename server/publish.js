// Publish complete set of lists to all clients.
Meteor.publish('posts', function () {
  return Posts.find();
});

