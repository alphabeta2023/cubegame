// 全局变量
// let meteorManager;
let scene, camera, renderer, cubeMesh, spotLight;
let distance, fixedCameraY, yaw;
let floorYPosition;
const floorSize = 1000;
let updateStarfield;

// 全局变量添加
let minimapCamera, minimapRenderer; // 新增小地图相机和渲染器
const minimapSize = 200; // 与HTML中设置的尺寸一致

function initThreeScene(cubeConfig, cameraConfig) {
    // 初始化场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // 创建相机
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        20,
        10 * floorSize
    );
    camera.position.set(cameraConfig.x, cameraConfig.y, cameraConfig.z);
    fixedCameraY = camera.position.y;

    // 创建立方体
    const geometry = new THREE.BoxGeometry(cubeConfig.size, cubeConfig.size, cubeConfig.size);
    const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(cubeConfig.color),
        shininess: 80,
        emissive: 0x111111
    });
    cubeMesh = new THREE.Mesh(geometry, material);
    cubeMesh.position.set(cubeConfig.position.x, cubeConfig.position.y + cubeConfig.renderOrder * cubeConfig.renderOrder * 0.001, cubeConfig.position.z);
    cubeMesh.renderOrder = cubeConfig.renderOrder;
    scene.add(cubeMesh);

    // 计算相机和立方体初始距离
    const deltaX = camera.position.x - cubeMesh.position.x;
    const deltaZ = camera.position.z - cubeMesh.position.z;
    distance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
    camera.lookAt(cubeMesh.position);
    yaw = Math.atan2(deltaX, -deltaZ);

    // 创建渲染器
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    // renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // 创建地板
    floorYPosition = cubeConfig.position.y - cubeConfig.size/2;

    const floorGeometry = new THREE.PlaneGeometry(floorSize + 0.1, floorSize + 0.1);

    // 创建地板边缘线框
    const floorEdges = new THREE.EdgesGeometry(floorGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000, // 红色
        linewidth: 1
    });
    const floorWireframe = new THREE.LineSegments(floorEdges, lineMaterial);
    floorWireframe.position.y = floorYPosition + 0.1;
    floorWireframe.rotation.x = -Math.PI / 2;
    scene.add(floorWireframe);

    createMapDataPlanes(floorYPosition);

    // 聚光灯参数部分
    spotLight = new THREE.SpotLight(0xFFFFFF, 1);
    // 设置聚光灯相对于相机的位置
    spotLight.position.set(0, 0.2 * cameraConfig.y, 0);
    // 照射角度
    spotLight.angle = Math.PI / 6;
    // 衰减距离
    spotLight.distance = 0;
    // 衰减指数
    // spotLight.decay = 2;
    // 边缘柔和度
    spotLight.penumbra = 0.9;
    // 设置阴影
    spotLight.castShadow = true;

    // 将聚光灯添加为相机子物体，随相机移动
    scene.add(camera);
    camera.add(spotLight);

    // 保持灯光目标指向立方体
    spotLight.target = cubeMesh;

    // // 添加环境光（用于基础照明）
    // const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.05);
    // scene.add(ambientLight);

    // 加载用户的道具Cube
    userPropCubes.forEach(propCube => {
        addPropCubeToScene(propCube); // 复用现有添加方法
    });

    // 初始化小地图
    initMinimap();

    // 初始绘制迷你地图
    updateMinimap();

    // 初始化流星系统
    // meteorManager = new MeteorManager(scene);

    updateStarfield = createStarfield();
}

// 新增：初始化小地图
function initMinimap() {
    // 获取小地图画布元素
    const minimapCanvas = document.getElementById('minimap');
    minimapCanvas.width = minimapSize;
    minimapCanvas.height = minimapSize;

    // 创建小地图正交相机 (位置设置在(0, -10, 0))
    const halfSize = floorSize / 2;
    minimapCamera = new THREE.OrthographicCamera(
        -halfSize-1, halfSize+1,  // 左右边界
        halfSize+1, -halfSize-1,  // 上下边界 (注意Y轴反转)
        0.1, floorSize * 100  // 近远平面
    );
    minimapCamera.position.set(0, 100, 0); // 设置相机位置
    minimapCamera.lookAt(0, 0, 0); // 看向原点

    // 创建小地图专用渲染器
    minimapRenderer = new THREE.WebGLRenderer({
        canvas: minimapCanvas,
        antialias: true,
        alpha: true
    });
    minimapRenderer.setSize(minimapSize, minimapSize);
}

// 修改：更新小地图函数
function updateMinimap() {
    if (!minimapRenderer || !minimapCamera) return;

    // 直接渲染正交相机看到的场景内容到小地图
    minimapRenderer.render(scene, minimapCamera);
}

