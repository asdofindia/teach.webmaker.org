var React = require('react');
var marked = require('marked');
var HeroUnit = require('../components/hero-unit.jsx');

var CurriculumPage = React.createClass({
  render: function() {
    return (
      <div>
        <HeroUnit>
          <h1>{this.props.title}</h1>
        </HeroUnit>
        <h2>Participation Rocks.</h2>
         <div>
          {marked(this.props.markdown)}
         </div>
         {this.props.children}
      </div>
    );
  }
});

module.exports = CurriculumPage;
