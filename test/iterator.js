var tape = require('tape')
var create = require('./helpers/create')
var put = require('./helpers/put')
var run = require('./helpers/run')

tape('basic iteration', function (t) {
  var db = create.one()
  var vals = ['a', 'b', 'c']
  var expected = toMap(vals)

  put(db, vals, function (err) {
    t.error(err, 'no error')
    all(db.iterator(), function (err, map) {
      t.error(err, 'no error')
      t.same(map, expected, 'iterated all values')
      t.end()
    })
  })
})

tape('iterate a big db', function (t) {
  var db = create.one()

  var vals = range(4000, '#')
  var expected = toMap(vals)

  put(db, vals, function (err) {
    t.error(err, 'no error')
    all(db.iterator(), function (err, map) {
      t.error(err, 'no error')
      t.same(map, expected, 'iterated all values')
      t.end()
    })
  })
})

tape('prefix basic iteration', function (t) {
  var db = create.one()
  var vals = ['foo/a', 'foo/b', 'foo/c']
  var expected = toMap(vals)

  vals = vals.concat(['a', 'b', 'c'])

  put(db, vals, function (err) {
    t.error(err, 'no error')
    all(db.iterator('foo'), function (err, map) {
      t.error(err, 'no error')
      t.same(map, expected, 'iterated all values')
      t.end()
    })
  })
})

tape('empty prefix iteration', function (t) {
  var db = create.one()
  var vals = ['foo/a', 'foo/b', 'foo/c']
  var expected = {}

  put(db, vals, function (err) {
    t.error(err, 'no error')
    all(db.iterator('bar'), function (err, map) {
      t.error(err, 'no error')
      t.same(map, expected, 'iterated all values')
      t.end()
    })
  })
})

tape('prefix iterate a big db', function (t) {
  var db = create.one()

  var vals = range(4000, 'foo/#')
  var expected = toMap(vals)

  vals = vals.concat(range(4000, '#'))

  put(db, vals, function (err) {
    t.error(err, 'no error')
    all(db.iterator('foo'), function (err, map) {
      t.error(err, 'no error')
      t.same(map, expected, 'iterated all values')
      t.end()
    })
  })
})

tape('non recursive iteration', function (t) {
  var db = create.one()

  var vals = [
    'a',
    'a/b/c/d',
    'a/c',
    'b',
    'b/b/c',
    'c/a',
    'c'
  ]

  put(db, vals, function (err) {
    t.error(err, 'no error')
    all(db.iterator({recursive: false}), function (err, map) {
      t.error(err, 'no error')
      var keys = Object.keys(map).map(k => k.split('/')[0])
      t.same(keys.sort(), ['a', 'b', 'c'], 'iterated all values')
      t.end()
    })
  })
})

tape('two writers, one fork', function (t) {
  create.two(function (db1, db2, replicate) {
    run(
      cb => db1.put('0', '0', cb),
      cb => db2.put('2', '2', cb),
      cb => db2.put('3', '3', cb),
      cb => db2.put('4', '4', cb),
      cb => db2.put('5', '5', cb),
      cb => db2.put('6', '6', cb),
      cb => db2.put('7', '7', cb),
      cb => db2.put('8', '8', cb),
      cb => db2.put('9', '9', cb),
      cb => replicate(cb),
      cb => db1.put('1', '1a', cb),
      cb => db2.put('1', '1b', cb),
      cb => replicate(cb),
      cb => db1.put('0', '00', cb),
      cb => replicate(cb),
      cb => db2.put('hi', 'ho', cb),
      done
    )

    function done (err) {
      t.error(err, 'no error')

      all(db1.iterator(), function (err, vals) {
        t.error(err, 'no error')
        t.same(vals, {
          '0': ['00'],
          '1': ['1a', '1b'],
          '2': ['2'],
          '3': ['3'],
          '4': ['4'],
          '5': ['5'],
          '6': ['6'],
          '7': ['7'],
          '8': ['8'],
          '9': ['9']
        })
        all(db2.iterator(), function (err, vals) {
          t.error(err, 'no error')
          t.same(vals, {
            '0': ['00'],
            '1': ['1a', '1b'],
            '2': ['2'],
            '3': ['3'],
            '4': ['4'],
            '5': ['5'],
            '6': ['6'],
            '7': ['7'],
            '8': ['8'],
            '9': ['9'],
            'hi': ['ho']
          })
          t.end()
        })
      })
    }
  })
})

tape('two writers, one fork, many values', function (t) {
  var r = range(100, 'i')

  create.two(function (db1, db2, replicate) {
    run(
      cb => db1.put('0', '0', cb),
      cb => db2.put('2', '2', cb),
      cb => db2.put('3', '3', cb),
      cb => db2.put('4', '4', cb),
      cb => db2.put('5', '5', cb),
      cb => db2.put('6', '6', cb),
      cb => db2.put('7', '7', cb),
      cb => db2.put('8', '8', cb),
      cb => db2.put('9', '9', cb),
      cb => replicate(cb),
      cb => db1.put('1', '1a', cb),
      cb => db2.put('1', '1b', cb),
      cb => replicate(cb),
      cb => db1.put('0', '00', cb),
      r.map(i => cb => db1.put(i, i, cb)),
      cb => replicate(cb),
      done
    )

    function done (err) {
      t.error(err, 'no error')

      var expected = {
        '0': ['00'],
        '1': ['1a', '1b'],
        '2': ['2'],
        '3': ['3'],
        '4': ['4'],
        '5': ['5'],
        '6': ['6'],
        '7': ['7'],
        '8': ['8'],
        '9': ['9']
      }

      r.forEach(function (v) {
        expected[v] = [v]
      })

      all(db1.iterator(), function (err, vals) {
        t.error(err, 'no error')
        t.same(vals, expected)
        all(db2.iterator(), function (err, vals) {
          t.error(err, 'no error')
          t.same(vals, expected)
          t.end()
        })
      })
    }
  })
})

function range (n, v) {
  // #0, #1, #2, ...
  return new Array(n).join('.').split('.').map((a, i) => v + i)
}

function toMap (list) {
  var map = {}
  for (var i = 0; i < list.length; i++) {
    map[list[i]] = list[i]
  }
  return map
}

function all (ite, cb) {
  var vals = {}

  ite.next(function loop (err, node) {
    if (err) return cb(err)
    if (!node) return cb(null, vals)
    var key = Array.isArray(node) ? node[0].key : node.key
    if (vals[key]) return cb(new Error('duplicate node for ' + key))
    vals[key] = Array.isArray(node) ? node.map(n => n.value) : node.value
    ite.next(loop)
  })
}