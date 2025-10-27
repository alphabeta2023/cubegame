let propCubes = [];

// 在立方体移动后添加保存位置的逻辑
function saveCubePosition() {
    if (!isPointerLocked) return;

    const cubeData = {
        position: {
            x: cubeMesh.position.x,
            y: cubeMesh.position.y - cubeConfig.renderOrder * cubeConfig.renderOrder * 0.001,
            z: cubeMesh.position.z
        },
        color: cubeConfig.color,
        size: cubeConfig.size,
        renderOrder: cubeConfig.renderOrder,
        cameraPosition: {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z
        }
    };

    // 发送位置信息到后端保存并绘制
    fetch('/api/cube/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(cubeData)
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized();
                    console.log(response.body);
                } else {
                    console.log("服务器验证失败，状态码: " + response.status);
                }
            }
        })
        .catch(err => {
            console.log("保存失败: " + err.message);
        });
}

// 统一的401错误处理函数（带用户提示）
function handleUnauthorized() {
    // 显示提示弹窗
    const alertDiv = document.createElement('div');
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '50%';
    alertDiv.style.left = '50%';
    alertDiv.style.transform = 'translate(-50%, -50%)';
    alertDiv.style.padding = '20px 30px';
    alertDiv.style.backgroundColor = '#fff';
    alertDiv.style.border = '1px solid #e0e0e0';
    alertDiv.style.borderRadius = '8px';
    alertDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.textAlign = 'center';
    alertDiv.innerHTML = `
        <p style="margin: 0 0 15px; color: #333; font-size: 16px;">登录已过期或未授权</p>
        <p style="margin: 0; color: #666; font-size: 14px;">即将返回登录页面...</p>
    `;
    document.body.appendChild(alertDiv);

    // 清除本地存储
    localStorage.removeItem('authToken');

    // 登出处理
    fetch('/logout', { method: 'POST' })
        .finally(() => {
            // 3秒后跳转，给用户看提示的时间
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
        });
}

// 全局变量：按[尺寸-渲染顺序]分组存储实例化网格
const planeInstanceGroups = new Map(); // key: `${size}-${renderOrder}`, value: { instancedMesh, count }
const geometryCache = new Map(); // 缓存不同尺寸的几何体，key: size

// 初始化指定尺寸的平面几何体（确保大小在geometry阶段确定）
function getPlaneGeometry(size) {
    if (!geometryCache.has(size)) {
        // 直接创建对应尺寸的几何体，不再通过缩放改变大小
        const geometry = new THREE.PlaneGeometry(size, size);
        geometryCache.set(size, geometry);
    }
    return geometryCache.get(size);
}

// 重写：创建平面的函数（大小在geometry时确定）
function createPlaneAtCubePosition() {
    const { size, renderOrder, color } = cubeConfig;
    const groupKey = `${size}-${renderOrder}`;

    // 获取或创建实例化网格组
    let group = planeInstanceGroups.get(groupKey);
    if (!group) {
        // 1. 获取对应尺寸的几何体（大小固定）
        const geometry = getPlaneGeometry(size);

        // 2. 创建共享材质（同组共享）
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(color),
            opacity: 1,
            // 启用多边形偏移
            polygonOffset: true,
            polygonOffsetFactor: 1,    // 坡度因子
            polygonOffsetUnits: 1      // 精度单位因子
        });

        // 3. 创建实例化网格
        const instancedMesh = new THREE.InstancedMesh(geometry, material, 1000);
        instancedMesh.renderOrder = renderOrder;
        scene.add(instancedMesh);

        group = {
            instancedMesh,
            count: 0
        };
        planeInstanceGroups.set(groupKey, group);
    }

    const { instancedMesh, count } = group;
    const matrix = new THREE.Matrix4();

    matrix.makeRotationX(-Math.PI / 2); // 旋转使平面与地面平行
    matrix.setPosition(
        cubeMesh.position.x,
        floorYPosition + renderOrder * renderOrder * 0.001, // 保持渲染层级偏移
        cubeMesh.position.z
    );

    // 检查是否需要扩容（当剩余容量小于10时）
    if (count >= instancedMesh.instanceMatrix.count - 10) {
        const currentCapacity = instancedMesh.instanceMatrix.count;
        const newCapacity = currentCapacity + 1000; // 每次扩容1000

        // 创建新的实例化网格
        const newInstancedMesh = new THREE.InstancedMesh(
            instancedMesh.geometry,
            instancedMesh.material,
            newCapacity
        );
        newInstancedMesh.renderOrder = instancedMesh.renderOrder;

        // 复制旧实例数据到新网格
        const tempMatrix = new THREE.Matrix4();
        for (let i = 0; i < currentCapacity; i++) {
            instancedMesh.getMatrixAt(i, tempMatrix);
            newInstancedMesh.setMatrixAt(i, tempMatrix);
        }

        // 更新新网格的实例矩阵
        newInstancedMesh.instanceMatrix.needsUpdate = true;

        // 替换场景中的网格
        scene.remove(instancedMesh);
        scene.add(newInstancedMesh);

        // 更新分组信息
        group.instancedMesh = newInstancedMesh;
        console.log(`实例化网格扩容: ${currentCapacity} -> ${newCapacity}`);
    }

    // 更新实例矩阵
    instancedMesh.setMatrixAt(count, matrix);
    instancedMesh.instanceMatrix.needsUpdate = true;
    group.count = count + 1;

    return instancedMesh;
}

