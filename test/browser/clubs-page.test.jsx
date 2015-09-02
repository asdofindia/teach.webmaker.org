var EventEmitter = require('events').EventEmitter;
var _ = require('underscore');
var should = require('should');
var sinon = window.sinon;
var React =require('react/addons');
var TestUtils = React.addons.TestUtils;

var StubTeachAPI = require('./stub-teach-api');
var StubRouter = require('./stub-router');
var stubContext = require('./stub-context.jsx');
var ClubsPage = require('../../pages/clubs.jsx');
var Util = require('../util.js');

var MODAL_ERROR_REGEX = /an error occurred/i;

function ensureFormFieldsDisabledValue(component, isDisabled) {
  var found = 0;

  ['input', 'textarea'].forEach(function(tag) {
    TestUtils.scryRenderedDOMComponentsWithTag(
      component,
      tag
    ).forEach(function(component) {
      found++;
      component.getDOMNode().disabled.should.equal(isDisabled);
    });
  });

  if (!found) {
    throw new Error("no form fields were found");
  }
}

describe("ClubsPage", function() {
  var clubsPage, teachAPI, xhr;

  beforeEach(function() {
    // The map widget on the clubs page will try to use XHR. We want to
    // fake that so that network issues don't cause this test to fail,
    // and so that PhantomJS doesn't hang on us.
    xhr = sinon.useFakeXMLHttpRequest();

    teachAPI = new StubTeachAPI();
    clubsPage = stubContext.render(ClubsPage, {}, {
      teachAPI: teachAPI
    });
  });

  afterEach(function() {
    stubContext.unmount(clubsPage);
    xhr.restore();
  });

  it('triggers clubs update when mounted', function() {
    teachAPI.updateClubs.callCount.should.equal(1);
  });

  it('doesn\'t show add modal if ?modal=add isn\'t in query', function() {
    clubsPage.context.showModal.callCount.should.equal(0);
  });

  it('shows add modal if ?modal=add is in query', function() {
    var clubsPage2 = stubContext.render(ClubsPage, {}, {
      router: new StubRouter({
        currentQuery: {'modal': 'add'}
      })
    });
    clubsPage2.context.showModal.callCount.should.equal(1);
    stubContext.unmount(clubsPage2);
  });
});

describe("ClubsPage.ClubLists", function() {
  var ClubLists = ClubsPage.ClubLists;
  var noop = function() {};
  var clubs = [{
    owner: 'foo',
    website: 'http://example.org',
    location: 'Somewhere, USA',
    status: 'approved',
    name: 'foo club'
  }, {
    owner: 'bar',
    website: 'http://example.org/bar',
    location: 'Somewhere Else, USA',
    status: 'pending',
    name: 'bar club'
  }];
  var renderLists = function(props) {
    props = _.extend({
      clubs: clubs,
      onDelete: noop,
      onEdit: noop,
      onZoomToLocation: noop
    }, props);
    return TestUtils.renderIntoDocument(<ClubLists {...props}/>);
  };

  it("doesn't show 'My Clubs' when logged out", function() {
    var lists = renderLists();
    lists.getDOMNode().textContent.should.not.match(/My Clubs/);
  });

  it("shows 'My Clubs' when logged-in user has clubs", function() {
    var lists = renderLists({username: 'foo'});
    lists.getDOMNode().textContent.should.match(/My Clubs/);
  });

  it("properly separates user's clubs from other clubs", function() {
    var lists = renderLists({username: 'foo'})
    lists.state.userClubs.should.eql([clubs[0]]);
    lists.state.otherClubs.should.eql([clubs[1]]);
  });

  it("doesn't show note about unapproved clubs if there aren't any", function() {
    var lists = renderLists({username: 'foo'});
    lists.getDOMNode().textContent.should.not.match(/Note:/);
    lists.state.userHasUnapprovedClubs.should.be.false;
  });

  it("shows note about unapproved clubs if there are any", function() {
    var lists = renderLists({username: 'bar'});
    lists.getDOMNode().textContent.should.match(/Note:/);
    lists.state.userHasUnapprovedClubs.should.be.true;
  });

  it("updates its state when its props change", function() {
    var lists = renderLists({clubs: []});
    lists.state.userHasUnapprovedClubs.should.be.false;
    lists.componentWillReceiveProps({ clubs: clubs, username: 'bar' });
    lists.state.userHasUnapprovedClubs.should.be.true;
  });
});

