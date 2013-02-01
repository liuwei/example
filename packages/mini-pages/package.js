Package.describe({
  summary: "Simple client side page routing"
});

Package.on_use(function (api, where) {
  api.use(['underscore', 'templating', 'page-js'], 'client');
  api.add_files(['mini-pages.js', 'helpers.js'], 'client');
});
