
var React = require('react');
var fs = require('fs');

var CurriculumPage = require('./curriculum.jsx');

var contentPath = ("participation/design_thinking_for_participation/en/design_thinking_group.md")

var ParticipationPage = React.createClass({
  render: function() {
    return <CurriculumPage
      title="Participation at Mozilla"
      contentPath={contentPath}
    />;
  }
});

module.exports = ParticipationPage;