describe("ClubsPage.ClubList", function() {
  var ClubList = ClubsPage.ClubList;
  var Item = ClubList.Item;
  var noop = function() {};
  var clubs = [{
    url: 'http://api/clubs/1/',
    owner: 'foo',
    website: 'http://example.org',
    location: 'Somewhere, USA',
    status: 'approved',
    name: 'foo club'
  }];
  var renderList = function(props) {
    props = _.extend({
      clubs: clubs,
      onDelete: noop,
      onEdit: noop,
      onZoomToLocation: noop
    }, props);
    return TestUtils.renderIntoDocument(<ClubList {...props}/>);
  };

  it("shows 1 club, passes expected props to it", function() {
    var list = renderList({username: 'meh'});
    var items = TestUtils.scryRenderedComponentsWithType(list, Item);
    items.length.should.equal(1);
    items[0].props.onEdit.should.equal(noop);
    items[0].props.onDelete.should.equal(noop);
    items[0].props.onZoomToLocation.should.equal(noop);
    items[0].props.username.should.eql("meh");
    items[0].props.club.should.eql(clubs[0]);
  });

  describe("Item", function() {
    var renderItem = function(props) {
      props = _.extend({
        club: clubs[0],
        onDelete: noop,
        onEdit: noop,
        onZoomToLocation: noop
      }, props);
      return TestUtils.renderIntoDocument(<Item {...props}/>);
    };

    it("hides edit controls when unowned", function() {
      var item = renderItem({username: 'a'});
      var btns = TestUtils.scryRenderedDOMComponentsWithTag(item, 'button');
      btns.length.should.equal(0);
    });

    it("shows pending info when status is pending", function() {
      var item = renderItem({
        club: _.extend({}, clubs[0], { status: 'pending' })
      });
      item.getDOMNode().textContent.should.match(/pending/);
    });

    it("shows denied info when status is denied", function() {
      var item = renderItem({
        club: _.extend({}, clubs[0], { status: 'denied' })
      });
      item.getDOMNode().textContent.should.match(/denied/);
    });

    describe("buttons", function() {
      var item, onEdit, onDelete, onZoomToLocation, editBtn, deleteBtn;

      beforeEach(function() {
        onEdit = sinon.spy();
        onDelete = sinon.spy();
        onZoomToLocation = sinon.spy();
        item = renderItem({
          username: 'foo',
          onDelete: onDelete,
          onEdit: onEdit,
          onZoomToLocation: onZoomToLocation
        });
        var btns = TestUtils.scryRenderedDOMComponentsWithTag(item, 'button');
        btns.length.should.equal(2);

        editBtn = btns[0];
        deleteBtn = btns[1];
      });

      it("should call onEdit", function() {
        onEdit.callCount.should.eql(0);
        TestUtils.Simulate.click(editBtn);
        onEdit.callCount.should.eql(1);
        onEdit.getCall(0).args[0].should.eql('http://api/clubs/1/');
      });

      it("should call onDelete", function() {
        onDelete.callCount.should.eql(0);
        TestUtils.Simulate.click(deleteBtn);
        onDelete.callCount.should.eql(1);
        onDelete.getCall(0).args[0].should.eql('http://api/clubs/1/');
        onDelete.getCall(0).args[1].should.eql('foo club');
      });

      it("should call onZoomToLocation", function() {
        var loc = TestUtils.findRenderedDOMComponentWithClass(item, 'club-location');
        onZoomToLocation.callCount.should.eql(0);
        TestUtils.Simulate.click(loc);
        onZoomToLocation.callCount.should.eql(1);
        onZoomToLocation.getCall(0).args[0].should.equal(clubs[0]);
      });
    });
  });
});

