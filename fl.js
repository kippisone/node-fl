/* jshint esnext:true */
var fs = require('fs');
var path = require('path');

module.exports = (function() {
    'use strict';
    
    var fl = {
        debug: false,
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

        symlink: function(srcFile, destFile, cb) {
            var destDir = path.dirname(destFile);
            if (fl.debug) {
                console.log('[fl] Symlink %s -> %s in dir %s', srcFile, destFile, destDir);
            }

            if (typeof cb === 'function') {
                fs.readFile(srcFile, function(err, stream) {
                    fs.writeFile(destFile, stream, function() {
                        cb(null);
                    });
                });
            }
            else {
                if (!fl.exists(destDir)) {
                    fl.mkdir(destDir);
                }

                if (fl.exists(srcFile)) {
                    fs.symlinkSync(srcFile, destFile);
                    return true;
                }
                else {
                    return false;
                }
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
            if (fl.debug) {
                console.log('[fl] Create dir %s', dir);
            }

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
                    if (fl.exists(curDir)) {
                        continue;
                    }

                    fs.mkdirSync(curDir, 0o755);
                }
            }
        },

        traverse: function(dir, fn, callback) {

        },

        rmdir: function(dir, callback) {
            if (fl.debug) {
                console.log('[fl] Remove dir %s', dir);
            }

            var rmdirSync = function(dir) {
                var files = fs.readdirSync(dir);
                files.forEach(function(file) {
                    var filepath = path.join(dir, file);
                    var stat = fs.lstatSync(filepath);
                    if (stat.isSymbolicLink()) {
                        fs.unlinkSync(filepath);
                    } else if (stat.isDirectory()) {
                        rmdirSync(filepath);
                        fs.rmdirSync(filepath);
                    }
                    else {
                        fs.unlinkSync(filepath);
                    }
                });
            };

            if (typeof cb === 'function') {
                if (fl.exists(dir)) {
                    rmdirSync(dir);
                    return callback(null, true);
                }
                else {
                    return callback(null, false);
                }

            }
            else {
                if (fl.exists(dir)) {
                    rmdirSync(dir);
                    return true;
                }
                else {
                    return false;
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

        readJSON: function(file, cb) {
            if (typeof cb === 'function') {
                fs.readFile(file, { encoding: 'utf8' }, function(source) {
                    if (err) {
                        cb(err);
                    }
                });
            }
            else {
                var source = fs.readFileSync(file, { encoding: 'utf8' });
                return JSON.parse(source);
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

    /**
     * Scans a directory and returns all dirs and files.
     * Calls a callback function and passes an array of all items
     *
     * item: {
     *     name: /absolute/filename.txt
     *     relative: relative/path/from/start/dir.txt
     *     isDir: false
     * }
     *
     * Options:
     *
     * Name | Default | Description
     * -----------------------------
     * skipDirs | false | Skip all dirs
     * skipFiles | false | Skip all files
     * ignore |  | Array of files and dirs to be ignored
     *     
     * @param  {[type]}   dir      [description]
     * @param  {[type]}   opts     [description]
     * @param  {Function} callback [description]
     */
    fl.scanDir = function(dir, match, opts, callback) {
        var result = [];

        var self = this;

        if (typeof match === 'function') {
            callback = match;
            opts = {};
            match = null;
        }
        else if (typeof match === 'object' && match !== null && !match.hasOwnProperty('inc')) {
            callback = opts;
            opts = match;
            match = null;
        } else if (typeof opts === 'function') {
            callback = opts;
            opts = {};
        }

        opts = opts || {};
        var startDir = opts.rootDir || dir;
        opts.rootDir = startDir;

        if (match && typeof match === 'string') {
            match = this.getFileReg(match);
        }

        opts.skipDirs = opts.skipDirs || false;
        opts.skipFiles = opts.skipFiles || false;

        if (opts.ignore && opts.ignore instanceof RegExp) {
            opts.ignore = {
                inc: opts.ignore
            };
        }
        else if (opts.ignore && typeof opts.ignore !== 'object') {
            opts.ignore = fl.getFileReg(opts.ignore);
        }

        fs.readdir(dir, function(err, files) {
            if (err) {
                return callback(err);
            }

            var next = function() {
                var filename = files.shift();
                if (!filename) {
                    return callback(null, result);
                }

                var file = path.join(dir, filename);

                if (opts.ignore && self.matchFile(opts.ignore, file)) {
                    return next();
                }
                
                fs.lstat(file, function(err, stat) {
                    if (err) {
                        return callback(err);
                    }

                    if (stat.isDirectory() || stat.isSymbolicLink()) {
                        return self.scanDir(file, match, opts, function(err, files) {
                            if (!opts.skipDirs && (!match || fl.matchFile(match, file))) {
                                result.push({
                                    name: file,
                                    relative: path.relative(startDir, file),
                                    root: startDir,
                                    path: file,
                                    isDir: true
                                });
                            }
                            result = result.concat(files);
                            next();
                        });
                    }
                    else if (stat.isFile() && !opts.skipFiles) {

                        if (match && !fl.matchFile(match, file)) {
                            //File does not mactch
                            return next();
                        }

                        result.push({
                            name: file,
                            relative: path.relative(startDir, file),
                            root: startDir,
                            path: file,
                            isDir: false
                        });
                    }
                    next();
                });
            };

            next();
        });
    };



    fl.getFileReg = function(pattern) {
        var reg = {
            inc: [],
            exc: []
        };

        if (typeof pattern === 'object' && !Array.isArray(pattern)) {
            return pattern;
        }

        if (typeof pattern === 'string') {
            pattern = [pattern];
        }

        if (Array.isArray(pattern)) {
            var patStart = '((^|\/)',
                patEnd = '($))';

            pattern.forEach(function(pat) {
                var dest = reg.inc;
                if (pat.charAt(0) === '!') {
                    dest = reg.exc;
                    pat = pat.substr(1);
                }

                pat = pat.replace(/\//g, '\\/');
                pat = pat.replace(/\./g, '\\.');
                pat = pat.replace(/\*\*/g, '.+');
                pat = pat.replace(/\*/g, '[^\/]+');
                dest.push(patStart + pat + patEnd);
            });

            reg.inc = reg.inc.length ? new RegExp(reg.inc.join('|')) : null;
            reg.exc = reg.exc.length ? new RegExp(reg.exc.join('|')) : null;

            if (!reg.inc) {
                reg.inc = /^./; //Include all
            }
        }

        return reg;
    };

    /**
     * Matches a single file against a FileMatch
     * @param  {Any} reg   FileMatch pattern
     * @param  {String} file Filename
     * @return {Boolean}       Returns true if file matchs
     */
    fl.matchFile = function(reg, file) {
        reg = this.getFileReg(reg);
        return reg.exc ? reg.inc.test(file) && !reg.exc.test(file) : reg.inc.test(file);
    };

    /**
     * Matches files against a FileMatch and returns a filtered array
     * @param  {Any} reg   File reg as string, array or as a FileMatch object
     * @param  {Array} files Files array to be filtered
     * @return {Array}       Returns a filtered array of matching files
     */
    fl.matchFiles = function(reg, files) {
        reg = this.getFileReg(reg);

        return files.filter(function(file) {
            return reg.exc ? reg.inc.test(file) && !reg.exc.test(file) : reg.inc.test(file);
        });
    };

    fl.watch = function(dir, match, fn) {
        if (typeof match === 'function') {
            fn = match;
            match = null;
        }

        fl.scanDir(dir, match, function(err, files) {
            var watchTimeout;
            
            files.forEach(function(file) {
                if (file.isDir) {
                    fs.watch(file.name, function(event, filename) {
                        if (watchTimeout) {
                            return;
                        }

                        //Watch fires twice a time. This should fix that behavior
                        watchTimeout = true;
                        setTimeout(function() {
                            watchTimeout = false;
                        }, 500);

                        fn(event, path.join(file.name, filename));
                    });
                }
            });
        });
    };

    return fl;
})();