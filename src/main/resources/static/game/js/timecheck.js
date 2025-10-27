const gameTimer = document.getElementById('game-timer');
let timeCheckInterval;
let isTimeExpired = false;
let renderScene = true;

// 处理登录状态异常的通用函数
function handleLoginError() {
    console.error('未找到登录Token，无法进入游戏');
    alert('登录状态异常，请重新登录');
    const logoutForm = document.createElement('form');
    logoutForm.action = '/logout';
    logoutForm.method = 'post';
    document.body.appendChild(logoutForm);
    logoutForm.submit();
}

// 初始化时间检查
function initTimeCheck() {
    if (isTimeExpired) return;
    // 清除可能存在的旧定时器（避免重复创建）
    if (timeCheckInterval) {
        clearInterval(timeCheckInterval);
    }
    // handleTimeExpired();
    // 每秒检查一次时间
    timeCheckInterval = setInterval(() => {
        // 强制清除定时器，确保不再发送请求
        if (isTimeExpired) {
            clearInterval(timeCheckInterval);
            timeCheckInterval = null; // 清空定时器引用
        }
        fetch('/api/game/time', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
            .then(response => {
                // 检查HTTP响应状态
                if (!response.ok) {
                    throw new Error('请求失败: ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                if (data.remainingTime) {
                    gameTimer.textContent = data.remainingTime;

                    // 检查时间是否为00:00
                    if (data.remainingTime === '00:00') {
                        // 强制清除定时器，确保不再发送请求
                        if (timeCheckInterval) {
                            clearInterval(timeCheckInterval);
                            timeCheckInterval = null; // 清空定时器引用
                        }
                        handleTimeExpired();
                        isTimeExpired = true;
                    }
                }
            })
            .catch(error => {
                console.error('获取时间失败:', error);
                // 调用登录状态异常处理函数
                handleLoginError();
                // 清除定时器避免重复错误
                clearInterval(timeCheckInterval);
            });
    }, 1000);
}

// 处理时间结束逻辑
function handleTimeExpired() {
    // 1. 不退出全屏（移除原退出全屏代码）
    // 在控制台输出信息
    console.log('游戏时间结束！');
    renderScene = false;

    // 2. 移除聚光灯，添加白色环境光
    if (spotLight && spotLight.parent) {
        spotLight.parent.remove(spotLight);
    }
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1); // 白色环境光，强度1
    scene.add(ambientLight);

    // 3. 移除鼠标锁定，移除键盘监听事件
    // 退出指针锁定
    if (document.exitPointerLock) {
        document.exitPointerLock();
    } else if (document.mozExitPointerLock) {
        document.mozExitPointerLock();
    } else if (document.webkitExitPointerLock) {
        document.webkitExitPointerLock();
    }
    isPointerLocked = false;
    // 移除键盘事件监听（假设键盘事件处理函数为onKeyDown和onKeyUp）
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);

    // 4. 小地图动画效果
    const minimapContainer = document.getElementById('minimap-container');
    if (minimapContainer) {
        // 记录初始状态
        const startLeft = parseInt(minimapContainer.style.left) || 10;
        const startTop = parseInt(minimapContainer.style.top) || 10;
        const startSize = 200; // 初始大小
        const targetSize = Math.min(window.innerWidth, window.innerHeight)*0.8; // 目标大小为屏幕最小边
        const targetLeft = (window.innerWidth - targetSize) / 2; // 中心位置
        const targetTop = (window.innerHeight - targetSize) / 2;

        const duration = 3000; // 3秒动画
        const startTime = performance.now();

        // 动画函数
        function animateMap(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // 使用缓动函数使动画更平滑
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            // 计算当前状态
            const currentSize = startSize + (targetSize - startSize) * easeProgress;
            const currentLeft = startLeft + (targetLeft - startLeft) * easeProgress;
            const currentTop = startTop + (targetTop - startTop) * easeProgress;

            // 应用样式
            minimapContainer.style.left = `${currentLeft}px`;
            minimapContainer.style.top = `${currentTop}px`;
            minimapContainer.style.width = `${currentSize}px`;
            minimapContainer.style.height = `${currentSize}px`;

            // 更新小地图渲染器
            if (minimapRenderer) {
                minimapRenderer.setSize(currentSize, currentSize);
            }

            // 继续动画直到完成
            if (progress < 1) {
                requestAnimationFrame(animateMap);
                updateMinimap();
            } else {
                spreadWhiteLight();
            }
        }

        // 开始动画
        requestAnimationFrame(animateMap);
    }
}

/**
 * 从屏幕中心向四周散发白光，最终全屏变白
 * @param {number} duration - 动画持续时间（毫秒），默认2000ms
 */