describe("ClubsPage.normalizeClub", function() {
  var normalizeClub = ClubsPage.normalizeClub;

  it("prepends http:// to website if needed", function() {
    normalizeClub({website: 'foo'}).website.should.eql('http://foo');
  });

  it("doesn't change website if it is blank", function() {
    normalizeClub({website: ''}).website.should.eql('');
  });

  it("doesn't change website if it has http://", function() {
    normalizeClub({website: 'http://foo'}).website.should.eql('http://foo');
  });

  it("doesn't change website if it has https://", function() {
    normalizeClub({website: 'https://fo'}).website.should.eql('https://fo');
  });
});

describe("ClubsPage.validateClub", function() {
  var validateClub = ClubsPage.validateClub;

  function club(info) {
    return _.extend({
      name: 'blah',
      description: 'blah',
      location: 'blah'
    }, info);
  }

  it("reports no errors when club is valid", function() {
    validateClub(club()).should.eql([]);
  });

  it("fails when name is blank", function() {
    validateClub(club({name: ''})).should.eql([
      "You must provide a name for your club."
    ]);
  });

  it("fails when description is blank", function() {
    validateClub(club({description: ''})).should.eql([
      "You must provide a description for your club."
    ]);
  });

  it("fails when location is blank", function() {
    validateClub(club({location: ''})).should.eql([
      "You must provide a location for your club."
    ]);
  });

  it("fails when website is malformed", function() {
    validateClub(club({website: 'http://foo'})).should.eql([
      "Your club's website must be a valid URL."
    ]);
  });
});

