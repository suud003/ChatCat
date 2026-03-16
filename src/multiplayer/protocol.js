/**
 * Multiplayer protocol — message types and helpers.
 * CommonJS module shared between server (Node) and client (bundled).
 */

// Client → Server message types
const C2S = {
  AUTH_REGISTER: 'auth:register',   // { username, passwordHash }
  AUTH_LOGIN: 'auth:login',         // { username, passwordHash }
  STATE_UPDATE: 'state:update',     // { level, affinity, rebirthCount, mood, isInFlow, skinId, totalCPS }
  LEADERBOARD_REQ: 'leaderboard:request', // { sortBy }
  ACTION: 'action',                 // { actionType: 'typing'|'click' }
};

// Server → Client message types
const S2C = {
  AUTH_OK: 'auth:ok',               // { userId, username, token }
  AUTH_ERROR: 'auth:error',         // { reason }
  USER_JOINED: 'user:joined',       // { userId, username, state }
  USER_LEFT: 'user:left',           // { userId }
  USER_STATE: 'user:state',         // { userId, ...stateFields }
  USERS_SNAPSHOT: 'users:snapshot',  // [{ userId, username, state }]
  LEADERBOARD_DATA: 'leaderboard:data', // [{ username, level, affinity, rebirthCount, rank }]
  USER_ACTION: 'user:action',       // { userId, actionType }
};

/** Encode a protocol message to JSON string */
function encode(type, payload) {
  return JSON.stringify({ type, ...payload });
}

/** Decode a JSON string to { type, ...payload } or null on error */
function decode(raw) {
  try {
    const msg = JSON.parse(raw);
    if (!msg || typeof msg.type !== 'string') return null;
    return msg;
  } catch {
    return null;
  }
}

// State fields that are synced between clients
const STATE_FIELDS = ['level', 'affinity', 'rebirthCount', 'mood', 'isInFlow', 'skinId', 'totalCPS'];

/** Compute diff between old and new state objects; returns null if no changes */
function stateDiff(oldState, newState) {
  if (!oldState) return { ...newState };
  const diff = {};
  let hasChanges = false;
  for (const key of STATE_FIELDS) {
    if (newState[key] !== undefined && newState[key] !== oldState[key]) {
      diff[key] = newState[key];
      hasChanges = true;
    }
  }
  return hasChanges ? diff : null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { C2S, S2C, encode, decode, STATE_FIELDS, stateDiff };
} else {
  // ES module environment — re-export for import
  window.__MP_PROTOCOL = { C2S, S2C, encode, decode, STATE_FIELDS, stateDiff };
}