// 新增：创建地图数据平面的函数
function createMapDataPlanes(floorYPosition) {
    // 1. 按尺寸和渲染顺序分组
    const groups = {};
    mapDataList.forEach(mapData => {
        const key = `${mapData.size}-${mapData.renderOrder}`;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(mapData);
    });

    // 2. 创建共享材质
    const material = new THREE.MeshPhongMaterial({
        vertexColors: THREE.InstanceColorUsage,
        opacity: 1,
        // 启用多边形偏移
        polygonOffset: true,
        polygonOffsetFactor: 1,    // 坡度因子
        polygonOffsetUnits: 1      // 精度单位因子
    });

    // 3. 为每个组创建InstancedMesh
    Object.values(groups).forEach(group => {
        const size = group[0].size;
        const renderOrder = group[0].renderOrder;

        const geometry = new THREE.PlaneGeometry(size, size);
        const instanceCount = group.length;

        const instancedMesh = new THREE.InstancedMesh(geometry, material, instanceCount);
        instancedMesh.renderOrder = renderOrder; // 设置渲染顺序

        // 复用矩阵和颜色对象，减少内存开销
        const matrix = new THREE.Matrix4();
        const color = new THREE.Color();

        // 4. 为每个实例设置位置、旋转和颜色
        for (let i = 0; i < instanceCount; i++) {
            const mapData = group[i];

            // 计算变换矩阵（先旋转再定位）
            matrix.makeRotationX(-Math.PI / 2); // 旋转使平面与地面平行
            matrix.setPosition(mapData.x, floorYPosition + renderOrder * renderOrder * 0.001, mapData.z); // 设置位置

            // 应用矩阵到实例
            instancedMesh.setMatrixAt(i, matrix);

            // 设置实例颜色
            color.set(mapData.color);
            instancedMesh.setColorAt(i, color);
        }

        // 5. 通知Three.js实例数据已更新
        instancedMesh.instanceMatrix.needsUpdate = true;
        instancedMesh.instanceColor.needsUpdate = true;

        // 添加到场景
        scene.add(instancedMesh);
    });
}

function createStarfield() {
    // 创建星空球体，半径为8倍地板尺寸
    const starfieldRadius = 8 * floorSize;

    // 创建星星数量
    const starCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    // 地面半宽（防止星星投影到地面内）
    const groundHalfSize = floorSize / 2;

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;

        // 在球面上生成随机点，但确保x,z投影不在地面内
        let x, y, z;
        do {
            // 生成球面上的随机点（一旦生成后位置固定）
            const theta = Math.random() * Math.PI * 2; // 方位角
            const phi = Math.random() * Math.PI; // 极角
            x = starfieldRadius * Math.sin(phi) * Math.cos(theta);
            y = starfieldRadius * Math.cos(phi);
            z = starfieldRadius * Math.sin(phi) * Math.sin(theta);
        } while (Math.abs(x) <= groundHalfSize && Math.abs(z) <= groundHalfSize);

        // 存储星星初始位置（固定值，后续不再修改）
        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;

        // 随机星星颜色（偏白和蓝色调，更真实）
        const color = new THREE.Color();
        const hue = 0.6 + Math.random() * 0.1; // 蓝色调
        const saturation = 0.1 + Math.random() * 0.2;
        const lightness = 0.5 + Math.random() * 0.5;
        color.setHSL(hue, saturation, lightness);

        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;

        // 随机星星大小
        sizes[i] = 100 + Math.random() * 150;
    }

    // 设置位置属性，并确保其不会被意外修改（设置为不可写）
    const positionAttribute = new THREE.BufferAttribute(positions, 3);
    positionAttribute.setUsage(THREE.StaticDrawUsage); // 标记为静态数据，提升性能且明确不修改
    geometry.setAttribute('position', positionAttribute);

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // 创建星星材质
    const starMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
        },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            uniform float time;
            
            void main() {
                vColor = color;
                // 直接使用初始位置计算视图坐标（位置不变）
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                
                // 星星微小闪烁效果（仅影响大小，不改变位置）
                float pulse = 1.0 + 0.5 * sin(time + position.x * 0.01);
                gl_PointSize = size * pulse * (150.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                // 圆形星星，中心亮边缘暗
                float distance = length(gl_PointCoord - vec2(0.5));
                float alpha = smoothstep(0.5, 0.0, distance);
                // 添加中心亮点
                alpha += 0.5 * smoothstep(0.2, 0.0, distance);
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });

    // 创建星星网格并添加到场景（直接添加到场景，无父对象变换影响位置）
    const starfield = new THREE.Points(geometry, starMaterial);
    scene.add(starfield);

    // 返回更新函数（仅更新闪烁时间，不涉及位置修改）
    return function updateStarfield(deltaTime) {
        starMaterial.uniforms.time.value += deltaTime;
    };
}