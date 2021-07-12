const PermissionHierarchy = artifacts.require("PermissionHierarchy");

module.exports = function (deployer) {
  deployer.deploy(PermissionHierarchy, 10);
};