// 连接WebSocket
const socket = new WebSocket('ws://' + window.location.host + '/ws/propcubes');

// 接收消息处理
socket.onmessage = function(event) {
    const propCube = JSON.parse(event.data);
    console.log('收到新道具:', propCube);
    // 添加道具到场景
    addPropCubeToScene(propCube);
};

// 创建立方体函数
// 创建立方体函数（添加发光效果）
function addPropCubeToScene(propCube) {
    const geometry = new THREE.BoxGeometry(propCube.size, propCube.size, propCube.size);

    // 创建带发光效果的材质
    const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(propCube.color),
        shininess: 80,
        // 添加发光效果
        emissive: new THREE.Color(propCube.color), // 使用与主色相同的发光颜色
        emissiveIntensity: 1, // 发光强度（0-1之间）
        transparent: true, // 允许透明
        opacity: 0.9 // 稍微降低不透明度增强发光感
    });

    const cube = new THREE.Mesh(geometry, material);
    // cube.castShadow = true; // 物体投射阴影
    // cube.receiveShadow = true; // 物体是否接收阴影

    // 设置位置
    cube.position.set(
        propCube.position.x,
        propCube.position.y,
        propCube.position.z
    );

    // 添加到场景
    scene.add(cube);

    // 存储引用
    propCubes.push({
        id: propCube.id,
        position: propCube.position.x,
        mesh: cube,
        rotationSpeed: propCube.rotationSpeed
    });
}

function constrainCubePosition() {
    const halfSize = cubeConfig.size / 2;
    const maxBound = floorSize / 2 - halfSize;
    const minBound = -maxBound;

    // 约束X轴位置
    if (cubeMesh.position.x > maxBound) {
        cubeMesh.position.x = maxBound;
    } else if (cubeMesh.position.x < minBound) {
        cubeMesh.position.x = minBound;
    }

    // 约束Z轴位置
    if (cubeMesh.position.z > maxBound) {
        cubeMesh.position.z = maxBound;
    } else if (cubeMesh.position.z < minBound) {
        cubeMesh.position.z = minBound;
    }
}

// 修改animate函数，在移动后调用保存方法和创建平面方法，同时添加碰撞检测
function animate() {
    requestAnimationFrame(animate);
    let moved = false;

    // 处理过渡动画
    updateTransition();

    // 处理立方体移动
    if (isPointerLocked) {
        const direction = getMovementDirection();

        // 检测立方体是否有移动
        if ((Math.abs(direction.x) > 0 || Math.abs(direction.z) > 0)) {
            if (!cubeMoved) {
                cubeMoved = true;
                movementHint.classList.add('hidden');
            }
            moved = true;
        }

        // 移动立方体（简化边界检查，只做基本判断）
        if (moved) {
            cubeMesh.position.x += direction.x * moveSpeed;
            cubeMesh.position.z += direction.z * moveSpeed;

            // 强制约束位置在合法范围内
            constrainCubePosition();
        }

        // 如果有移动则保存位置并创建平面
        if (moved) {
            saveCubePosition();
            createPlaneAtCubePosition();
        }
    }

    // 处理道具旋转
    propCubes.forEach(prop => {
        prop.mesh.rotation.y += prop.rotationSpeed * 0.01;
    });

    // 更新相机位置
    if (isPointerLocked) {
        camera.position.x = cubeMesh.position.x + Math.sin(yaw) * distance;
        camera.position.z = cubeMesh.position.z - Math.cos(yaw) * distance;
        camera.position.y = fixedCameraY;
        camera.lookAt(cubeMesh.position);
    }

    // 添加碰撞检测
    checkCollisions();

    if (renderScene) renderer.render(scene, camera);

    updateMinimap(); // 更新小地图

    updateStarfield(0.016);

    // // 更新流星效果
    // if (meteorManager) {
    //     meteorManager.update();
    // }
}