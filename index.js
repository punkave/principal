var principal = module.exports = {
  add: function(callerOptions, myOptions) {
    if (!callerOptions) {
      callerOptions = {};
    }
    // TODO Array.isArray is not portable to all browsers
    if (Array.isArray(callerOptions)) {
      // "Why not just push onto callerOptions?" We don't want to modify it
      // from the POV of unrelated code.
      var options = callerOptions.slice();
      // We want our subclasses to win any conflicts, not us
      options.unshift(myOptions);
      return options;
    } else {
      // We want our subclasses to win any conflicts, not us
      return [ myOptions, callerOptions ];
    }
  },
  resolveOptions: function(self, optionsChain) {
    self.options = {};
    var merging;
    var name;
    var value;
    var subName;
    var subValue;
    var i;
    for (i in optionsChain) {
      merging = optionsChain[i];
      for (name in merging) {
        value = merging[name];
        var merged = false;
        if (typeof(value) === 'object') {
          for (subName in value) {
            subValue = value[subName];
            if (subName === '$append') {
              if (!Array.isArray(subValue)) {
                subValue = [ subValue ];
              }
              if (self.options[name]) {
                self.options[name] = self.options[name].concat(subValue);
              } else {
                self.options[name] = subValue;
              }
              merged = true;
              break;
            } else if (subName === '$prepend') {
              if (!Array.isArray(subValue)) {
                subValue = [ subValue ];
              }
              if (self.options[name]) {
                self.options[name] = subValue.concat(self.options[name]);
              } else {
                self.options[name] = subValue;
              }
              merged = true;
              break;
            } else if (subName === '$alter') {
              // Expects a custom function that modifies the options.
              // This function must return a value which becomes the new
              // value of the option. However the function also receives the
              // entire options object and the name of the field for more
              // advanced manipulations that touch multiple options.
              self.options[name] = subValue(self.options[name], self.options, name);
              merged = true;
              break;
            }
          }
        }
        if (merged) {
          continue;
        }
        self.options[name] = value;
      }
    }
  },
  resolveMethods: function(self, methodsChain) {
    var i;
    var merging;
    var name;
    var value;
    var subName;
    var subValue;
    var _super;
    for (i = 0; (i < methodsChain.length); i++) {
      merging = methodsChain[i];
      for (name in merging) {
        value = merging[name];
        var merged = false;
        if (typeof(value) === 'object') {
          for (subName in value) {
            subValue = value[subName];
            if (subName === '$before') {
              _super = self[name];
              if (_super) {
                wrapBefore(_super, name, subValue);
                merged = true;
              }
            } else if (subName === '$after') {
              _super = self[name];
              if (_super) {
                wrapAfter(_super, name, subValue);
                merged = true;
              }
            }
          }
        }
        if (merged) {
          continue;
        }
        self[name] = value;
      }
    }
    function wrapBefore(_super, name, before) {
      self[name] = function() {
        var args = Array.prototype.slice.call(arguments, 0);
        var beforeArgs = args.slice(0, args.length - 1);
        var callback = args[args.length - 1];
        // One of the perks of a `before` method is having a chance
        // to change the arguments to _super, so we leave it up to
        // the `before` method to invoke _super with the same or
        // different arguments
        beforeArgs.push(_super);
        beforeArgs.push(callback);
        return before.apply(self, beforeArgs);
      };
    }
    function wrapAfter(_super, name, after) {
      self[name] = function() {
        var args = Array.prototype.slice.call(arguments, 0);
        var superArgs = args.slice(0, args.length - 1);
        var callback = args[args.length - 1];
        superArgs.push(function(err) {
          // after function receives original parameters,
          // then all arguments passed to callback of _super,
          // then the final callback
          var afterArgs = args.slice(0, args.length - 1);
          afterArgs = afterArgs.concat(Array.prototype.slice.call(arguments, 0));
          afterArgs.push(callback);
          return after.apply(self, afterArgs);
        });
        return _super.apply(self, superArgs);
      };
    }
  },
  subclass: function(self, base, callerOptions, callerMethods, myOptions, myMethods, callback) {
    var optionsChain = principal.add(callerOptions, myOptions);
    var methodsChain = principal.add(callerMethods, myMethods);
    if (base === Object) {
      principal.resolveOptions(self, optionsChain);
      principal.resolveMethods(self, methodsChain);
      // Using setImmediate here guarantees we can assign the newly
      // constructed object to a variable before the callback is invoked
      setImmediate(function() { return callback(null); });
      return self;
    }
    return (base).call(self, optionsChain, methodsChain, callback);
  }
};

