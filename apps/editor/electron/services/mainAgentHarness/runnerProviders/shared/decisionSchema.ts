// @ts-nocheck
function buildCapabilityCallSchema({ allowedCapabilityIds = [] } = {}) {
  const normalizedAllowed = Array.from(
    new Set(
      (Array.isArray(allowedCapabilityIds) ? allowedCapabilityIds : [])
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  );
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      capabilityId: normalizedAllowed.length > 0
        ? {
            type: 'string',
            enum: normalizedAllowed,
          }
        : {
            type: 'string',
            minLength: 1,
          },
      title: {
        type: 'string',
      },
      input: {
        type: 'object',
        additionalProperties: true,
      },
    },
    required: ['capabilityId', 'input'],
  };
}

function buildDecisionSchema({
  allowedCapabilityIds = [],
  modeEnum = [],
  maxCapabilityCalls = 4,
} = {}) {
  const normalizedModes = Array.from(
    new Set(
      (Array.isArray(modeEnum) ? modeEnum : [])
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  );
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    additionalProperties: false,
    properties: {
      mode: normalizedModes.length > 0
        ? {
            type: 'string',
            enum: normalizedModes,
          }
        : {
            type: 'string',
            minLength: 1,
          },
      summary: {
        type: 'string',
      },
      capabilityCalls: {
        type: 'array',
        items: buildCapabilityCallSchema({ allowedCapabilityIds }),
        minItems: 0,
        maxItems: Math.max(1, Number(maxCapabilityCalls) || 4),
      },
      failure: {
        type: 'object',
        additionalProperties: false,
        properties: {
          code: {
            type: 'string',
          },
          message: {
            type: 'string',
          },
        },
        required: ['code', 'message'],
      },
    },
    required: ['mode', 'summary', 'capabilityCalls'],
  };
}

module.exports = {
  buildDecisionSchema,
};
