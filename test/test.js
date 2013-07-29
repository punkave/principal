var assert = require('assert');
var principal = require('../index.js');

describe('principal', function() {
  describe('add()', function() {
    it('Creates a chain in swapped order from two objects', function() {
      var result = principal.add({ color: 'blue' }, { color: 'red' });
      assert(Array.isArray(result));
      assert(result[0].color === 'red');
      assert(result[1].color === 'blue');
    });
    it('Prepends a new object to the chain', function() {
      var result = principal.add([{ color: 'yellow' }, { color: 'blue' }], { color: 'red' });
      assert(Array.isArray(result));
      assert(result[0].color === 'red');
      assert(result[1].color === 'yellow');
      assert(result[2].color === 'blue');
    });
  });
  describe('resolveOptions()', function() {
    it('returns the color property from the third object in the chain', function() {
      var self = {};
      principal.resolveOptions(self, [{ color: 'yellow' }, { color: 'blue' }, { color: 'red' }]);
      assert(self.options.color === 'red');
    });
    it('appends all items to a list when $append is used', function() {
      var self = {};
      principal.resolveOptions(self, [
        { colors: { $append: [ 'yellow' ] } },
        { colors: { $append: [ 'blue' ] } },
        { colors: { $append: [ 'red' ] }  }
      ]);
      assert(Array.isArray(self.options.colors));
      assert(self.options.colors.length === 3);
      assert(self.options.colors[0] === 'yellow');
      assert(self.options.colors[1] === 'blue');
      assert(self.options.colors[2] === 'red');
    });
    it('prepends all items to a list when $prepend is used', function() {
      var self = {};
      principal.resolveOptions(self, [
        { colors: { $prepend: [ 'yellow' ] } },
        { colors: { $prepend: [ 'blue' ] } },
        { colors: { $prepend: [ 'red' ] }  }
      ]);
      assert(Array.isArray(self.options.colors));
      assert(self.options.colors.length === 3);
      assert(self.options.colors[0] === 'red');
      assert(self.options.colors[1] === 'blue');
      assert(self.options.colors[2] === 'yellow');
    });
    it('invokes $alter function and respects its result', function() {
      var self = {};
      principal.resolveOptions(self, [
        { colors: { $append: [ 'yellow' ] } },
        { colors: { $append: [ 'red' ] }  },
        {
          colors: {
            $alter: function(colors) {
              colors.reverse();
              colors.push('purple');
              return colors;
            }
          }
        }
      ]);
      assert(Array.isArray(self.options.colors));
      assert(self.options.colors.length === 3);
      assert(self.options.colors[0] === 'red');
      assert(self.options.colors[1] === 'yellow');
      assert(self.options.colors[2] === 'purple');
    });
  });
  describe('resolveMethods()', function() {
    function one(callback) {
      return callback(null, 1);
    }
    function two(callback) {
      return callback(null, 2);
    }
    function three(callback) {
      return callback(null, 3);
    }
    it('respects method overrides in order', function(callback) {
      var self = {};
      principal.resolveMethods(self, [ { count: one }, { count: two }, { count: three }]);
      return self.count(function(err, value) {
        assert(!err);
        assert(value === 3);
        return callback();
      });
    });
    it('respects the $before operator', function(callback) {
      var self = {};
      function increment(x, callback) {
        return callback(null, x + 1);
      }
      principal.resolveMethods(self, [
        { increment: increment },
        {
          increment: {
            // Round down before incrementing
            $before: function(x, _super, _final) {
              return _super(Math.floor(x), _final);
            }
          }
        }
      ]);
      return self.increment(1.1, function(err, value) {
        assert(!err);
        // 1.1, rounded down, then incremented
        assert(value === 2.0);
        return callback();
      });
    });
    it('respects the $after operator', function(callback) {
      var self = {};
      function increment(x, callback) {
        return callback(null, x + 1);
      }
      principal.resolveMethods(self, [
        { increment: increment },
        {
          increment: {
            // Double after "incrementing"
            // We get the original arguments, then the results of _super
            // including the error, then the original callback
            $after: function(x, err, result, callback) {
              if (err) {
                return callback(err);
              }
              return callback(null, result * 2);
            }
          }
        }
      ]);
      return self.increment(1.1, function(err, value) {
        assert(!err);
        // 1.1, incremented, then doubled (yes it's a contrived example)
        assert(value === 4.2);
        return callback();
      });
    });
  });
  describe('subclass()', function() {
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
    describe('List', function() {
      var list;
      it('creates the List object without error', function(callback) {
        list = new List({ data: [ 5, 2, 7, 1, 9, 0 ]}, {}, function(err) {
          assert(!err);
          assert(list);
          return callback();
        });
      });
      it('executes the name method successfully', function(callback) {
        return list.name(function(err, name) {
          assert(!err);
          assert(name === 'List');
          return callback(null);
        });
      });
      it('executes the index method correctly', function(callback) {
        return list.index('prefix', function(err, result) {
          assert(!err);
          assert(Array.isArray(result));
          assert(result[0] === 'prefix');
          assert(result[1] === 0);
          assert(result[2] === 1);
          assert(result[3] === 2);
          assert(result[result.length - 1] === 9);
          return callback();
        });
      });
    });
    describe('ReverseList', function() {
      var reverseList;
      it('creates the ReverseList object without error', function(callback) {
        reverseList = new ReverseList({ data: [ 5, 2, 7, 1, 9, 0 ]}, {}, function(err) {
          assert(!err);
          assert(reverseList);
          return callback();
        });
      });
      it('respects simple overrides', function(callback) {
        return reverseList.name(function(err, name) {
          assert(!err);
          assert(name === 'ReverseList');
          return callback(null);
        });
      });
      it('respects option overrides and the $before operator', function(callback) {
        return reverseList.index('prefix', function(err, result) {
          assert(!err);
          assert(Array.isArray(result));
          assert(result[0] === 'prefix-suffixed');
          assert(result[1] === 9);
          assert(result[2] === 7);
          assert(result[3] === 5);
          assert(result[result.length - 1] === 0);
          return callback();
        });
      });
    });
  });
});

