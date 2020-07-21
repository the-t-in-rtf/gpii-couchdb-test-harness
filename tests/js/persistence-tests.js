/*

    Confirm that we can consistently choose to persist or reset data between runs.

 */
/* eslint-env node */
"use strict";
var fluid  = require("infusion");

var kettle = require("kettle");
kettle.loadTestingSupport();

require("../../");

fluid.test.couchdb.loadTestingSupport();

fluid.defaults("fluid.tests.couchdb.persistent.request", {
    gradeNames: ["fluid.test.couchdb.request"],
    path:   "/persistence/new",
    method: "GET"
});

fluid.defaults("fluid.tests.couchdb.persistent.request.view", {
    gradeNames: ["fluid.tests.couchdb.persistent.request"],
    path: "/persistence/_design/persistence/_view/byId?startKey=%22new%22"
});

fluid.defaults("fluid.tests.couchdb.persistent.caseHolder", {
    gradeNames: ["fluid.test.couchdb.caseHolder"],
    persistenceRecord: { _id: "new", foo: "bar"},
    rawModules: [{
        name: "Testing persistence within a single restart.",
        tests: [
            {
                name: "Confirm that we have no indexed records in the view after an initial cleanup.",
                type: "test",
                sequence: [
                    {
                        func: "{harness}.provisionDbs",
                        args: [true]
                    },

                    {
                        event:    "{harness}.events.onDbProvisioningComplete",
                        listener: "{getViewBeforeInsertRequest}.send",
                        args:     [{}]
                    },
                    {
                        event:    "{getViewBeforeInsertRequest}.events.onComplete",
                        listener: "jqUnit.assertLeftHand",
                        args:     ["The number of rows should be as expected.", { total_rows: 0 }, "@expand:JSON.parse({arguments}.0)"]
                    },
                    {
                        func: "jqUnit.assertEquals",
                        args: ["The status code should be as expected.", 200, "{getViewBeforeInsertRequest}.nativeResponse.statusCode"]
                    }
                ]
            },
            {
                name: "Set a record and confirm that it's there.",
                type: "test",
                sequence: [
                    {
                        func: "{insertRequest}.send",
                        args: ["{that}.options.persistenceRecord"]
                    },
                    {
                        event:    "{insertRequest}.events.onComplete",
                        listener: "jqUnit.assertEquals",
                        args:     ["The status code should be as expected.", 201, "{insertRequest}.nativeResponse.statusCode"]
                    },
                    {
                        func: "{getAfterInsertRequest}.send",
                        args: [{}]
                    },
                    {
                        event:    "{getAfterInsertRequest}.events.onComplete",
                        listener: "jqUnit.assertLeftHand",
                        args:     ["The record should be readable", "{that}.options.persistenceRecord", "@expand:JSON.parse({arguments}.0)"]
                    }
                ]
            },
            {
                name: "Confirm that we have indexed records after adding one.",
                type: "test",
                sequence: [
                    {
                        func: "{getViewAfterInsertRequest}.send",
                        args: [{}]
                    },
                    {
                        event:    "{getViewAfterInsertRequest}.events.onComplete",
                        listener: "jqUnit.assertLeftHand",
                        args:     ["The status code should be as expected.", { total_rows: 1 }, "@expand:JSON.parse({arguments}.0)"]
                    },
                    {
                        func: "jqUnit.assertEquals",
                        args: ["The status code should be as expected.", 200, "{getViewAfterInsertRequest}.nativeResponse.statusCode"]
                    }
                ]
            },
            {
                name: "Confirm that the record is no longer there after running the cleanup.",
                type: "test",
                sequence: [
                    {
                        func: "{harness}.provisionDbs",
                        args: [true]
                    },
                    {
                        event:    "{harness}.events.onDbProvisioningComplete",
                        listener: "{getAfterResetRequest}.send",
                        args:     [{}]
                    },
                    {
                        event:    "{getAfterResetRequest}.events.onComplete",
                        listener: "jqUnit.assertEquals",
                        args:     ["There should no longer be a record.", 404, "{getAfterResetRequest}.nativeResponse.statusCode"]
                    }
                ]
            },
            {
                name: "Confirm that we have no indexed records after a reset.",
                type: "test",
                sequence: [
                    {
                        func: "{getViewAfterResetRequest}.send",
                        args: [{}]
                    },
                    {
                        event:    "{getViewAfterResetRequest}.events.onComplete",
                        listener: "jqUnit.assertLeftHand",
                        args:     ["The status code should be as expected.", { total_rows: 0 }, "@expand:JSON.parse({arguments}.0)"]
                    },
                    {
                        func: "jqUnit.assertEquals",
                        args: ["The status code should be as expected.", 200, "{getViewAfterResetRequest}.nativeResponse.statusCode"]
                    }
                ]
            }
        ]
    }],
    components: {
        getViewBeforeInsertRequest: {
            type: "fluid.tests.couchdb.persistent.request.view"
        },
        insertRequest: {
            type: "fluid.tests.couchdb.persistent.request",
            options: {
                method: "PUT"
            }
        },
        getAfterInsertRequest: {
            type: "fluid.tests.couchdb.persistent.request"
        },
        getViewAfterInsertRequest: {
            type: "fluid.tests.couchdb.persistent.request.view"
        },
        getAfterRestartRequest: {
            type: "fluid.tests.couchdb.persistent.request"
        },
        getViewAfterRestartRequest: {
            type: "fluid.tests.couchdb.persistent.request.view"
        },
        getAfterResetRequest: {
            type: "fluid.tests.couchdb.persistent.request"
        },
        getViewAfterResetRequest: {
            type: "fluid.tests.couchdb.persistent.request.view"
        }
    }
});

fluid.registerNamespace("fluid.tests.couchdb.persistent.environment");

fluid.defaults("fluid.tests.couchdb.persistent.environment", {
    gradeNames: ["fluid.test.couchdb.environment.base"],
    components: {
        caseHolder: {
            type: "fluid.tests.couchdb.persistent.caseHolder"
        },
        harness: {
            type: "fluid.test.couchdb.harness.persistent"
        }
    },
    databases: {
        persistence: { data: ["%fluid-couchdb-test-harness/tests/data/persistence"]}
    }
});

fluid.test.runTests("fluid.tests.couchdb.persistent.environment");
