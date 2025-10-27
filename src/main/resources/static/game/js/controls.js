// 控制变量
let isPointerLocked = false;
const sensitivity = 0.1;
const moveSpeed = 2;
const keys = {
    w: false, s: false, a: false, d: false,
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false
};
let cameraMoved = false;
let cubeMoved = false;
const cameraHint = document.getElementById('camera-hint');
const movementHint = document.getElementById('movement-hint');
const overlay = document.getElementById('click-overlay');
const prompt = document.getElementById('fullscreen-prompt');

function setupControls() {
    // 指针锁定处理函数
    document.addEventListener('pointerlockchange', lockChangeHandler, false);
    document.addEventListener('mozpointerlockchange', lockChangeHandler, false);
    document.addEventListener('webkitpointerlockchange', lockChangeHandler, false);

    // 键盘事件处理
    function onKeyDown(event) {
        if (keys.hasOwnProperty(event.key)) {
            keys[event.key] = true;
        }
    }

    function onKeyUp(event) {
        if (keys.hasOwnProperty(event.key)) {
            keys[event.key] = false;
        }
    }

    window.onKeyDown = onKeyDown;
    window.onKeyUp = onKeyUp;
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
}

function lockPointer() {
    if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock =
            renderer.domElement.requestPointerLock ||
            renderer.domElement.mozRequestPointerLock ||
            renderer.domElement.webkitRequestPointerLock;
        renderer.domElement.requestPointerLock();
    }
}

function lockChangeHandler() {
    if (document.pointerLockElement === renderer.domElement ||
        document.mozPointerLockElement === renderer.domElement ||
        document.webkitPointerLockElement === renderer.domElement) {
        document.addEventListener('mousemove', handleMouseMove, false);
        isPointerLocked = true;
        prompt.classList.add('hidden');
        overlay.style.display = 'none';
    } else {
        document.removeEventListener('mousemove', handleMouseMove, false);
        isPointerLocked = false;
        prompt.classList.remove('hidden');
        overlay.style.display = 'block';
    }
}

function handleMouseMove(event) {
    if (!isPointerLocked) return;
    const movementX = event.movementX || 0;
    if (Math.abs(movementX) > 0 && !cameraMoved) {
        cameraMoved = true;
        cameraHint.classList.add('hidden');
    }
    yaw += movementX * sensitivity * 0.01745; // 转为弧度
}

function getMovementDirection() {
    // 相机前向向量（忽略Y轴）
    const cameraForward = new THREE.Vector3(
        Math.sin(yaw),
        0,
        -Math.cos(yaw)
    ).normalize();

    // 相机右向向量（忽略Y轴）
    const cameraRight = new THREE.Vector3(
        Math.sin(yaw + Math.PI/2),
        0,
        -Math.cos(yaw + Math.PI/2)
    ).normalize();

    // 基础方向向量
    const direction = new THREE.Vector3(0, 0, 0);

    // 根据按键更新方向
    if (keys.w || keys.ArrowUp) direction.sub(cameraForward);
    if (keys.s || keys.ArrowDown) direction.add(cameraForward);
    if (keys.a || keys.ArrowLeft) direction.add(cameraRight);
    if (keys.d || keys.ArrowRight) direction.sub(cameraRight);

    // 归一化方向向量
    if (direction.length() > 0) direction.normalize();

    return direction;
}