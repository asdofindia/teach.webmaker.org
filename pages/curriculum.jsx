var React = require('react');
var marked = require('marked');
var HeroUnit = require('../components/hero-unit.jsx');
var fs = require('fs');
var request = require('superagent');

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

var CurriculumPage = React.createClass({
  getInitialState: function() {
    if (typeof fs.readFileSync != "undefined") {
      var content = fs.readFileSync("community_curriculum/" + this.props.contentPath, 'utf8');
      return {
        content: content
      }
    } else {
      return {
          content: 'Loading..'
      }
    }
  },
  componentDidMount: function() {
    var contentPath = this.props.contentPath;
    request.get("https://raw.githubusercontent.com/emmairwin/community_curriculum/master/" + contentPath).end(function(err, res) {
      this.setState({content: res.text});
  }.bind(this));
  },
  render: function() {
    return (
      <div>
        <HeroUnit>
          <h1>{this.props.title}</h1>
        </HeroUnit>
        <h2>Participation Rocks.</h2>
         <div dangerouslySetInnerHTML={{__html: marked(this.state.content)}} />
      </div>
    );
  }
});

module.exports = CurriculumPage;
