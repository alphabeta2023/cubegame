// 顶点着色器代码
const vertexShader = `
// 这里放入 vt.glsl 中的内容
varying vec3 vColor;
uniform float time;
uniform float size;
uniform float progress;
uniform vec3 target;
uniform float radian;
uniform float cutStart;
uniform float cutEnd;
attribute float percent;
attribute vec3 color;

void main() {
    vec3 dispatchPos;

    float p = min(progress, 1.);
    float rp = p >= percent ? percent : p;

    if(rp > cutStart && rp < cutEnd) {
        rp = cutStart;
    }
    dispatchPos = position + (target - position) * rp;
    dispatchPos.y *= sin(rp * 0.4) * radian;

    vColor = color;

    vec4 viewPosition = modelViewMatrix * vec4(dispatchPos, 1.0);
    gl_Position = projectionMatrix * viewPosition;

    gl_PointSize = size;
    gl_PointSize *= (120. / -(modelViewMatrix * vec4(dispatchPos, 1.0)).z);
    gl_PointSize *= (0.2 + rp);
}
`;

// 片元着色器代码
const fragmentShader = `
// 这里放入 fm.glsl 中的内容
varying vec3 vColor;

void main() {
    float strength = distance(gl_PointCoord, vec2(0.5));
    strength = step(0.5, strength);
    strength = 1.0 - strength;
    gl_FragColor = vec4(vColor, strength);
}
`;


// 自定义流星材质
export const MeteorShaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 },
        size: { value: 20 },
        progress: { value: 0 },
        target: { value: new THREE.Vector3() },
        radian: { value: 0 },
        cutStart: { value: 0 },
        cutEnd: { value: 0 },
    },
    blending: THREE.AdditiveBlending,
    transparent: true,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    depthWrite: false,
});

// 流星类
export class MeteorClass {
    group = new THREE.Group();
    initial = {
        length: 10,
        deviation: 1,
    };
    target;
    numberOfPoints;
    color;
    clock = new THREE.Clock();
    t = 0;
    second;
    material;
    hideSecond;
    initSize;

    constructor(
        numberOfPoints = 1000,
        target = new THREE.Vector3(250, 20, 0),
        color = {
            left: new THREE.Color("#5555ff"),
            right: new THREE.Color("#00ffff"),
        },
        radian = 0,
        second = 3,
        hideSecond = 1,
        cut = [0, 0]
    ) {
        this.numberOfPoints = numberOfPoints;
        this.color = color;
        this.target = target;
        this.second = second;
        this.hideSecond = hideSecond;
        this.material = MeteorShaderMaterial.clone();
        this.initSize = this.material.uniforms.size.value;

        if (radian) this.material.uniforms.radian.value = radian;
        if (cut) {
            this.material.uniforms.cutStart.value = cut[0];
            this.material.uniforms.cutEnd.value = cut[1];
        }
        this.initObj();
    }

    genGeometry() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.numberOfPoints * 3);
        const colors = new Float32Array(this.numberOfPoints * 3);
        const percents = new Float32Array(this.numberOfPoints);
        const { left: leftColor, right: rightColor } = this.color;

        const gradientColor = {
            r: leftColor.r - rightColor.r,
            g: leftColor.g - rightColor.g,
            b: leftColor.b - rightColor.b,
        };

        for (let i = 0; i < this.numberOfPoints; i++) {
            const i3 = i * 3;
            positions[i3] = 0;
            positions[i3 + 1] = 0;
            positions[i3 + 2] = 0;

            // 检查是否有 NaN（开发环境调试用）
            if (isNaN(positions[i3]) || isNaN(positions[i3 + 1]) || isNaN(positions[i3 + 2])) {
                console.error(`Meteor position has NaN at index ${i}`);
            }

            const percent = i / this.numberOfPoints;
            percents[i] = percent;

            colors[i3] = leftColor.r - gradientColor.r * percent;
            colors[i3 + 1] = leftColor.g - gradientColor.g * percent;
            colors[i3 + 2] = leftColor.b - gradientColor.b * percent;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('percent', new THREE.BufferAttribute(percents, 1));
        return geometry;
    }

    initObj() {
        const geometry = this.genGeometry();
        this.material.uniforms.target.value = this.target;
        const mesh = new THREE.Points(geometry, this.material);
        this.group.add(mesh);
    }

    update() {
        let percent;
        if (this.second) {
            this.t += this.clock.getDelta();
            percent = this.t / this.second;

            if (percent >= 1 && this.hideSecond) {
                let over = 1 - (this.t - this.second) / this.hideSecond;
                if (over <= 0) {
                    this.t = 0;
                    over = 1;
                    percent = 0;
                }
                this.material.uniforms.size.value = this.initSize * over;
            }
        } else {
            percent = 0;
        }
        this.material.uniforms.progress.value = percent;
    }
}

// 流星管理器
window.MeteorManager = class MeteorManager {
    meteors = [];
    maxMeteors = 5;
    scene;

    constructor(scene) {
        this.scene = scene;
        this.initMeteors();
    }

    initMeteors() {
        // 初始创建一些流星
        for (let i = 0; i < this.maxMeteors; i++) {
            this.spawnMeteor();
        }
    }

    spawnMeteor() {
        // 随机流星参数
        const startX = (Math.random() - 0.5) * 1000;
        const startZ = (Math.random() - 0.5) * 1000;
        const targetX = (Math.random() - 0.5) * 1000;
        const targetZ = (Math.random() - 0.5) * 1000;

        const meteor = new MeteorClass(
            Math.floor(500 + Math.random() * 500),  // 关键修改：确保顶点数量为整数
            new THREE.Vector3(targetX, -200, targetZ),
            {
                left: new THREE.Color(`hsl(${Math.random() * 60}, 100%, 70%)`),
                right: new THREE.Color(`hsl(${Math.random() * 60}, 100%, 40%)`),
            },
            0.5 + Math.random() * 2,
            2 + Math.random() * 3,
            1 + Math.random()
        );

        meteor.group.position.set(startX, 50, startZ);
        meteor.group.rotation.z = Math.random() * Math.PI * 2;
        this.scene.add(meteor.group);
        console.log(meteor.group);
        this.meteors.push(meteor);
    }

    update() {
        this.meteors.forEach((meteor, index) => {
            meteor.update();
            // 回收已完成动画的流星并生成新的
            if (meteor.t > meteor.second + (meteor.hideSecond || 0)) {
                this.scene.remove(meteor.group);
                this.meteors.splice(index, 1);
                this.spawnMeteor();
            }
        });
    }
}