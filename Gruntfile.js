module.exports = function(grunt) {
    'use strict';

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        jshint: {
            lib: ['lib/**/*.js'],
            grunt: ['Gruntfile.js'],
            infusionsoft: ['infusionsoft/**/*.js']
        },

        // Output all stuff to the IS folder
        infusionsoft: {
            default: {
                dest: 'infusionsoft'
            }
        }

    });

    // plugins
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-infusionsoft');

    // tasks
    grunt.registerTask('lint', ['jshint']);
    grunt.registerTask('default', ['lint']);

};