function spreadWhiteLight(duration = 2000) {
    // 避免重复创建，先移除可能存在的旧光效元素
    const oldLight = document.getElementById('white-light-effect');
    if (oldLight) {
        oldLight.remove();
    }

    // 创建光效遮罩层
    const lightElement = document.createElement('div');
    lightElement.id = 'white-light-effect';

    // 设置基础样式
    Object.assign(lightElement.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none', // 不影响底层元素交互
        zIndex: 999999, // 确保在最上层
        transition: 'opacity 0s', // 初始不设置过渡，后续通过动画控制
        opacity: 0 // 初始完全透明
    });

    // 添加到页面
    document.body.appendChild(lightElement);

    // 强制重排，确保动画能正常触发
    void lightElement.offsetWidth;

    // 定义动画关键帧
    const keyframes = [
        {
            // 初始状态：中心小范围白光，完全透明
            background: 'radial-gradient(circle at center, white 0%, transparent 0%)',
            opacity: 0
        },
        {
            // 最终状态：全屏白光，完全不透明
            background: 'radial-gradient(circle at center, white 100%, white 100%)',
            opacity: 1
        }
    ];

    // 定义动画选项
    const options = {
        duration: duration,
        easing: 'ease-out', // 缓出效果，开始快结束慢
        fill: 'forwards' // 动画结束后保持最终状态
    };

    // 执行动画
    const animation = lightElement.animate(keyframes, options);

    // 动画结束后可以执行回调（可选）
    animation.onfinish = () => {
        // 确保最终状态正确
        lightElement.style.background = 'white';
        lightElement.style.opacity = 1;
        setTimeout(createGameEndBox, 300); // 延迟显示结束框
        removeWhiteLight();
    };

    return animation;
}

/**
 * 从全屏白光逐渐消失，最终完全移除白光效果
 * @param {number} duration - 动画持续时间（毫秒），默认2000ms
 */
function removeWhiteLight(duration = 2000) {
    // 获取已存在的白光元素，不存在则直接返回
    const lightElement = document.getElementById('white-light-effect');
    if (!lightElement) {
        return;
    }

    // 定义反向动画关键帧（从全屏白光到完全透明）
    const keyframes = [
        {
            // 初始状态：全屏白光，完全不透明
            background: 'radial-gradient(circle at center, white 100%, white 100%)',
            opacity: 1
        },
        {
            // 最终状态：中心小范围白光，完全透明
            background: 'radial-gradient(circle at center, white 0%, transparent 0%)',
            opacity: 0
        }
    ];

    // 定义动画选项
    const options = {
        duration: duration,
        easing: 'ease-in', // 缓入效果，开始慢结束快
        fill: 'forwards' // 动画结束后保持最终状态
    };

    // 执行反向动画
    const animation = lightElement.animate(keyframes, options);

    // 动画结束后移除元素，彻底清理
    animation.onfinish = () => {
        lightElement.remove();
        // 可在此添加动画结束后的其他逻辑，如恢复场景交互等
        // console.log('白光效果已完全移除');
    };

    return animation;
}

/**
 * 创建游戏结束展示框，包含可爱文案和小地图
 */
