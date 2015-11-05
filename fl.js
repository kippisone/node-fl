/* jshint esnext:true */
var fs = require('fs');
var path = require('path');

module.exports = (function() {
    'use strict';
    
    var fl = {
        copy: function(srcFile, destFile, cb) {
            if (typeof cb === 'function') {
                fs.readFile(srcFile, function(err, stream) {
                    fs.writeFile(destFile, stream, function() {
                        cb(null);
                    });
                });
            }
            else {
                var stream = fs.readFileSync(srcFile);
                var destDir = path.dirname(destFile);
                if (!fl.exists(destDir)) {
                    fl.mkdir(destDir);
                }
                fs.writeFileSync(destFile, stream);
                return true;
            }
        },

        exists: function(file, cb) {
            if (typeof cb === 'function') {
                fs.exists(file, cb);
            }
            else {
                return fs.existsSync(file);
            }
        },

        mkdir: function(dir, cb) {
            dir = dir.split('/');
            var curDir = '/';

            if (typeof cb === 'function') {
                var mkdir = function() {
                    curDir = dir.shift();
                    if (!curDir) {
                        cb(null);
                        return;
                    }

                    fl.exists(curDir, function(err, status) {
                        if (status) {
                            mkdir();
                        }
                        else {
                            fs.mkdir(dir, 0o755, function(err) {
                                mkdir();
                            });
                        }
                    });                    

                };

                mkdir();
            }
            else {
                while (true) {
                    if (dir.length === 0) {
                        return;
                    }

                    curDir = path.join(curDir, dir.shift());
                    console.log('curDir', curDir);
                    if (fl.exists(curDir)) {
                        continue;
                    }

                    fs.mkdirSync(curDir, 0o755);
                }
            }
        },

        read: function(file, cb) {
            if (typeof cb === 'function') {
                fs.readFile(file, { encoding: 'utf8' }, cb);
            }
            else {
                return fs.readFileSync(file, { encoding: 'utf8' });
            }
        },

        write: function(file, content, cb) {
            var destDir = path.dirname(file);
            if (typeof cb === 'function') {
                fl.exists(destDir, function(err, status) {
                    if (status) {
                        fs.writeFile(file, content, cb);
                        return;
                    }

                    fl.mkdir(destDir, function() {
                        fs.writeFile(file, content, cb);
                        return;   
                    });
                });
            }
            else {
                if (!fl.exists(destDir)) {
                    fl.mkdir(destDir);
                }
                
                return fs.writeFileSync(file, content);
            }
        },

        append: function(file, content, cb) {
            var destDir = path.dirname(file);
            if (typeof cb === 'function') {
                fl.exists(destDir, function(err, status) {
                    if (status) {
                        fs.appendFile(file, content, cb);
                        return;
                    }

                    fl.mkdir(destDir, function() {
                        fs.appendFile(file, content, cb);
                        return;   
                    });
                });
            }
            else {
                if (!fl.exists(destDir)) {
                    fl.mkdir(destDir);
                }
                
                return fs.appendFileSync(file, content);
            }
        },

        replace: function (file, contents, cb) {
            var replace = function(source) {
                for (var key in contents) {
                    if (contents.hasOwnProperty(key)) {
                        var value = contents[key];
                        source = source.replace(new RegExp(key, 'g'), value);                        
                    }
                }

                return source;
            };

            if (typeof cb === 'function') {
                fl.read(file, function(err, source) {
                    source = replace(source);
                    fl.write(file, source, cb);
                });
            }
            else {
                var source = fl.read(file);
                source = replace(source);
                return fl.write(file, source);
            }
        }
    };

    return fl;
})();