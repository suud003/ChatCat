export const POMODORO_MAIN_ANIMATION_CONFIG = {
  assetDir: 'assets/pomodoro-start',
  frameCount: 35,
  frameStart: 1,
  frameDigits: 2,
  extension: 'png',
  frameDurationMs: 80,
  loop: false,
  showPhase: 'work',
  width: 250,
  height: 250,
  offsetX: 50,
  offsetY: 46,
  opacity: 1,
};

export function buildPomodoroAnimationFrameUrls(config = POMODORO_MAIN_ANIMATION_CONFIG) {
  const urls = [];
  for (let i = 0; i < config.frameCount; i++) {
    const frameNumber = String(config.frameStart + i).padStart(config.frameDigits, '0');
    urls.push(`${config.assetDir}/${frameNumber}.${config.extension}`);
  }
  return urls;
}
