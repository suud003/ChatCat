/**
 * RoomManager tests — 房间管理核心功能单元测试
 * 覆盖: 创建/加入/离开/销毁房间, 房主转移, 错误处理
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../../src/multiplayer/room-manager.js';

describe('RoomManager', () => {
  let manager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  // ==================== 构造函数 ====================

  describe('constructor', () => {
    it('使用默认参数初始化', () => {
      expect(manager.maxRooms).toBe(20);
      expect(manager.maxPerRoom).toBe(10);
      expect(manager.roomCodeLength).toBe(6);
      expect(manager.rooms.size).toBe(0);
      expect(manager.codeToRoom.size).toBe(0);
      expect(manager.userToRoom.size).toBe(0);
    });

    it('接受自定义参数', () => {
      const custom = new RoomManager({ maxRooms: 5, maxPerRoom: 3, roomCodeLength: 4 });
      expect(custom.maxRooms).toBe(5);
      expect(custom.maxPerRoom).toBe(3);
      expect(custom.roomCodeLength).toBe(4);
    });
  });

  // ==================== createRoom ====================

  describe('createRoom', () => {
    it('成功创建房间', () => {
      const result = manager.createRoom('user1');

      expect(result.error).toBeUndefined();
      expect(result.roomId).toBeDefined();
      expect(result.code).toBeDefined();
      expect(result.code).toHaveLength(6);

      // 验证内部状态
      expect(manager.rooms.size).toBe(1);
      expect(manager.codeToRoom.has(result.code)).toBe(true);
      expect(manager.userToRoom.get('user1')).toBe(result.roomId);
    });

    it('创建房间时用户成为房主', () => {
      const { roomId } = manager.createRoom('user1');
      const room = manager.rooms.get(roomId);

      expect(room.host).toBe('user1');
      expect(room.members.has('user1')).toBe(true);
      expect(room.joinOrder).toEqual(['user1']);
    });

    it('每个房间有唯一的 roomId', () => {
      const result1 = manager.createRoom('user1');
      const result2 = manager.createRoom('user2');

      expect(result1.roomId).not.toBe(result2.roomId);
    });

    it('每个房间有唯一的房间码', () => {
      const result1 = manager.createRoom('user1');
      const result2 = manager.createRoom('user2');

      expect(result1.code).not.toBe(result2.code);
    });

    it('已加入房间的用户不能创建新房间', () => {
      manager.createRoom('user1');
      const result = manager.createRoom('user1');

      expect(result.error).toBe('ALREADY_IN_ROOM');
      expect(manager.rooms.size).toBe(1);
    });

    it('达到最大房间数时返回错误', () => {
      const smallManager = new RoomManager({ maxRooms: 2 });

      smallManager.createRoom('user1');
      smallManager.createRoom('user2');
      const result = smallManager.createRoom('user3');

      expect(result.error).toBe('MAX_ROOMS_REACHED');
    });
  });

  // ==================== generateCode ====================

  describe('generateCode', () => {
    it('生成6位字符的默认长度代码', () => {
      const code = manager.generateCode();
      expect(code).toHaveLength(6);
    });

    it('只使用允许的字符', () => {
      const allowedChars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

      for (let i = 0; i < 10; i++) {
        const code = manager.generateCode();
        for (const char of code) {
          expect(allowedChars).toContain(char);
        }
      }
    });

    it('不包含易混淆字符 O/0/I/1/L', () => {
      for (let i = 0; i < 20; i++) {
        const code = manager.generateCode();
        expect(code).not.toContain('O');
        expect(code).not.toContain('0');
        expect(code).not.toContain('I');
        expect(code).not.toContain('1');
        expect(code).not.toContain('L');
      }
    });

    it('自定义长度时生成对应长度的代码', () => {
      const customManager = new RoomManager({ roomCodeLength: 4 });
      const code = customManager.generateCode();
      expect(code).toHaveLength(4);
    });

    it('确保生成的代码不重复', () => {
      // 创建多个房间,确保没有重复的 code
      const codes = new Set();
      for (let i = 0; i < 10; i++) {
        const { code } = manager.createRoom(`user${i}`);
        expect(codes.has(code)).toBe(false);
        codes.add(code);
      }
    });
  });

  // ==================== joinRoom ====================

  describe('joinRoom', () => {
    it('成功加入房间', () => {
      const { code } = manager.createRoom('host');
      const result = manager.joinRoom(code, 'joiner');

      expect(result.error).toBeUndefined();
      expect(result.roomId).toBeDefined();
    });

    it('加入后用户出现在房间成员中', () => {
      const { code, roomId } = manager.createRoom('host');
      manager.joinRoom(code, 'joiner');

      const room = manager.rooms.get(roomId);
      expect(room.members.has('joiner')).toBe(true);
      expect(room.joinOrder).toEqual(['host', 'joiner']);
    });

    it('支持小写输入自动转为大写', () => {
      const { code, roomId } = manager.createRoom('host');
      const result = manager.joinRoom(code.toLowerCase(), 'joiner');

      expect(result.roomId).toBe(roomId);
    });

    it('支持带空格的房间码自动去除', () => {
      const { code, roomId } = manager.createRoom('host');
      const result = manager.joinRoom(`  ${code}  `, 'joiner');

      expect(result.roomId).toBe(roomId);
    });

    it('无效房间码返回错误', () => {
      const result = manager.joinRoom('INVALID', 'user');
      expect(result.error).toBe('INVALID_CODE');
    });

    it('不存在的房间返回错误', () => {
      manager.createRoom('host');
      const result = manager.joinRoom('ZZZZZZ', 'user');
      expect(result.error).toBe('INVALID_CODE');
    });

    it('房间已满时返回错误', () => {
      const smallManager = new RoomManager({ maxPerRoom: 2 });
      const { code } = smallManager.createRoom('host');
      smallManager.joinRoom(code, 'user2');

      const result = smallManager.joinRoom(code, 'user3');
      expect(result.error).toBe('ROOM_FULL');
    });

    it('已加入其他房间的用户不能加入新房间', () => {
      const { code: code1 } = manager.createRoom('host1');
      manager.joinRoom(code1, 'user');

      const { code: code2 } = manager.createRoom('host2');
      const result = manager.joinRoom(code2, 'user');

      expect(result.error).toBe('ALREADY_IN_ROOM');
    });

    it('房主不能重复加入自己的房间', () => {
      const { code } = manager.createRoom('host');
      const result = manager.joinRoom(code, 'host');
      expect(result.error).toBe('ALREADY_IN_ROOM');
    });
  });

  // ==================== leaveRoom ====================

  describe('leaveRoom', () => {
    it('成功离开房间', () => {
      const { code } = manager.createRoom('host');
      manager.joinRoom(code, 'joiner');

      const result = manager.leaveRoom('joiner');

      expect(result.leftRoomId).toBeDefined();
      expect(result.destroyed).toBe(false);
      expect(result.remainingMembers.has('host')).toBe(true);
      expect(result.remainingMembers.has('joiner')).toBe(false);
    });

    it('离开后用户不再在房间中', () => {
      const { code, roomId } = manager.createRoom('host');
      manager.joinRoom(code, 'joiner');
      manager.leaveRoom('joiner');

      const room = manager.rooms.get(roomId);
      expect(room.members.has('joiner')).toBe(false);
      expect(manager.userToRoom.has('joiner')).toBe(false);
    });

    it('不在任何房间的用户离开返回空', () => {
      const result = manager.leaveRoom('not-in-room');
      expect(result.leftRoomId).toBeNull();
      expect(result.destroyed).toBe(false);
      expect(result.remainingMembers).toBeNull();
    });

    it('房主离开时转移给最早加入的成员', () => {
      const { code, roomId } = manager.createRoom('host');
      manager.joinRoom(code, 'first');
      manager.joinRoom(code, 'second');

      manager.leaveRoom('host');

      const room = manager.rooms.get(roomId);
      expect(room.host).toBe('first');
    });

    it('房主转移时跳过已离开的成员', () => {
      const { code, roomId } = manager.createRoom('host');
      manager.joinRoom(code, 'first');
      manager.joinRoom(code, 'second');
      manager.leaveRoom('first'); // first 先离开

      manager.leaveRoom('host');

      const room = manager.rooms.get(roomId);
      expect(room.host).toBe('second');
    });

    it('房主转移时成员顺序保持不变', () => {
      const { code, roomId } = manager.createRoom('host');
      manager.joinRoom(code, 'first');
      manager.joinRoom(code, 'second');

      manager.leaveRoom('host');

      const room = manager.rooms.get(roomId);
      expect(room.joinOrder).toEqual(['host', 'first', 'second']);
    });

    it('最后一个成员离开时销毁房间', () => {
      const { code, roomId } = manager.createRoom('host');
      const result = manager.leaveRoom('host');

      expect(result.destroyed).toBe(true);
      expect(manager.rooms.has(roomId)).toBe(false);
      expect(result.remainingMembers.size).toBe(0);
    });

    it('房间销毁时清理 codeToRoom 映射', () => {
      const { code } = manager.createRoom('host');
      manager.leaveRoom('host');

      expect(manager.codeToRoom.has(code)).toBe(false);
    });

    it('房间已不存在时返回销毁状态', () => {
      // 模拟异常情况: userToRoom 有记录但房间已被删除
      manager.userToRoom.set('ghost', 'non-existent-room');
      const result = manager.leaveRoom('ghost');

      expect(result.leftRoomId).toBe('non-existent-room');
      expect(result.destroyed).toBe(true);
    });
  });

  // ==================== getRoomByUser ====================

  describe('getRoomByUser', () => {
    it('返回用户所在房间', () => {
      const { roomId } = manager.createRoom('user1');
      const room = manager.getRoomByUser('user1');

      expect(room).not.toBeNull();
      expect(room.id).toBe(roomId);
    });

    it('不在房间的用户返回 null', () => {
      const room = manager.getRoomByUser('not-in-room');
      expect(room).toBeNull();
    });

    it('离开后返回 null', () => {
      manager.createRoom('user1');
      manager.leaveRoom('user1');

      const room = manager.getRoomByUser('user1');
      expect(room).toBeNull();
    });

    it('返回的房间包含正确的成员', () => {
      const { code } = manager.createRoom('host');
      manager.joinRoom(code, 'joiner');

      const room = manager.getRoomByUser('joiner');
      expect(room.members.has('host')).toBe(true);
      expect(room.members.has('joiner')).toBe(true);
    });
  });

  // ==================== getRoomByCode ====================

  describe('getRoomByCode', () => {
    it('通过房间码获取房间', () => {
      const { code, roomId } = manager.createRoom('host');
      const room = manager.getRoomByCode(code);

      expect(room).not.toBeNull();
      expect(room.id).toBe(roomId);
    });

    it('支持小写查询', () => {
      const { code } = manager.createRoom('host');
      const room = manager.getRoomByCode(code.toLowerCase());

      expect(room).not.toBeNull();
    });

    it('支持带空格的查询', () => {
      const { code } = manager.createRoom('host');
      const room = manager.getRoomByCode(`  ${code}  `);

      expect(room).not.toBeNull();
    });

    it('无效房间码返回 null', () => {
      const room = manager.getRoomByCode('INVALID');
      expect(room).toBeNull();
    });

    it('房间销毁后返回 null', () => {
      const { code } = manager.createRoom('host');
      manager.leaveRoom('host');

      const room = manager.getRoomByCode(code);
      expect(room).toBeNull();
    });
  });

  // ==================== getRoomMembers ====================

  describe('getRoomMembers', () => {
    it('返回房间成员集合', () => {
      const { code, roomId } = manager.createRoom('host');
      manager.joinRoom(code, 'joiner1');
      manager.joinRoom(code, 'joiner2');

      const members = manager.getRoomMembers(roomId);

      expect(members.size).toBe(3);
      expect(members.has('host')).toBe(true);
      expect(members.has('joiner1')).toBe(true);
      expect(members.has('joiner2')).toBe(true);
    });

    it('不存在的房间返回 null', () => {
      const members = manager.getRoomMembers('non-existent');
      expect(members).toBeNull();
    });

    it('成员离开后更新正确', () => {
      const { code, roomId } = manager.createRoom('host');
      manager.joinRoom(code, 'joiner');
      manager.leaveRoom('joiner');

      const members = manager.getRoomMembers(roomId);
      expect(members.has('joiner')).toBe(false);
      expect(members.size).toBe(1);
    });
  });

  // ==================== getRoomHost ====================

  describe('getRoomHost', () => {
    it('返回房主用户ID', () => {
      const { roomId } = manager.createRoom('host');
      const host = manager.getRoomHost(roomId);

      expect(host).toBe('host');
    });

    it('房主转移后返回新房主', () => {
      const { code, roomId } = manager.createRoom('host');
      manager.joinRoom(code, 'newHost');
      manager.leaveRoom('host');

      const host = manager.getRoomHost(roomId);
      expect(host).toBe('newHost');
    });

    it('不存在的房间返回 null', () => {
      const host = manager.getRoomHost('non-existent');
      expect(host).toBeNull();
    });
  });

  // ==================== 复杂场景 ====================

  describe('复杂场景', () => {
    it('多个房间互相隔离', () => {
      const { code: code1, roomId: roomId1 } = manager.createRoom('host1');
      const { code: code2, roomId: roomId2 } = manager.createRoom('host2');

      manager.joinRoom(code1, 'userA');
      manager.joinRoom(code2, 'userB');

      expect(manager.getRoomByUser('userA').id).toBe(roomId1);
      expect(manager.getRoomByUser('userB').id).toBe(roomId2);
      expect(manager.getRoomMembers(roomId1).has('userB')).toBe(false);
      expect(manager.getRoomMembers(roomId2).has('userA')).toBe(false);
    });

    it('完整生命周期: 创建 → 加入 → 离开 → 销毁', () => {
      // 创建
      const { code, roomId } = manager.createRoom('host');
      expect(manager.rooms.size).toBe(1);

      // 加入
      manager.joinRoom(code, 'user1');
      manager.joinRoom(code, 'user2');
      expect(manager.getRoomMembers(roomId).size).toBe(3);

      // 离开
      manager.leaveRoom('user1');
      expect(manager.getRoomMembers(roomId).size).toBe(2);

      // 房主离开,转移
      manager.leaveRoom('host');
      expect(manager.getRoomHost(roomId)).toBe('user2');

      // 最后一个离开,销毁
      const result = manager.leaveRoom('user2');
      expect(result.destroyed).toBe(true);
      expect(manager.rooms.size).toBe(0);
    });

    it('大量房间和用户的性能测试', () => {
      const users = [];

      // 创建多个房间
      for (let i = 0; i < 10; i++) {
        const { code } = manager.createRoom(`host${i}`);
        // 每个房间加入多个用户
        for (let j = 0; j < 5; j++) {
          const userId = `room${i}-user${j}`;
          users.push(userId);
          manager.joinRoom(code, userId);
        }
      }

      expect(manager.rooms.size).toBe(10);

      // 验证所有用户都在正确的房间
      for (let i = 0; i < 10; i++) {
        const room = manager.getRoomByUser(`host${i}`);
        expect(room.members.size).toBe(6); // host + 5 users
      }

      // 批量离开
      for (const userId of users) {
        manager.leaveRoom(userId);
      }

      // 所有房间应该还在(因为房主还在)
      expect(manager.rooms.size).toBe(10);

      // 房主离开,销毁所有房间
      for (let i = 0; i < 10; i++) {
        manager.leaveRoom(`host${i}`);
      }

      expect(manager.rooms.size).toBe(0);
      expect(manager.codeToRoom.size).toBe(0);
      expect(manager.userToRoom.size).toBe(0);
    });

    it('边界条件: maxPerRoom 精确限制', () => {
      const smallManager = new RoomManager({ maxPerRoom: 3 });
      const { code } = smallManager.createRoom('host');

      // 加入刚好达到上限
      smallManager.joinRoom(code, 'user1');
      smallManager.joinRoom(code, 'user2');

      expect(smallManager.getRoomMembers(smallManager.getRoomByUser('host').id).size).toBe(3);

      // 再加入应该失败
      const result = smallManager.joinRoom(code, 'user3');
      expect(result.error).toBe('ROOM_FULL');
    });

    it('边界条件: maxRooms 精确限制', () => {
      const smallManager = new RoomManager({ maxRooms: 3 });

      smallManager.createRoom('host1');
      smallManager.createRoom('host2');
      smallManager.createRoom('host3');

      expect(smallManager.rooms.size).toBe(3);

      const result = smallManager.createRoom('host4');
      expect(result.error).toBe('MAX_ROOMS_REACHED');
    });
  });
});
