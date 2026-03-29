/**
 * Bongocat Character - Canvas sprite animation with state machine
 * States: idle, typing, click, happy, sleep
 */

export class Character {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = 'idle';
    this.frame = 0;
    this.frameTimer = 0;
    this.frameInterval = 150; // ms per frame
    this.lastTime = 0;
    this.stateTimer = 0;
    this.typingTimeout = null;
    this.blinkTimer = 0;
    this.isBlinking = false;
    this.bodyBob = 0;
    this.bodyBobDir = 1;
    this.leftPawY = 0;
    this.rightPawY = 0;
    this.targetLeftPawY = 0;
    this.targetRightPawY = 0;
    this.expressionState = 'normal'; // normal, happy, surprised

    // Intent-based animation
    this._earAngleOffset = 0;    // intent-driven ear angle offset
    this._intentTimer = null;
    this._workingInterval = null;

    // Start animation loop
    this._rafId = null;
    this.animate = this.animate.bind(this);
    this._rafId = requestAnimationFrame(this.animate);
  }

  stop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._intentTimer) clearTimeout(this._intentTimer);
    if (this._workingInterval) clearInterval(this._workingInterval);
  }

  start() {
    if (!this._rafId) {
      this._rafId = requestAnimationFrame(this.animate);
    }
  }

  setState(newState) {
    if (this.state !== newState) {
      this.state = newState;
      this.frame = 0;
      this.stateTimer = 0;
    }
  }

  triggerTyping() {
    this.setState('typing');
    // Alternate paws
    if (Math.random() > 0.5) {
      this.targetLeftPawY = -15;
      this.targetRightPawY = 0;
    } else {
      this.targetLeftPawY = 0;
      this.targetRightPawY = -15;
    }

    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.setState('idle');
      this.targetLeftPawY = 0;
      this.targetRightPawY = 0;
    }, 500);
  }

  triggerClick() {
    this.setState('click');
    this.targetLeftPawY = -20;
    this.targetRightPawY = -20;
    this.expressionState = 'surprised';

    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.setState('idle');
      this.targetLeftPawY = 0;
      this.targetRightPawY = 0;
      this.expressionState = 'normal';
    }, 400);
  }

  triggerHappy() {
    this.expressionState = 'happy';
    setTimeout(() => {
      this.expressionState = 'normal';
    }, 2000);
  }

  triggerIntent(name) {
    console.log('[Character] triggerIntent:', name);
    clearTimeout(this._intentTimer);
    if (this._workingInterval) { clearInterval(this._workingInterval); this._workingInterval = null; }
    switch (name) {
      case 'curious':
        this.expressionState = 'surprised';
        this._earAngleOffset = 0.25;
        this._intentTimer = setTimeout(() => {
          this.expressionState = 'normal';
          this._earAngleOffset = 0;
        }, 1500);
        break;
      case 'working':
        this._workingInterval = setInterval(() => this.triggerTyping(), 200);
        break;
      case 'proud':
        this.expressionState = 'happy';
        this._intentTimer = setTimeout(() => { this.expressionState = 'normal'; }, 2000);
        break;
      case 'sleepy':
        this.setState('sleep');
        this._intentTimer = setTimeout(() => { this.setState('idle'); }, 3000);
        break;
      case 'alert':
        this.expressionState = 'surprised';
        this._earAngleOffset = 0.35;
        this._intentTimer = setTimeout(() => {
          this.expressionState = 'normal';
          this._earAngleOffset = 0;
        }, 2000);
        break;
      case 'encouraging':
        this.expressionState = 'happy';
        this._intentTimer = setTimeout(() => { this.expressionState = 'normal'; }, 2000);
        break;
      case 'idle':
      default:
        this.expressionState = 'normal';
        this._earAngleOffset = 0;
        break;
    }
  }

  animate(timestamp) {
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.frameTimer += dt;
    this.stateTimer += dt;
    this.blinkTimer += dt;

    // Blink every 3-5 seconds
    if (this.blinkTimer > 3000 + Math.random() * 2000) {
      this.isBlinking = true;
      this.blinkTimer = 0;
      setTimeout(() => { this.isBlinking = false; }, 150);
    }

    // Body bob animation
    this.bodyBob += this.bodyBobDir * dt * 0.008;
    if (this.bodyBob > 3) this.bodyBobDir = -1;
    if (this.bodyBob < -3) this.bodyBobDir = 1;

    // Smooth paw movement
    this.leftPawY += (this.targetLeftPawY - this.leftPawY) * 0.3;
    this.rightPawY += (this.targetRightPawY - this.rightPawY) * 0.3;

    // Auto-sleep after idle for 30s
    if (this.state === 'idle' && this.stateTimer > 30000) {
      this.setState('sleep');
    }

    this.draw();
    this._rafId = requestAnimationFrame(this.animate);
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 + 20;
    const bob = this.bodyBob;

    ctx.save();
    ctx.translate(0, bob);

    // --- Draw Table / Keyboard ---
    this.drawKeyboard(ctx, cx, cy + 55);

    // --- Draw Body (cat body) ---
    this.drawBody(ctx, cx, cy);

    // --- Draw Head ---
    this.drawHead(ctx, cx, cy - 45);

    // --- Draw Paws ---
    this.drawPaws(ctx, cx, cy + 40);

    ctx.restore();
  }

  drawKeyboard(ctx, cx, cy) {
    // Simple keyboard/desk
    ctx.fillStyle = 'rgba(60, 60, 80, 0.8)';
    ctx.beginPath();
    ctx.roundRect(cx - 80, cy, 160, 30, 6);
    ctx.fill();

    // Key rows
    ctx.fillStyle = 'rgba(80, 80, 105, 0.9)';
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 8; i++) {
        const kx = cx - 70 + i * 18;
        const ky = cy + 4 + row * 13;
        ctx.beginPath();
        ctx.roundRect(kx, ky, 14, 10, 2);
        ctx.fill();
      }
    }

    // Highlight pressed keys during typing
    if (this.state === 'typing') {
      ctx.fillStyle = 'rgba(79, 172, 254, 0.6)';
      const keyIdx = Math.floor(Math.random() * 8);
      const rowIdx = Math.floor(Math.random() * 2);
      ctx.beginPath();
      ctx.roundRect(cx - 70 + keyIdx * 18, cy + 4 + rowIdx * 13, 14, 10, 2);
      ctx.fill();
    }
  }

  drawBody(ctx, cx, cy) {
    // Main body - rounded blob shape
    const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, 65);
    gradient.addColorStop(0, '#ffe8d6');
    gradient.addColorStop(1, '#f4c89a');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 55, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body outline
    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Belly patch
    ctx.fillStyle = '#fff5eb';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 15, 30, 25, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawHead(ctx, cx, cy) {
    // Head
    const headGradient = ctx.createRadialGradient(cx, cy, 5, cx, cy, 45);
    headGradient.addColorStop(0, '#ffe8d6');
    headGradient.addColorStop(1, '#f0be88');

    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 42, 36, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ears
    this.drawEar(ctx, cx - 30, cy - 28, -0.3 - this._earAngleOffset);
    this.drawEar(ctx, cx + 30, cy - 28, 0.3 + this._earAngleOffset);

    // Face
    this.drawFace(ctx, cx, cy);
  }

  drawEar(ctx, x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Outer ear
    ctx.fillStyle = '#f0be88';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-12, -25);
    ctx.lineTo(12, -25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner ear
    ctx.fillStyle = '#ffb5b5';
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(-7, -20);
    ctx.lineTo(7, -20);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawFace(ctx, cx, cy) {
    if (this.state === 'sleep') {
      // Sleeping face - closed eyes with Z's
      ctx.strokeStyle = '#6b5c4f';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';

      // Closed eyes (arcs)
      ctx.beginPath();
      ctx.arc(cx - 14, cy - 4, 6, 0, Math.PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx + 14, cy - 4, 6, 0, Math.PI);
      ctx.stroke();

      // Z's
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = 'rgba(79, 172, 254, 0.7)';
      const zBob = Math.sin(Date.now() / 500) * 3;
      ctx.fillText('Z', cx + 35, cy - 20 + zBob);
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('z', cx + 45, cy - 32 + zBob);

    } else {
      // Eyes
      const eyeOpenness = this.isBlinking ? 1 : 8;

      if (this.expressionState === 'surprised') {
        // Big round eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(cx - 14, cy - 4, 9, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 14, cy - 4, 9, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#3d2f25';
        ctx.beginPath();
        ctx.arc(cx - 14, cy - 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 14, cy - 4, 5, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx - 12, cy - 6, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 16, cy - 6, 2, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // Normal/happy eyes
        ctx.fillStyle = '#3d2f25';
        ctx.beginPath();
        ctx.ellipse(cx - 14, cy - 4, 5, eyeOpenness / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 14, cy - 4, 5, eyeOpenness / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        if (!this.isBlinking && eyeOpenness > 2) {
          // Eye highlights
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(cx - 12, cy - 6, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx + 16, cy - 6, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Happy expression - curved eyes
      if (this.expressionState === 'happy') {
        ctx.fillStyle = '#ffe8d6';
        ctx.beginPath();
        ctx.ellipse(cx - 14, cy - 4, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 14, cy - 4, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#3d2f25';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx - 14, cy - 2, 6, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + 14, cy - 2, 6, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }

      // Blush
      ctx.fillStyle = 'rgba(255, 150, 150, 0.3)';
      ctx.beginPath();
      ctx.ellipse(cx - 22, cy + 4, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 22, cy + 4, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nose
    ctx.fillStyle = '#e8998d';
    ctx.beginPath();
    ctx.moveTo(cx, cy + 5);
    ctx.lineTo(cx - 4, cy + 9);
    ctx.lineTo(cx + 4, cy + 9);
    ctx.closePath();
    ctx.fill();

    // Mouth
    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    if (this.expressionState === 'happy' || this.state === 'sleep') {
      // Happy/content mouth
      ctx.beginPath();
      ctx.arc(cx, cy + 10, 6, 0.1, Math.PI - 0.1);
      ctx.stroke();
    } else {
      // Normal mouth - W shape (cat mouth)
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy + 12);
      ctx.quadraticCurveTo(cx - 4, cy + 16, cx, cy + 12);
      ctx.quadraticCurveTo(cx + 4, cy + 16, cx + 8, cy + 12);
      ctx.stroke();
    }

    // Whiskers
    ctx.strokeStyle = 'rgba(180, 160, 140, 0.6)';
    ctx.lineWidth = 1;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + side * 18, cy + 8 + i * 4);
        ctx.lineTo(cx + side * 42, cy + 5 + i * 6);
        ctx.stroke();
      }
    }
  }

  drawPaws(ctx, cx, cy) {
    // Left paw
    this.drawPaw(ctx, cx - 25, cy + this.leftPawY, this.state === 'typing' && this.targetLeftPawY < 0);
    // Right paw
    this.drawPaw(ctx, cx + 25, cy + this.rightPawY, this.state === 'typing' && this.targetRightPawY < 0);
  }

  drawPaw(ctx, x, y, isPressed) {
    const gradient = ctx.createRadialGradient(x, y, 2, x, y, 18);
    gradient.addColorStop(0, '#ffe8d6');
    gradient.addColorStop(1, '#f0be88');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x, y, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Paw pads
    ctx.fillStyle = '#ffb5b5';
    ctx.beginPath();
    ctx.arc(x, y + 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Toe beans
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(x + i * 5, y - 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Press effect
    if (isPressed) {
      ctx.fillStyle = 'rgba(79, 172, 254, 0.2)';
      ctx.beginPath();
      ctx.ellipse(x, y + 5, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
