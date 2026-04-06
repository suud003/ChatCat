/**
 * RoomManager — manages multiplayer rooms (create / join / leave / destroy).
 * Pure data class, no network or I/O. CommonJS module for main process.
 */

const crypto = require('crypto');

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 30 chars, 排除 O/0/I/1/L

class RoomManager {
  /**
   * @param {object} opts
   * @param {number} [opts.maxRooms=20]
   * @param {number} [opts.maxPerRoom=10]
   * @param {number} [opts.roomCodeLength=6]
   */
  constructor(opts = {}) {
    this.maxRooms = opts.maxRooms || 20;
    this.maxPerRoom = opts.maxPerRoom || 10;
    this.roomCodeLength = opts.roomCodeLength || 6;
    this.rooms = new Map();        // roomId → { id, code, host, members: Set<userId>, createdAt, joinOrder: [] }
    this.codeToRoom = new Map();   // code → roomId
    this.userToRoom = new Map();   // userId → roomId
  }

  generateCode() {
    let code;
    do {
      code = '';
      for (let i = 0; i < this.roomCodeLength; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      }
    } while (this.codeToRoom.has(code));
    return code;
  }

  /**
   * @param {string} hostUserId
   * @returns {{ roomId: string, code: string } | { error: string }}
   */
  createRoom(hostUserId) {
    if (this.userToRoom.has(hostUserId)) {
      return { error: 'ALREADY_IN_ROOM' };
    }
    if (this.rooms.size >= this.maxRooms) {
      return { error: 'MAX_ROOMS_REACHED' };
    }
    const roomId = crypto.randomUUID ? crypto.randomUUID() : `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const code = this.generateCode();
    const room = {
      id: roomId,
      code,
      host: hostUserId,
      members: new Set([hostUserId]),
      createdAt: Date.now(),
      joinOrder: [hostUserId],
    };
    this.rooms.set(roomId, room);
    this.codeToRoom.set(code, roomId);
    this.userToRoom.set(hostUserId, roomId);
    return { roomId, code };
  }

  /**
   * @param {string} code
   * @param {string} userId
   * @returns {{ roomId: string } | { error: string }}
   */
  joinRoom(code, userId) {
    code = code.toUpperCase().trim();
    const roomId = this.codeToRoom.get(code);
    if (!roomId) return { error: 'INVALID_CODE' };
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'INVALID_CODE' };
    if (room.members.size >= this.maxPerRoom) return { error: 'ROOM_FULL' };
    if (this.userToRoom.has(userId)) return { error: 'ALREADY_IN_ROOM' };
    room.members.add(userId);
    room.joinOrder.push(userId);
    this.userToRoom.set(userId, roomId);
    return { roomId };
  }

  /**
   * @param {string} userId
   * @returns {{ leftRoomId: string|null, destroyed: boolean, remainingMembers: Set|null }}
   */
  leaveRoom(userId) {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return { leftRoomId: null, destroyed: false, remainingMembers: null };
    this.userToRoom.delete(userId);
    const room = this.rooms.get(roomId);
    if (!room) return { leftRoomId: roomId, destroyed: true, remainingMembers: null };
    room.members.delete(userId);
    if (room.members.size === 0) {
      // 全员离开 → 销毁
      this.codeToRoom.delete(room.code);
      this.rooms.delete(roomId);
      return { leftRoomId: roomId, destroyed: true, remainingMembers: new Set() };
    }
    // 房主离开 → 转移给最早加入的非房主成员
    if (room.host === userId) {
      const newHost = room.joinOrder.find(uid => uid !== userId && room.members.has(uid));
      if (newHost) room.host = newHost;
    }
    return { leftRoomId: roomId, destroyed: false, remainingMembers: new Set(room.members) };
  }

  /**
   * @param {string} userId
   * @returns {{ id: string, code: string, host: string, members: Set<string> } | null}
   */
  getRoomByUser(userId) {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  /**
   * @param {string} code
   * @returns {{ id: string, code: string, host: string, members: Set<string> } | null}
   */
  getRoomByCode(code) {
    const roomId = this.codeToRoom.get(code.toUpperCase().trim());
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  /**
   * @param {string} roomId
   * @returns {Set<string>|null}
   */
  getRoomMembers(roomId) {
    const room = this.rooms.get(roomId);
    return room ? room.members : null;
  }

  /**
   * @param {string} roomId
   * @returns {string|null}
   */
  getRoomHost(roomId) {
    const room = this.rooms.get(roomId);
    return room ? room.host : null;
  }
}

module.exports = { RoomManager };
