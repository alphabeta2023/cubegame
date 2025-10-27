// 碰撞检测核心函数
function checkCollisions() {
    if (!cubeMesh || propCubes.length === 0) return;

    // 计算主立方体的碰撞范围
    const cubeHalfSize = cubeConfig.size / 2;
    const cubeMinX = cubeMesh.position.x - cubeHalfSize;
    const cubeMaxX = cubeMesh.position.x + cubeHalfSize;
    const cubeMinZ = cubeMesh.position.z - cubeHalfSize;
    const cubeMaxZ = cubeMesh.position.z + cubeHalfSize;

    // 遍历所有道具立方体检查碰撞
    for (let i = propCubes.length - 1; i >= 0; i--) {
        const prop = propCubes[i];
        const propHalfSize = prop.mesh.geometry.parameters.width / 2;
        const propX = prop.mesh.position.x;
        const propZ = prop.mesh.position.z;

        // 简单的轴对齐碰撞检测
        if (propX + propHalfSize > cubeMinX &&
            propX - propHalfSize < cubeMaxX &&
            propZ + propHalfSize > cubeMinZ &&
            propZ - propHalfSize < cubeMaxZ) {

            // 发生碰撞，处理碰撞逻辑
            handleCollision(prop, i);
            break; // 一次只处理一个碰撞
        }
    }
}

// 处理碰撞后的逻辑
function handleCollision(propCube, index) {
    const multiplier = 1.2;

    // 保存当前状态作为过渡起点（关键修复：确保从当前实际值开始过渡）
    const startSize = cubeConfig.size;
    const targetSize = startSize * multiplier;
    const startColor = new THREE.Color(cubeMesh.material.color);
    const targetColor = new THREE.Color(propCube.mesh.material.color);
    const startDistance = distance;
    const targetDistance = startDistance * multiplier;
    const startCameraY = camera.position.y;
    const targetCameraY = startCameraY * multiplier;

    // 立即移除道具（保持不变）
    scene.remove(propCube.mesh);
    propCubes.splice(index, 1);
    sendPropDeletion(propCube.id);

    // 启动过渡动画（关键修复：明确传递所有必要参数）
    startTransition({
        startSize,
        targetSize,
        startColor,
        targetColor,
        startDistance,
        targetDistance,
        startCameraY,
        targetCameraY,
        duration: 1000 // 1秒过渡
    });
}

// 过渡状态管理（关键修复：避免状态覆盖和未定义变量）
let transitionState = null;

function startTransition(params) {
    // 确保前一个过渡完成后再开始新的
    if (transitionState) return;

    transitionState = {
        ...params,
        startTime: performance.now(),
        currentProgress: 0
    };
}

function updateTransition() {
    if (!transitionState) return;

    const {
        startTime,
        duration,
        startSize,
        targetSize,
        startColor,
        targetColor,
        startDistance,
        targetDistance,
        startCameraY,
        targetCameraY
    } = transitionState;

    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1); // 0-1之间的进度值
    const easeProgress = easeOutQuad(progress); // 缓动处理

    // 更新立方体大小（关键修复：基于起始值计算，避免累积错误）
    const currentSize = startSize + (targetSize - startSize) * easeProgress;
    cubeConfig.size = currentSize;
    cubeMesh.position.y = currentSize / 2 + floorYPosition + 0.001 * cubeConfig.renderOrder * cubeConfig.renderOrder;
    cubeMesh.scale.set(
        currentSize / cubeMesh.geometry.parameters.width,
        currentSize / cubeMesh.geometry.parameters.height,
        currentSize / cubeMesh.geometry.parameters.depth
    );

    // 更新颜色（关键修复：确保颜色插值正确）
    cubeMesh.material.color.copy(startColor).lerp(targetColor, easeProgress);
    cubeConfig.color = '#' + cubeMesh.material.color.getHexString();

    // 更新相机（关键修复：避免相机位置异常）
    distance = startDistance + (targetDistance - startDistance) * easeProgress;
    camera.position.y = startCameraY + (targetCameraY - startCameraY) * easeProgress;
    fixedCameraY = camera.position.y; // 同步固定相机Y值

    // 过渡结束处理（关键修复：确保最终状态正确应用）
    if (progress === 1) {
        // saveCubePosition(); // 只在过渡完成后保存最终状态
        cubeConfig.renderOrder += 1;
        cubeMesh.renderOrder = cubeConfig.renderOrder;
        transitionState = null; // 重置过渡状态
    }
}

// 缓动函数（保持不变）
function easeOutQuad(t) {
    return t * (2 - t);
}

// 发送道具删除消息到后端
function sendPropDeletion(propId) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({
            type: 'DELETE_PROP',
            id: propId
        });
        socket.send(message);
    } else {
        console.error('WebSocket连接未建立，无法发送删除请求');
    }
}

// 处理后端广播的道具删除消息
function handlePropDeletion(propId) {
    for (let i = propCubes.length - 1; i >= 0; i--) {
        if (propCubes[i].id === propId) {
            scene.remove(propCubes[i].mesh);
            propCubes.splice(i, 1);
            break;
        }
    }
}

// 初始化碰撞检测
function initCollisionDetection() {
    // 只保留WebSocket消息监听逻辑
    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.type === 'DELETE_PROP') {
            handlePropDeletion(data.id);
        } else {
            // 保留原有的道具添加逻辑
            console.log('收到新道具:', data);
            addPropCubeToScene(data);
        }
    };
}

// 初始化碰撞检测
document.addEventListener('DOMContentLoaded', initCollisionDetection);