describe("ClubsPage.ModalAddOrChangeYourClub", function() {
  var modal, teachAPI, onSuccess;

  beforeEach(function() {
    onSuccess = sinon.spy();
    modal = null;
  });

  afterEach(function() {
    if (modal) {
      stubContext.unmount(modal);
    }
  });

  describe("adding a club", function() {
    beforeEach(function() {
      modal = stubContext.render(ClubsPage.ModalAddOrChangeYourClub, {
        onSuccess: onSuccess
      });
      teachAPI = modal.getTeachAPI();
    });

    it("renders", function() {
      modal.getDOMNode().textContent.should.match(/add your club/i);
    });

    it("binds to username:change event", function() {
      EventEmitter.listenerCount(teachAPI, 'username:change').should.eql(1);
    });

    it("shows auth when user is not logged in", function() {
      teachAPI.emit('username:change', null);
      modal.state.step.should.equal(modal.STEP_AUTH);
    });

    it("shows form when user is logged in", function() {
      teachAPI.emit('username:change', 'foo');
      modal.state.step.should.equal(modal.STEP_FORM);
    });

    it("shows form validation errors", function() {
      teachAPI.emit('username:change', 'foo');
      modal.setState({validationErrors: ["U SUK"]});
      modal.getDOMNode().textContent.should.match(/U SUK/);
    });

    it("does not show any errors by default", function() {
      teachAPI.emit('username:change', 'foo');
      modal.getDOMNode().textContent.should.not.match(MODAL_ERROR_REGEX);
    });

    it("enables form inputs by default", function() {
      teachAPI.emit('username:change', 'foo');
      ensureFormFieldsDisabledValue(modal, false);
    });

    it("has valid labels for form elements", function() {
      teachAPI.emit('username:change', 'foo');

      Util.ensureLabelLinkage(modal, 'ModalAddOrChangeYourClub_name');
      Util.ensureLabelLinkage(modal, 'ModalAddOrChangeYourClub_website');
      Util.ensureLabelLinkage(modal, 'ModalAddOrChangeYourClub_description');
    });

    it("handles location changes containing JSON", function() {
      modal.handleLocationChange(JSON.stringify({
        location: 'foo',
        longitude: 35,
        latitude: 24
      }));
      modal.state.location.should.eql('foo');
      modal.state.longitude.should.equal(35);
      modal.state.latitude.should.equal(24);
    });

    it("handles location changes not containing JSON", function() {
      modal.handleLocationChange('');
      modal.state.location.should.eql('');
      should(modal.state.longitude).equal(null);
      should(modal.state.latitude).equal(null);
    });

    it("requires user to read fact sheet", function() {
      teachAPI.emit('username:change', 'foo');
      TestUtils.Simulate.submit(TestUtils.findRenderedDOMComponentWithTag(
        modal, 'form'
      ));
      modal.state.validationErrors
        .should.containEql('You must read the Mozilla Clubs Fact Sheet.');
    });

    it("reports validation errors, aborts form submission", function() {
      modal.state.validationErrors.should.eql([]);
      teachAPI.emit('username:change', 'foo');
      TestUtils.Simulate.submit(TestUtils.findRenderedDOMComponentWithTag(
        modal, 'form'
      ));
      modal.state.validationErrors.length.should.not.equal(0);
      teachAPI.addClub.callCount.should.equal(0);
    });

    describe("when form is submitted", function() {
      var addClubCall, form;

      beforeEach(function() {
        teachAPI.emit('username:change', 'foo');
        modal.setState({
          validationErrors: ['old error that should be removed'],
          name: 'blorpy',
          location: 'chicago',
          website: 'example.org',
          description: 'this is my club',
          hasReadFactSheet: true
        });
        form = TestUtils.findRenderedDOMComponentWithTag(
          modal,
          'form'
        );
        teachAPI.addClub.callCount.should.equal(0);
        TestUtils.Simulate.submit(form);
        teachAPI.addClub.callCount.should.equal(1);
        addClubCall = teachAPI.addClub.getCall(0);
      });

      it("removes old validation errors", function() {
        modal.state.validationErrors.should.eql([]);
      });

      it("sends data to server", function() {
        addClubCall.args[0].should.eql({
          name: 'blorpy',
          location: 'chicago',
          website: 'http://example.org',
          description: 'this is my club',
          latitude: null,
          longitude: null
        });
      });

      it("disables form fields while server is contacted", function() {
        modal.state.step.should.equal(modal.STEP_WAIT_FOR_NETWORK);
        ensureFormFieldsDisabledValue(modal, true);
      });

      it("shows success result", function() {
        addClubCall.args[1](null, {url: 'http://foo'});
        modal.state.step.should.equal(modal.STEP_SHOW_RESULT);
        modal.state.networkError.should.be.false;
        modal.state.result.should.eql({url: 'http://foo'});
        modal.getDOMNode().textContent
          .should.match(/thanks for your interest/i);
      });

      it("calls onSuccess when user clicks final button", function() {
        addClubCall.args[1](null, {url: 'http://foo'});
        var btn = TestUtils.findRenderedDOMComponentWithClass(
          modal,
          'btn'
        );
        onSuccess.callCount.should.eql(0);
        modal.context.hideModal.callCount.should.eql(0);
        TestUtils.Simulate.click(btn);
        modal.context.hideModal.callCount.should.eql(1);
        onSuccess.callCount.should.eql(1);
        onSuccess.getCall(0).args[0].should.eql({url: 'http://foo'});
      });

      it("returns to form, shows err when network err occurs", function() {
        addClubCall.args[1](new Error());
        modal.state.step.should.equal(modal.STEP_FORM);
        should(modal.state.result).equal(null);
        modal.getDOMNode().textContent.should.match(MODAL_ERROR_REGEX);
        ensureFormFieldsDisabledValue(modal, false);
      });

      it("removes error message when retrying form submission", function() {
        addClubCall.args[1](new Error());
        modal.state.networkError.should.be.true;
        TestUtils.Simulate.submit(form);
        modal.state.networkError.should.be.false;
        modal.getDOMNode().textContent.should.not.match(MODAL_ERROR_REGEX);
      });
    });
  });

  describe("changing a club", function() {
    var club = {
      url: 'http://example.org/api/clubs/1/',
      name: 'blah',
      description: 'my club',
      location: 'somewhere',
      website: 'http://boop.com',
      latitude: 42,
      longitude: 8
    };

    beforeEach(function() {
      modal = stubContext.render(ClubsPage.ModalAddOrChangeYourClub, {
        club: club,
        onSuccess: onSuccess
      });
      teachAPI = modal.getTeachAPI();
      teachAPI.emit('username:change', 'foo');
    });

    it("renders", function() {
      modal.getDOMNode().textContent.should.match(/change your club/i);
    });

    it("populates state with club values", function() {
      modal.state.name.should.eql("blah");
      modal.state.description.should.eql("my club");
      modal.state.location.should.eql("somewhere");
      modal.state.website.should.eql("http://boop.com");
    });

    describe("when form is submitted", function() {
      var changeClubCall, form;

      beforeEach(function() {
        modal.setState({
          name: 'changed blah',
        });
        form = TestUtils.findRenderedDOMComponentWithTag(
          modal,
          'form'
        );
        teachAPI.changeClub.callCount.should.equal(0);
        TestUtils.Simulate.submit(form);
        teachAPI.changeClub.callCount.should.equal(1);
        changeClubCall = teachAPI.changeClub.getCall(0);
      });

      it("sends data to server", function() {
        changeClubCall.args[0].should.eql({
          url: 'http://example.org/api/clubs/1/',
          name: 'changed blah',
          description: 'my club',
          location: 'somewhere',
          website: 'http://boop.com',
          latitude: 42,
          longitude: 8
        });
      });

      it("shows success result", function() {
        changeClubCall.args[1](null, club);
        modal.getDOMNode().textContent
          .should.match(/your club has been changed/i);
      });
    });
  });
});

