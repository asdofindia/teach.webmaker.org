var React = require('react');
var Router = require('react-router');
var Route = Router.Route;
var Redirect = Router.Redirect;
var Link = Router.Link;
var DefaultRoute = Router.DefaultRoute;

var ga = require('react-ga');
var Page = require('../components/page.jsx');

var urls = [];
var redirects = {};

// routes below are listed alphabetically by their path
var routes = (
  <Route handler={Page}>
    <Route name="about" path="/about/"
     handler={require('../pages/about.jsx')}/>
    <Route name="activities" path="/activities/"
     handler={require('../pages/activities.jsx')}/>
    <Route name="madewithcode-firstwebpage" path="/activities/madewithcode-firstwebpage/"
     handler={require('../pages/madewithcode-firstwebpage.jsx')}/>
    <Route name="madewithcode-meme" path="/activities/madewithcode-meme/"
     handler={require('../pages/madewithcode-meme.jsx')}/>
    <Route name="madewithcode-poster" path="/activities/madewithcode-poster/"
     handler={require('../pages/madewithcode-poster.jsx')}/>
    <Route name="maker-party-2015" path="/activities/maker-party-2015/"
     handler={require('../pages/maker-party-2015.jsx')}/>
    <Route name="private-eye" path="/activities/private-eye/"
     handler={require('../pages/private-eye.jsx')}/>
    <Route name="protect-your-data" path="/activities/protect-your-data/"
     handler={require('../pages/protect-your-data.jsx')}/>
    <Route name="web-lit-basics" path="/activities/web-lit-basics/"
     handler={require('../pages/web-lit-basics.jsx')}/>
    <Redirect from="/clubs/curriculum/" to="/activities/web-lit-basics/" />
    <Route name="mozilla-clubs" path="/clubs/"
     handler={require('../pages/clubs.jsx')}/>
    <Route name="clubs-toolkit" path="/clubs/toolkit/"
     handler={require('../pages/clubs-toolkit.jsx')}/>
    <Route name="events" path="/events/"
     handler={require('../pages/events.jsx')}/>
    <Route name="event-resources" path="/events/resources/"
     handler={require('../pages/event-resources.jsx')}/>
    <Route name="fixme" path="/fixme/"
     handler={require('../pages/fixme.jsx')}/>
    <Route name="healthcheck" path="/healthcheck/"
     handler={require('../pages/healthcheck.jsx')}/>
    <Route name="teach-like-mozilla" path="/teach-like-mozilla/"
     handler={require('../pages/teach-like-mozilla.jsx')}/>
    <Route name="tools" path="/tools/"
     handler={require('../pages/tools.jsx')}/>
    <Route name="web-literacy" path="/teach-like-mozilla/web-literacy/"
     handler={require('../pages/web-literacy.jsx')}/>
    <DefaultRoute name="home"
     handler={require('../pages/home.jsx')}/>
  </Route>
);

// TODO: come up with a better solution for nested route if we will ever have that.
React.Children.forEach(routes.props.children, function(item) {
  var path = item.props.path;

  if (!path && item.props.from) {
    path = item.props.from;
    redirects[path] = item.props.to;
  }

  urls.push(path || '/');
});

exports.URLS = urls;
exports.REDIRECTS = redirects;

exports.routes = routes;

exports.generateStaticRedirect = function(fromURL, toURL, cb) {
  var router = Router.create({
    routes: routes,
    location: fromURL
  });

  process.nextTick(function() {
    if (!router.match(toURL)) {
      return cb(new Error("Redirect 'to' route does not exist: " + toURL));
    }
    html = React.renderToStaticMarkup(
      <p>
        The URL of this page has changed to <a href={toURL}>{toURL}</a>.
      </p>
    );
    cb(null, html, {
      title: "Redirect to " + toURL
    });
  });
};

exports.generateStatic = function(url, cb) {
  if (url in redirects) {
    return exports.generateStaticRedirect(url, redirects[url], cb);
  }
  var router = Router.create({
    routes: routes,
    location: url
  });
  router.run(function(Handler) {
    var pageHandler, html, title;
    var err = null;
    try {
      html = React.renderToString(<Handler/>);
      pageHandler = Page.handlerForPage(router, url);
      title = Page.titleForHandler(pageHandler);
    } catch (e) {
      err = e;
    }
    cb(err, html, { title: title });
  });
};

exports.run = function(location, el) {
  Router.run(routes, location, function(Handler, state) {
    ga.pageview(state.pathname);
    React.render(<Handler/>, el);
  });
};
