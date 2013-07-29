# principal

<a href="http://apostrophenow.org/"><img src="https://raw.github.com/punkave/principal/master/logos/logo-box-madefor.png" align="right" /></a>

`principal` provides async-friendly subclassing and options management for JavaScript. When it comes to object-oriented programming, JavaScript often feels like an assembly language in which a nice object-oriented language might one day be built. `principal` aims to address that feeling without the need for a preprocessor or new language keywords.

`principal` was created in an environment with a relatively small number of powerful objects that implement the "manager" pattern and a lot of cheap generic JavaScript objects that don't have methods of their own. So the performance benefits of using the JavaScript prototype chain was not a primary concern. Convenience and elegance were primary concerns.

## Installation

    npm install principal

## Usage

See below for a quick example of a base class and a subclass. This documentation is still incomplete.

Note that the constructor functions themselves are async, and so are all of the methods. Support for synchronous methods is coming but async will always be the default, as it is everywhere in the node APIs.

Options become part of the `self.options` property of each object for easy access.

Subclasses can choose to simply override an option, or to append or prepend additional values to an array option, a common requirement that is awkward without Principal.

Similarly, subclasses can choose to simply override a method, or to call a function before or after the original method (or do both).

Principal's syntax is inspired by MongoDB's query language: operators such as `$before` and `$after` (for extending methods) and `$append`, `$prepend` and `$alter` (for extending options) are prefixed with a `$`.

### Using $before

The function you supply for `$before` is called before the superclass version of the method in question. Your `$before` function will receive the arguments passed to the method, except that `_super`, a function which invokes the original method, is supplied where you would otherwise expect the final callback. The final callback is supplied as an additional argument, `_final`.

Normally you will call `_super` at the end of your `$before` function, and you will call it with its customary arguments it is expecting, plus `_final` (the original callback passed to the method).

However, you may choose to pass different values for the arguments, which is a common reason to write a `$before` function. *You may also choose to skip calling the original method at all* and just invoke `_final` yourself.

An example makes it much clearer:

    index: {
      $before: function(header, _super, _final) {
        // Modify an argument
        header += '-suffixed';
        // Call the original method
        return _super(header, _final);
      }
    }

### Using $after

The function you supply for `$after` is invoked after the original method. The original method is given a substitute for its usual callback in order to achieve this.

Your `$after` function receives:

* The parameters that were passed to the original method, if any;
* The parameters the original method passed to its callback (including the `error` parameter); and
* A callback you must invoke to complete the method.

So if the original method took the parameters `x` and `callback`, and invoked its callback with `err` and a result parameter, your `$after` function will receive:

    x, err, result, callback

### Base classes

Base classes (those that do not subclass another class) should specify `Object` as the second argument to `principal.subclass`.

### Subclasses

All other classes should specify the constructor of another class built for use with Principal, such as the `List` and `ReverseList` classes below.

### Constructor functions for Principal

Notice that each class constructor takes `options`, `methods` and `callback` parameters. `options` contains overrides of options that are useful when constructing an object of this type. This is used often when constructing an object in an application. `methods` contains overrides of the methods (functions) of the object. This is most often used by `principal.subclass` to pass in subclass overrides of methods, but can also be used directly.

Each constructor should begin its code by capturing `this` in a `self` variable to be passed to `principal.subclass`:

    var self = this;

All methods of the object are written inside the constructor function, allowing them to see the `self` variable and avoiding any problems with `this` being redefined in event handlers. All methods should refer to `self` rather than `this`.

### Arguments to principal.subclass

`principal.subclass` expects the following arguments:

`self`: the object just constructed

`base`: the constructor function for the superclass we are subclassing, or `Object` if this is a base class

`callerOptions` contains options passed to the constructor

`callerMethods` contains methods passed to the constructor (used when subclassing)

`myOptions` contains default values for options introduced by this class, and is usually an inline object (see the `List` and `ReverseList` objects). Note that `myOptions` can use `$append` and `$prepend` operators

`myMethods` contains methods for this class of object. `myMethods` may use `$before` and `$after` to extend methods rather than overriding them.

`callback` should be the callback passed to the constructor function.

    // Base class (subclasses Object)
    function List(options, methods, callback) {
      var self = this;
      principal.subclass(self, Object, options, methods, {
        sort: 'forward',
        paths: [ '/foo' ]
      }, {
        index: function(header, callback) {
          // Do not modify the original data
          var results = [].concat(self.options.data);
          results.sort(function(a, b) {
            if (self.options.sort === 'forward') {
              return a - b;
            } else if (self.options.sort === 'reverse') {
              return b - a;
            }
          });
          results.unshift(header);
          return callback(null, results);
        },
        name: function(callback) {
          return callback(null, 'List');
        }
      }, callback);
    }

    // Subclass (subclasses List)
    function ReverseList(options, methods, callback) {
      var self = this;
      principal.subclass(self, List, options, methods, {
        sort: 'reverse',
        paths: { $append: [ '/bar' ] }
      }, {
        index: {
          $before: function(header, _super, _final) {
            header += '-suffixed';
            return _super(header, _final);
          }
        },
        name: function(callback) {
          return callback(null, 'ReverseList');
        }
      }, callback);
    }

## About P'unk Avenue and Apostrophe

`principal` was created at [P'unk Avenue](http://punkave.com) for use in Apostrophe, an open-source content management system built on node.js. If you like `principal` you should definitely [check out apostrophenow.org](http://apostrophenow.org). Also be sure to visit us on [github](http://github.com/punkave).

## Support

Feel free to open issues on [github](http://github.com/punkave/principal).

<a href="http://punkave.com/"><img src="https://raw.github.com/punkave/principal/master/logos/logo-box-builtby.png" /></a>