describe("ClubsPage.ModalRemoveYourClub", function() {
  var modal, teachAPI;

  beforeEach(function() {
    modal = stubContext.render(ClubsPage.ModalRemoveYourClub, {
      name: 'my club',
      url: 'http://clubs/1/'
    });
    teachAPI = modal.getTeachAPI();
  });

  afterEach(function() {
    if (modal) {
      stubContext.unmount(modal);
    }
  });

  it("renders", function() {
    modal.getDOMNode().textContent.should.match(/remove your club/i);
  });

  it("does not show any errors by default", function() {
    modal.getDOMNode().textContent.should.not.match(MODAL_ERROR_REGEX);
  });

  describe("when confirm button is clicked", function() {
    var deleteClubCall, btn;

    beforeEach(function() {
      btn = TestUtils.findRenderedDOMComponentWithClass(
        modal,
        'btn'
      );
      btn.props.disabled.should.be.false;
      teachAPI.deleteClub.callCount.should.equal(0);
      TestUtils.Simulate.click(btn);
      teachAPI.deleteClub.callCount.should.equal(1);
      deleteClubCall = teachAPI.deleteClub.getCall(0);
    });

    it("sends data to server", function() {
      deleteClubCall.args[0].should.eql('http://clubs/1/');
    });

    it("disables confirm button while server is contacted", function() {
      modal.state.step.should.equal(modal.STEP_WAIT_FOR_NETWORK);
      btn.props.disabled.should.be.true;
    });

    it("shows success result", function() {
      deleteClubCall.args[1](null, {url: 'http://foo'});
      modal.state.step.should.equal(modal.STEP_SHOW_RESULT);
      modal.state.networkError.should.be.false;
      modal.getDOMNode().textContent
        .should.match(/your club has been removed/i);
    });

    it("returns to form, shows err when network err occurs", function() {
      deleteClubCall.args[1](new Error());
      modal.state.step.should.equal(modal.STEP_CONFIRM);
      modal.getDOMNode().textContent.should.match(MODAL_ERROR_REGEX);
      btn.props.disabled.should.be.false;
    });

    it("removes error message when retrying deletion", function() {
      deleteClubCall.args[1](new Error());
      modal.state.networkError.should.be.true;
      TestUtils.Simulate.click(btn);
      modal.state.networkError.should.be.false;
      modal.getDOMNode().textContent.should.not.match(MODAL_ERROR_REGEX);
    });
  });
});
