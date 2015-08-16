
var React = require('react');
var marked = require('marked');

marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false
});


var CurriculumPage = require('./curriculum.jsx');

var ParticipationPage = React.createClass({
  statics: {
    pageTitle: 'Participation'
  },
  render: function() {
  var html = marked('I am using __markdown__.');
  console.log(html);
  var test = "testing one two";
    return <CurriculumPage
      title="Participation at Mozilla"
      markdown="'I am using __markdown__."
      test= {test}
    />;
  }
});

module.exports = ParticipationPage;


