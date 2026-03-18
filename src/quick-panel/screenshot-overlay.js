let isDragging = false;
let startX, startY;
const selection = document.getElementById('selection');
const info = document.getElementById('info');
const mask = document.getElementById('mask');

window.screenshotAPI.onSetScreenshot((dataUrl) => {
  document.getElementById('bg').style.backgroundImage = `url(${dataUrl})`;
});

document.addEventListener('mousedown', (e) => {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  selection.style.left = `${startX}px`;
  selection.style.top = `${startY}px`;
  selection.style.width = '0px';
  selection.style.height = '0px';
  selection.style.display = 'block';
  info.style.display = 'block';
  mask.style.display = 'none'; // hide mask, use box-shadow on selection instead
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const currentX = e.clientX;
  const currentY = e.clientY;
  
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  
  selection.style.width = `${width}px`;
  selection.style.height = `${height}px`;
  selection.style.left = `${x}px`;
  selection.style.top = `${y}px`;
  
  info.textContent = `${width} × ${height}`;
  info.style.left = `${x}px`;
  info.style.top = `${y - 20 < 0 ? y + height + 5 : y - 20}px`;
});

document.addEventListener('mouseup', (e) => {
  if (!isDragging) return;
  isDragging = false;
  
  const width = parseInt(selection.style.width, 10);
  const height = parseInt(selection.style.height, 10);
  
  if (width > 5 && height > 5) {
    const x = parseInt(selection.style.left, 10);
    const y = parseInt(selection.style.top, 10);
    window.screenshotAPI.sendRegion({ x, y, width, height });
  } else {
    window.screenshotAPI.sendCancel();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.screenshotAPI.sendCancel();
  }
});