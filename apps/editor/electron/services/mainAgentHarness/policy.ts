// @ts-nocheck
const { normalizeRequestedCapabilities } = require('./capabilityRegistry');
const {
  getCommanderCallerId,
} = require('../../../shared/commanderCore');

function normalizeOwnerContext(value = {}) {
  return {
    windowStateId: String(value?.ownerWindowStateId || value?.windowStateId || '').trim(),
    accessScope: String(value?.accessScope || '').trim().toLowerCase() || 'process',
    transportTrust: String(value?.transportTrust || '').trim().toLowerCase() || 'unknown',
    commanderTransport:
      value?.commanderTransport === true ||
      String(value?.transportLane || '').trim().toLowerCase() === 'commander_action',
  };
}

function createDefaultHarnessPolicy() {
  const allowedCommanderCallerIds = [
    getCommanderCallerId('smart_fork'),
    getCommanderCallerId('smart_name'),
  ].filter(Boolean);
  const isAllowedAgentCellsRendererCaller = (caller, owner) => {
    const normalizedOwner = normalizeOwnerContext(owner);
    return (
      normalizedOwner.transportTrust === 'renderer_ipc' &&
      normalizedOwner.commanderTransport === true &&
      caller?.callerType === 'renderer' &&
      allowedCommanderCallerIds.includes(caller?.callerId)
    );
  };

  return {
    resolveGrantedCapabilities({ caller, requestedCapabilities, owner }) {
      const requested = normalizeRequestedCapabilities(requestedCapabilities);
      const normalizedOwner = normalizeOwnerContext(owner);

      if (isAllowedAgentCellsRendererCaller(caller, owner)) {
        return requested.filter((capability) => capability === 'session.runtime');
      }

      if (normalizedOwner.transportTrust === 'trusted_host_cli') {
        return requested;
      }

      return [];
    },

    describeGrant({ caller, requestedCapabilities, grantedCapabilities, owner }) {
      const requested = normalizeRequestedCapabilities(requestedCapabilities);
      const granted = normalizeRequestedCapabilities(grantedCapabilities);
      const denied = requested.filter((capability) => !granted.includes(capability));
      const normalizedOwner = normalizeOwnerContext(owner);
      let strategy = 'deny_by_default';

      if (isAllowedAgentCellsRendererCaller(caller, owner)) {
        strategy = 'agent_cells_fixed_allowlist';
      } else if (normalizedOwner.transportTrust === 'trusted_host_cli') {
        strategy = 'trusted_host_cli';
      }

      return {
        strategy,
        grantedCapabilities: granted,
        deniedCapabilities: denied,
      };
    },

    assertRunAccess({ run, owner }) {
      const normalizedOwner = normalizeOwnerContext(owner);
      const runOwnerScope = String(run?.owner?.accessScope || 'process').trim().toLowerCase();
      const runOwnerWindowStateId = String(run?.owner?.windowStateId || '').trim();
      if (normalizedOwner.transportTrust === 'renderer_ipc' && runOwnerScope !== 'window') {
        const error = new Error('Harness run is not visible to renderer windows.');
        error.code = 'PERMISSION_DENIED';
        return error;
      }
      if (normalizedOwner.accessScope === 'window' && runOwnerScope !== 'window') {
        const error = new Error('Harness run is not visible to renderer windows.');
        error.code = 'PERMISSION_DENIED';
        return error;
      }
      if (
        normalizedOwner.accessScope === 'window' &&
        runOwnerWindowStateId &&
        normalizedOwner.windowStateId !== runOwnerWindowStateId
      ) {
        const error = new Error('Harness run is not owned by the current window.');
        error.code = 'PERMISSION_DENIED';
        return error;
      }
      return null;
    },

    filterRunsForAccess({ runs, owner }) {
      const normalizedOwner = normalizeOwnerContext(owner);
      const list = Array.isArray(runs) ? runs : [];
      if (normalizedOwner.accessScope !== 'window') {
        return list;
      }
      return list.filter((run) => {
        const runOwnerWindowStateId = String(run?.owner?.windowStateId || '').trim();
        if (!runOwnerWindowStateId) {
          return false;
        }
        return runOwnerWindowStateId === normalizedOwner.windowStateId;
      });
    },
  };
}

module.exports = {
  createDefaultHarnessPolicy,
  normalizeOwnerContext,
};
