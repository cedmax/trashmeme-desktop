'use strict';

var express = require( 'express' );
var mapData = require('./modules/map-data');

var hotload = require( 'hotload' );
var React = require( 'react' );
var ReactDOMServer = require( 'react-dom/server' );
var getYouTubeID = require( 'get-youtube-id' );

//express configuration
var app = express();
app.enable( 'trust proxy' );
app.set( 'view engine', 'html' );
app.set( 'views', __dirname + '/views' );
app.enable( 'view cache' );
app.engine( 'html', require( 'hogan-express' ));
app.use( express.static( __dirname + '/assets' ));
//data handling
var settings = require( './settings.json' );
var data = mapData('./data', {
  about: './about.md'
});

//jspm dependencies loading
var jspm = require( 'jspm' );
jspm.setPackagePath( './' );
jspm.import( 'js/app' ).then( function( App ) {
  App = React.createFactory( App.default );

  function render( req, res, section, selected ) {
    var title = (data[section] || data.categories[section]).title;
    var video = (data[section] || data.categories[section]).videos;

    if ( selected && ! video[ selected ] ) {
      res.redirect( `/${section}` );
    } else {
      const domain = req.protocol + '://' + req.get( 'host' );
      let sectionUrl = section;
      if (data[section] && data[section].videos[selected]){
        sectionUrl = data[section].videos[selected].category;
      }
      const url = `${domain}/${sectionUrl}` + ( selected ? `/${selected}` : '' );


      Object.assign( res.locals, {
        title,
        section,
        domain,
        url,
        json: JSON.stringify( data ),
        videoId: getYouTubeID( video[ selected ] && video[ selected ].url ),
        dev: ( settings.env === 'dev' ),
        DOM: ReactDOMServer.renderToString( App( {
          data,
          section,
          selected,
          format: req.params.format,
          onCopyReady: function() {}
        } ))
      } );

      res.render( 'index' );
    }
  }

  app.get( '/refresh/:key', function( req, res ) {
    var key = req.params.key;
    if ( key ) {
      data.categories[ key ] = hotload( `./data/${key}.json` );
      res.redirect( `/${key}` );
    } else {
      res.redirect( '/' );
    }
  } );

  app.get( '/', function( req, res ) {
    global.navigator = { userAgent: req.headers[ 'user-agent' ] };
    var domain = req.protocol + '://' + req.get( 'host' );

    Object.assign( res.locals, {
      domain,
      url: domain + '/',
      title: 'Trash Meme',
      json: JSON.stringify( data ),
      dev: ( settings.env === 'dev' ),
      DOM: ReactDOMServer.renderToString( App( {
        data
      } ))
    } );

    res.render( 'index' );
  } );

  app.get( '/:section/:resource?/:format?', function( req, res ) {
    global.navigator = { userAgent: req.headers[ 'user-agent' ] };

    var resource = req.params.resource;
    var section = req.params.section;

    if ( data[section] || data.categories[ section ] ) {
      render( req, res, section, resource );
    } else {
      res.redirect( '/' );
    }
  } );

  app.listen( settings.port );
} );
