const contract = require("./contract.cjs");
const { createFeishuChannel } = require("./feishu.cjs");

const registry = contract.createRegistry();
registry.register(createFeishuChannel());

module.exports = {
  ...contract,
  registry,
  listStatuses() {
    return registry.statuses();
  },
};