function createGameEndBox() {
    // 1. 创建主容器（限制最大高度并优化风格）
    const endBox = document.createElement('div');
    endBox.id = 'game-end-box';
    Object.assign(endBox.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '85%',
        maxWidth: '600px',
        maxHeight: '85vh', // 限制最大高度为屏幕高度的85%
        overflowY: 'auto', // 内容超出时可滚动
        background: 'linear-gradient(145deg, #fff9e6, #fff0f0)', // 柔和渐变背景，符合整体风格
        borderRadius: '30px', // 更大圆角更显可爱
        padding: '30px 25px',
        boxShadow: '0 15px 35px rgba(0, 191, 255, 0.3), 0 5px 15px rgba(255, 107, 107, 0.15)', // 多层阴影增强立体感
        zIndex: '1000000',
        border: '3px solid rgba(0, 191, 255, 0.5)', // 半透蓝边框呼应游戏主题色
        display: 'none'
    });

    // 2. 添加可爱标题（强化星空冒险主题）
    const title = document.createElement('h2');
    title.innerHTML = '✨ 冒险结束啦！✨';
    Object.assign(title.style, {
        textAlign: 'center',
        color: '#FF6B6B',
        margin: '0 0 20px 0',
        fontSize: '2rem',
        textShadow: '0 2px 8px rgba(255, 107, 107, 0.3), 0 0 15px rgba(0, 191, 255, 0.2)', // 呼应游戏标题光影效果
        fontFamily: 'Consolas, Monaco, monospace' // 与游戏标题字体统一
    });
    endBox.appendChild(title);

    // 3. 添加活泼文案（更贴合星空冒险主题）
    const message = document.createElement('p');
    message.innerHTML = `
        勇敢的小方块今天超努力探索星空呢！🌌<br>
        看看你在宇宙地图上留下的奇妙足迹吧～🗺️<br>
        收集了好多道具，成长值MAX！🚀<br>
        下次宇宙冒险也要加油哦！💫
    `;
    Object.assign(message.style, {
        textAlign: 'center',
        color: '#4A4A4A',
        fontSize: '1.2rem',
        lineHeight: '1.8',
        margin: '0 0 25px 0',
        fontFamily: 'Arial, sans-serif'
    });
    endBox.appendChild(message);

    // 4. 创建1:1比例地图容器（适配最大高度限制）
    const mapWrapper = document.createElement('div');
    Object.assign(mapWrapper.style, {
        width: '400px',
        height: '400px',
        // paddingBottom: '100%', // 固定1:1宽高比
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '15px',
        border: '3px solid #00BFFF',
        margin: '0 auto 25px', // 增加底部间距
        // maxWidth: '400px',
        // maxHeight: '400px',
        boxShadow: '0 5px 15px rgba(0, 191, 255, 0.2) inset' // 内阴影增强地图容器质感
    });
    endBox.appendChild(mapWrapper);

    // 5. 移动小地图到新容器（确保完全显示）
    const minimapContainer = document.getElementById('minimap-container');
    if (minimapContainer) {
        Object.assign(minimapContainer.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            border: 'none',
            objectFit: 'contain'
        });
        if (minimapRenderer) {
            const containerSize = mapWrapper.offsetWidth || 400;
            minimapRenderer.setSize(containerSize, containerSize);
        }
        mapWrapper.appendChild(minimapContainer);
    }

    // 6. 添加关闭按钮（风格与开始按钮统一）
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '返回立方基地 🏠';
    Object.assign(closeBtn.style, {
        display: 'block',
        margin: '25px auto 10px',
        padding: '12px 30px',
        background: 'rgba(0, 120, 215, 0.2)',
        border: '2px solid rgba(0, 191, 255, 0.5)',
        color: '#0078d7',
        borderRadius: '30px',
        fontSize: '1.1rem',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 191, 255, 0.3), inset 0 0 10px rgba(0, 191, 255, 0.2)',
        transition: 'all 0.3s ease',
        fontWeight: 'bold'
    });
    closeBtn.onmouseover = () => {
        closeBtn.style.transform = 'scale(1.05)';
        closeBtn.style.boxShadow = '0 6px 15px rgba(0, 191, 255, 0.4), inset 0 0 15px rgba(0, 191, 255, 0.3)';
    };
    closeBtn.onmouseout = () => {
        closeBtn.style.transform = 'scale(1)';
        closeBtn.style.boxShadow = '0 4px 12px rgba(0, 191, 255, 0.3), inset 0 0 10px rgba(0, 191, 255, 0.2)';
    };
    closeBtn.onclick = () => {
        // 显示加载状态（可选）
        // closeBtn.disabled = true;
        // closeBtn.textContent = '处理中...';

        // 获取认证token
        const token = localStorage.getItem('authToken');

        if (token) {
            // 通知后端删除所有数据
            fetch('/api/game/clearAllData', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            }).then(response => {
                if (response.ok) {
                    // 后端处理成功，执行跳转
                    endBox.style.opacity = '0';
                    endBox.style.transform = 'translate(-50%, -50%) scale(0.8)';
                    setTimeout(() => {
                        endBox.remove();
                        window.location.href = '/'; // 跳转后后端会通过thymeleaf设置hasSaveData=false
                    }, 300);
                } else {
                    throw new Error('清理数据失败');
                }
            }).catch(error => {
                console.error('数据清理失败:', error);
                alert('数据清理失败，请重试');
                // 恢复按钮状态
                closeBtn.disabled = false;
                closeBtn.textContent = '关闭';
            });
        } else {
            // 无token时直接跳转（根据业务需求调整）
            endBox.style.opacity = '0';
            endBox.style.transform = 'translate(-50%, -50%) scale(0.8)';
            setTimeout(() => {
                endBox.remove();
                window.location.href = '/';
            }, 300);
        }
    };
    endBox.appendChild(closeBtn);

    // 7. 添加到页面并显示动画
    document.body.appendChild(endBox);
    setTimeout(() => {
        endBox.style.display = 'block';
        endBox.style.animation = 'popIn 0.6s ease-out forwards';
    }, 500);

    // 添加入场动画样式（增强弹跳感）
    const style = document.createElement('style');
    style.textContent = `
        @keyframes popIn {
            0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
            80% { transform: translate(-50%, -50%) scale(1.08); }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        #game-end-box::-webkit-scrollbar {
            width: 8px;
        }
        #game-end-box::-webkit-scrollbar-thumb {
            background: rgba(0, 191, 255, 0.3);
            border-radius: 4px;
        }
        #game-end-box::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.5);
            border-radius: 4px;
        }
    `;
    document.head.appendChild(style);
}