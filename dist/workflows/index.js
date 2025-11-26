"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowHandlers = exports.workflows = void 0;
exports.getWorkflowById = getWorkflowById;
exports.getHandlerByName = getHandlerByName;
const nameCollectionWorkflow_1 = require("./nameCollectionWorkflow");
const productPurchaseWorkflow_1 = require("./productPurchaseWorkflow");
const nameCollectionHandlers_1 = require("./handlers/nameCollectionHandlers");
const purchaseHandlers_1 = require("./handlers/purchaseHandlers");
exports.workflows = [
    nameCollectionWorkflow_1.nameCollectionWorkflow,
    productPurchaseWorkflow_1.productPurchaseWorkflow
];
exports.workflowHandlers = [
    new nameCollectionHandlers_1.ValidateUserNameHandler(),
    new nameCollectionHandlers_1.SaveUserNameHandler(),
    new purchaseHandlers_1.GeneratePurchaseSummaryHandler(),
    new purchaseHandlers_1.ProcessSubscriptionHandler()
];
function getWorkflowById(id) {
    return exports.workflows.find(w => w.id === id);
}
function getHandlerByName(name) {
    return exports.workflowHandlers.find(h => h.name === name);
}
//# sourceMappingURL=index.js.map