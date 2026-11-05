// ==================== 调试按钮 ====================
document.getElementById('debug-btn').addEventListener('click', () => {
  debugMode = !debugMode;
  const btn = document.getElementById('debug-btn');
  const info = document.getElementById('debug-info');
  if (debugMode) {
    btn.textContent = '调试:开';
    btn.classList.add('active');
    info.classList.add('visible');
  } else {
    btn.textContent = '调试:关';
    btn.classList.remove('active');
    info.classList.remove('visible');
    debugMouseX = -1;
    debugMouseY = -1;
  }
});
