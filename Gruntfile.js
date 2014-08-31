/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    requirejs: {
      dist: {
        options: {
          logLevel: 1,

          wrap: {
            startFile: 'build/start.frag.js',
            endFile: 'build/end.frag.js'
          },
          almond: true,
          include: ['tiny-jsonrpc-postmessage'],
          baseUrl: 'lib',
          out: 'dist/tiny-jsonrpc-postmessage.js',

          paths: {
            'tiny-jsonrpc': '../node_modules/tiny-jsonrpc/lib/tiny-jsonrpc'
          },

          cjsTranslate: true,

          //generateSourceMaps: true,
          //preserveLicenseComments: false
          optimize: 'none'
        }
      }
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        unused: true,
        boss: true,
        eqnull: true,
        globals: {}
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      lib_test: {
        src: ['lib/**/*.js', 'test/**/*.js']
      }
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      lib_test: {
        files: '<%= jshint.lib_test.src %>',
        tasks: ['build']
      }
    },
    intern: {
      broker: {
        options: {
          runType: 'runner', // defaults to 'client'
          config: 'tests/intern'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-requirejs');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Load the Intern task
  //grunt.loadNpmTasks('intern');

  // Register a test task that uses Intern
  //grunt.registerTask('test', [ 'intern' ]);

  grunt.registerTask('build', [/*'jshint:lib_test',*/ 'requirejs:dist']);

  // By default we just test
  grunt.registerTask('default', [ 'build' ]);
};
