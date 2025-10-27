function setupEventListeners() {
    // 点击进入全屏
    overlay.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
                .then(() => lockPointer())
                .catch(err => {
                    console.error(`全屏错误: ${err.message}`);
                    lockPointer();
                });
        } else {
            lockPointer();
        }
    });

    // 窗口大小调整
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 全屏变化事件
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            document.exitPointerLock = document.exitPointerLock ||
                document.mozExitPointerLock ||
                document.webkitExitPointerLock;
            document.exitPointerLock();
            prompt.classList.remove('hidden');
            overlay.style.display = 'block';
        }
    });
}