namespace.lookup('com.beedesk.cacheca.test').defineOnce(function (ns) {
    var cacheca = namespace.lookup('com.beedesk.cacheca');
    function addTests(ts) {

        ts.addTest("BareSet Unit Tests", function(ut) {
            var set = new cacheca.BareSet({name: 'abc'});
            ut.assert(set !== null);
        });
        ts.addTest("Binder Unit Tests", function(ut) {
            var set = new cacheca.Binder({name: 'abc'});
            ut.assert(set !== null);
        });
    }

    ns.extend({
        'addTests': addTests
    });
});
