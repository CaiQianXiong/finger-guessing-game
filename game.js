// 游戏状态
const gameState = {
    isRunning: false,
    playerScore: 0,
    aiScore: 0,
    drawScore: 0,
    currentRound: 0,
    maxRounds: 5, // 默认5局
    lastGesture: null,
    gameInterval: null,
    difficulty: 'medium' // 默认中等难度: 'easy', 'medium', 'hard'
};

// DOM元素
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const statusIndicator = document.getElementById('statusIndicator');
const playerChoice = document.getElementById('playerChoice');
const aiChoice = document.getElementById('aiChoice');
const resultMessage = document.getElementById('resultMessage');
const playerScore = document.getElementById('playerScore');
const aiScore = document.getElementById('aiScore');
const drawScore = document.getElementById('drawScore');
const roundsValue = document.getElementById('roundsValue');
const roundsProgress = document.getElementById('roundsProgress');
const decreaseRoundsBtn = document.getElementById('decreaseRounds');
const increaseRoundsBtn = document.getElementById('increaseRounds');
const resultOverlay = document.getElementById('resultOverlay');
const resultModal = document.getElementById('resultModal');
const resultIcon = document.getElementById('resultIcon');
const resultTitle = document.getElementById('resultTitle');
const finalPlayerScore = document.getElementById('finalPlayerScore');
const finalAiScore = document.getElementById('finalAiScore');
const finalDrawScore = document.getElementById('finalDrawScore');
const playAgainBtn = document.getElementById('playAgainBtn');
const closeResultBtn = document.getElementById('closeResultBtn');

// MediaPipe Hands配置（延迟初始化，等待库加载完成）
let hands = null;
let handsInitialized = false;

function initializeMediaPipe() {
    if (typeof Hands === 'undefined') {
        console.log('等待MediaPipe Hands库加载...');
        setTimeout(initializeMediaPipe, 100);
        return;
    }

    if (handsInitialized) return;
    
    try {
        hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        hands.onResults(onResults);
        handsInitialized = true;
        console.log('MediaPipe Hands初始化成功');
    } catch (error) {
        console.error('MediaPipe Hands初始化失败:', error);
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMediaPipe);
} else {
    initializeMediaPipe();
}

// 手势识别结果处理
function onResults(results) {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // 绘制手部关键点
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                color: '#00FF00',
                lineWidth: 2
            });
            drawLandmarks(ctx, landmarks, {
                color: '#FF0000',
                lineWidth: 1,
                radius: 3
            });
        }

        // 识别手势
        const gesture = recognizeGesture(results.multiHandLandmarks[0]);
        gameState.lastGesture = gesture;
        
        if (gameState.isRunning) {
            updateStatus(`检测到: ${getGestureName(gesture)}`, 'detecting');
        }
    } else {
        if (gameState.isRunning) {
            updateStatus('请将手放在摄像头前', 'active');
        }
    }

    ctx.restore();
}

// 手势识别算法
function recognizeGesture(landmarks) {
    // 获取关键点坐标
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    const thumbMCP = landmarks[2];
    const indexMCP = landmarks[5];
    const middleMCP = landmarks[9];
    const ringMCP = landmarks[13];
    const pinkyMCP = landmarks[17];

    // 计算手指是否伸直
    const isThumbUp = thumbTip.y < thumbMCP.y;
    const isIndexUp = indexTip.y < indexMCP.y;
    const isMiddleUp = middleTip.y < middleMCP.y;
    const isRingUp = ringTip.y < ringMCP.y;
    const isPinkyUp = pinkyTip.y < pinkyMCP.y;

    // 计算伸出的手指数量
    const fingersUp = [isThumbUp, isIndexUp, isMiddleUp, isRingUp, isPinkyUp].filter(Boolean).length;

    // 判断手势
    // 石头：所有手指都握拳（0-1个手指伸出）
    if (fingersUp <= 1) {
        return 'rock';
    }
    // 剪刀：只有食指和中指伸出（2个手指伸出，且是相邻的）
    else if (fingersUp === 2 && isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) {
        return 'scissors';
    }
    // 布：所有手指都伸出（4-5个手指伸出）
    else if (fingersUp >= 4) {
        return 'paper';
    }
    
    // 无法识别
    return null;
}

// 获取手势名称
function getGestureName(gesture) {
    const names = {
        'rock': '✊ 石头',
        'scissors': '✌️ 剪刀',
        'paper': '✋ 布',
        null: '未识别'
    };
    return names[gesture] || '未识别';
}

// 获取手势emoji
function getGestureEmoji(gesture) {
    const emojis = {
        'rock': '✊',
        'scissors': '✌️',
        'paper': '✋',
        null: '-'
    };
    return emojis[gesture] || '-';
}

// AI出拳（根据难度选择策略）
function aiChoose() {
    const choices = ['rock', 'scissors', 'paper'];
    const difficulty = gameState.difficulty;
    
    // 简单难度：完全随机
    if (difficulty === 'easy') {
        return choices[Math.floor(Math.random() * choices.length)];
    }
    
    // 中等难度：20%概率克制玩家，80%随机
    if (difficulty === 'medium') {
        if (gameState.lastGesture && Math.random() < 0.2) {
            // 20%的概率克制玩家
            if (gameState.lastGesture === 'rock') {
                return 'paper'; // 布包石头
            } else if (gameState.lastGesture === 'paper') {
                return 'scissors'; // 剪刀剪布
            } else if (gameState.lastGesture === 'scissors') {
                return 'rock'; // 石头砸剪刀
            }
        }
        // 80%的概率随机出拳
        return choices[Math.floor(Math.random() * choices.length)];
    }
    
    // 困难难度：40%概率克制玩家，60%随机
    if (difficulty === 'hard') {
        if (gameState.lastGesture && Math.random() < 0.4) {
            // 40%的概率克制玩家
            if (gameState.lastGesture === 'rock') {
                return 'paper'; // 布包石头
            } else if (gameState.lastGesture === 'paper') {
                return 'scissors'; // 剪刀剪布
            } else if (gameState.lastGesture === 'scissors') {
                return 'rock'; // 石头砸剪刀
            }
        }
        // 60%的概率随机出拳
        return choices[Math.floor(Math.random() * choices.length)];
    }
    
    // 默认随机
    return choices[Math.floor(Math.random() * choices.length)];
}

// 判断胜负
function judgeRound(player, ai) {
    if (player === ai) {
        return 'draw';
    }
    
    if (
        (player === 'rock' && ai === 'scissors') ||
        (player === 'scissors' && ai === 'paper') ||
        (player === 'paper' && ai === 'rock')
    ) {
        return 'win';
    }
    
    return 'lose';
}

// 进行一局游戏
function playRound() {
    if (!gameState.isRunning) return;
    
    const playerGesture = gameState.lastGesture;
    
    // 如果玩家没有做出有效手势，跳过这一局
    if (!playerGesture) {
        resultMessage.textContent = '请做出有效手势！';
        resultMessage.className = 'result-message';
        playerChoice.textContent = '-';
        aiChoice.textContent = '-';
        return;
    }
    
    const aiGesture = aiChoose();
    
    // 显示双方选择
    playerChoice.textContent = getGestureEmoji(playerGesture);
    aiChoice.textContent = getGestureEmoji(aiGesture);
    
    // 添加动画效果
    playerChoice.classList.add('animate');
    aiChoice.classList.add('animate');
    setTimeout(() => {
        playerChoice.classList.remove('animate');
        aiChoice.classList.remove('animate');
    }, 500);
    
    // 判断胜负
    const result = judgeRound(playerGesture, aiGesture);
    
    // 更新分数和显示结果
    if (result === 'win') {
        gameState.playerScore++;
        resultMessage.textContent = '🎉 你赢了！';
        resultMessage.className = 'result-message win';
    } else if (result === 'lose') {
        gameState.aiScore++;
        resultMessage.textContent = '😢 你输了！';
        resultMessage.className = 'result-message lose';
    } else {
        gameState.drawScore++;
        resultMessage.textContent = '🤝 平局！';
        resultMessage.className = 'result-message draw';
    }
    
    // 更新分数显示
    updateScores();
    
    gameState.currentRound++;
    
    // 更新进度显示
    updateRoundsProgress();
    
    // 检查是否达到总局数
    if (gameState.currentRound >= gameState.maxRounds) {
        // 游戏结束，显示结算画面
        endGame();
    }
}

// 更新局数进度显示
function updateRoundsProgress() {
    roundsProgress.textContent = `${gameState.currentRound}/${gameState.maxRounds}`;
}

// 结束游戏并显示结算画面
function endGame() {
    // 停止游戏循环
    if (gameState.gameInterval) {
        clearInterval(gameState.gameInterval);
        gameState.gameInterval = null;
    }
    
    gameState.isRunning = false;
    startBtn.textContent = '开始游戏';
    updateStatus('游戏结束', '');
    
    // 判断最终胜负
    const isWin = gameState.playerScore > gameState.aiScore;
    const isDraw = gameState.playerScore === gameState.aiScore;
    
    // 显示结算画面
    showResultScreen(isWin, isDraw);
}

// 显示结算画面
function showResultScreen(isWin, isDraw) {
    // 更新最终分数
    finalPlayerScore.textContent = gameState.playerScore;
    finalAiScore.textContent = gameState.aiScore;
    finalDrawScore.textContent = gameState.drawScore;
    
    if (isWin) {
        // 胜利画面
        resultIcon.textContent = '🎉';
        resultTitle.textContent = '恭喜获胜！';
        resultModal.className = 'result-modal win';
    } else if (isDraw) {
        // 平局画面
        resultIcon.textContent = '🤝';
        resultTitle.textContent = '平局！';
        resultModal.className = 'result-modal draw';
    } else {
        // 失败画面
        resultIcon.textContent = '😢';
        resultTitle.textContent = '很遗憾，你输了';
        resultModal.className = 'result-modal lose';
    }
    
    // 显示结算画面
    resultOverlay.style.display = 'flex';
    resultModal.classList.add('show');
    
    // 添加动画效果
    setTimeout(() => {
        resultModal.style.transform = 'scale(1)';
        resultModal.style.opacity = '1';
    }, 10);
}

// 关闭结算画面
function closeResultScreen() {
    resultModal.style.transform = 'scale(0.8)';
    resultModal.style.opacity = '0';
    setTimeout(() => {
        resultOverlay.style.display = 'none';
        resultModal.classList.remove('show');
    }, 300);
}

// 再来一局
function playAgain() {
    closeResultScreen();
    // 重置分数但保留设置
    gameState.playerScore = 0;
    gameState.aiScore = 0;
    gameState.drawScore = 0;
    gameState.currentRound = 0;
    updateScores();
    updateRoundsProgress();
    resultMessage.textContent = '准备开始新游戏...';
    resultMessage.className = 'result-message';
    playerChoice.textContent = '-';
    aiChoice.textContent = '-';
}

// 更新分数显示
function updateScores() {
    playerScore.textContent = gameState.playerScore;
    aiScore.textContent = gameState.aiScore;
    drawScore.textContent = gameState.drawScore;
}

// 更新状态指示器
function updateStatus(text, className) {
    statusIndicator.textContent = text;
    statusIndicator.className = `status-indicator ${className || ''}`;
}

// 检查摄像头权限和可用性
async function checkCameraPermission() {
    try {
        // 检查是否支持getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return {
                available: false,
                error: '您的浏览器不支持摄像头访问功能，请使用Chrome、Edge或Firefox浏览器'
            };
        }

        // 检查权限状态（如果浏览器支持）
        if (navigator.permissions && navigator.permissions.query) {
            try {
                const permissionStatus = await navigator.permissions.query({ name: 'camera' });
                if (permissionStatus.state === 'denied') {
                    return {
                        available: false,
                        error: '摄像头权限已被拒绝，请在浏览器设置中允许访问摄像头'
                    };
                }
            } catch (e) {
                // 某些浏览器可能不支持permissions API，继续尝试
                console.log('无法检查权限状态，继续尝试访问摄像头');
            }
        }

        return { available: true };
    } catch (error) {
        return {
            available: false,
            error: '无法检查摄像头权限: ' + error.message
        };
    }
}

// 启动摄像头
async function startCamera() {
    try {
        // 检查MediaPipe是否已加载
        if (!handsInitialized || typeof Camera === 'undefined') {
            alert('MediaPipe库正在加载中，请稍候再试');
            return false;
        }

        // 检查摄像头权限
        const permissionCheck = await checkCameraPermission();
        if (!permissionCheck.available) {
            alert(permissionCheck.error + '\n\n解决方案：\n1. 点击地址栏左侧的摄像头图标\n2. 选择"允许"\n3. 或前往系统设置 > 安全性与隐私 > 摄像头，允许浏览器访问');
            return false;
        }

        // 尝试获取摄像头流
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });
        } catch (getUserMediaError) {
            // 如果facingMode失败，尝试不使用它
            if (getUserMediaError.name === 'OverconstrainedError' || getUserMediaError.name === 'ConstraintNotSatisfiedError') {
                console.log('尝试不使用facingMode约束');
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 }
                    }
                });
            } else {
                throw getUserMediaError;
            }
        }
        
        console.log('✅ 成功获取视频流，轨道数:', stream.getVideoTracks().length);
        
        // 检查视频轨道状态
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
            console.log('📹 视频轨道信息:', {
                label: videoTrack.label,
                enabled: videoTrack.enabled,
                readyState: videoTrack.readyState,
                settings: videoTrack.getSettings()
            });
        }
        
        // 清除之前的流（如果有）
        if (video.srcObject) {
            const oldStream = video.srcObject;
            oldStream.getTracks().forEach(track => {
                track.stop();
                console.log('🛑 停止旧的视频轨道');
            });
        }
        
        // 确保视频元素可见
        video.style.display = 'block';
        video.style.visibility = 'visible';
        
        // 设置视频源
        video.srcObject = stream;
        console.log('📺 视频源已设置，准备加载...');
        
        // 尝试立即播放（某些浏览器允许）
        video.play().catch(err => {
            console.log('📹 立即播放被阻止（正常，等待元数据）:', err.message);
        });
        
        // 确保视频播放和显示
        await new Promise((resolve, reject) => {
            let resolved = false;
            let checkInterval = null;
            let timeout = null;
            
            const initializeVideo = () => {
                if (resolved) return;
                resolved = true;
                if (timeout) clearTimeout(timeout);
                if (checkInterval) clearInterval(checkInterval);
                
                try {
                    // 确保有有效的视频尺寸
                    const width = video.videoWidth || 640;
                    const height = video.videoHeight || 480;
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    console.log('视频尺寸:', width, 'x', height);
                    
                    // 确保视频元素可见
                    video.style.display = 'block';
                    video.style.visibility = 'visible';
                    
                    // 尝试播放视频
                    const playPromise = video.play();
                    if (playPromise !== undefined) {
                        playPromise.then(() => {
                            console.log('视频播放成功');
                            updateStatus('摄像头已启动', 'active');
                            resolve();
                        }).catch((err) => {
                            console.warn('视频自动播放被阻止:', err);
                            // 即使播放失败也继续，可能是自动播放策略限制
                            updateStatus('摄像头已启动（点击视频手动播放）', 'active');
                            // 添加点击事件让用户手动播放
                            video.addEventListener('click', () => {
                                video.play().catch(e => console.error('手动播放失败:', e));
                            }, { once: true });
                            resolve();
                        });
                    } else {
                        // 旧浏览器可能不支持play()返回Promise
                        updateStatus('摄像头已启动', 'active');
                        resolve();
                    }
                } catch (err) {
                    console.error('初始化视频失败:', err);
                    reject(err);
                }
            };
            
            // 检查视频是否已经准备好了
            let lastReadyState = -1;
            const checkVideoReady = () => {
                const readyState = video.readyState;
                const stateNames = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
                
                // 只在状态改变时输出日志
                if (readyState !== lastReadyState) {
                    console.log('🔍 视频状态变化:', {
                        readyState: readyState,
                        stateName: stateNames[readyState] || 'UNKNOWN',
                        videoWidth: video.videoWidth,
                        videoHeight: video.videoHeight,
                        paused: video.paused,
                        trackState: videoTrack?.readyState
                    });
                    lastReadyState = readyState;
                }
                
                if (readyState >= video.HAVE_METADATA) {
                    console.log('✅ 视频元数据已就绪，readyState:', readyState);
                    initializeVideo();
                    return true;
                }
                return false;
            };
            
            // 立即检查一次（可能已经准备好了）
            console.log('🔍 立即检查视频状态...');
            if (checkVideoReady()) {
                return;
            }
            
            // 监听元数据加载事件
            video.onloadedmetadata = () => {
                console.log('📡 onloadedmetadata 事件触发');
                checkVideoReady();
            };
            
            // 监听canplay事件（更可靠）
            video.oncanplay = () => {
                console.log('📡 oncanplay 事件触发');
                if (!resolved && checkVideoReady()) {
                    return;
                }
            };
            
            // 监听loadeddata事件
            video.onloadeddata = () => {
                console.log('📡 onloadeddata 事件触发');
                if (!resolved && checkVideoReady()) {
                    return;
                }
            };
            
            // 定期检查视频状态（备用方案，每500ms检查一次，减少频率）
            let checkCount = 0;
            checkInterval = setInterval(() => {
                if (resolved) {
                    clearInterval(checkInterval);
                    return;
                }
                checkCount++;
                // 每5次检查（2.5秒）输出一次详细状态
                if (checkCount % 5 === 0) {
                    console.log(`🔍 第 ${checkCount} 次检查视频状态...`);
                }
                checkVideoReady();
            }, 500); // 改为500ms，减少日志输出
            
            // 设置超时（15秒）
            timeout = setTimeout(() => {
                if (!resolved) {
                    console.error('⏱️ 视频加载超时（15秒）');
                    // 最后检查一次
                    if (video.readyState >= video.HAVE_METADATA) {
                        console.log('✅ 超时检查：视频实际上已准备好');
                        initializeVideo();
                    } else {
                        // 检查视频轨道是否还在运行
                        if (videoTrack && videoTrack.readyState === 'live') {
                            console.warn('⚠️ 视频轨道正常，但视频元素未加载，尝试强制初始化和播放');
                            
                            // 尝试多种方法强制加载
                            try {
                                // 方法1: 重新设置 srcObject
                                video.srcObject = null;
                                setTimeout(() => {
                                    video.srcObject = stream;
                                    console.log('🔄 重新设置视频源');
                                    
                                    // 等待一小段时间后尝试播放
                                    setTimeout(() => {
                                        video.play().then(() => {
                                            console.log('✅ 强制播放成功');
                                            canvas.width = 640;
                                            canvas.height = 480;
                                            updateStatus('摄像头已启动', 'active');
                                            resolve();
                                        }).catch((playErr) => {
                                            console.warn('⚠️ 强制播放失败，但继续初始化:', playErr);
                                            canvas.width = 640;
                                            canvas.height = 480;
                                            updateStatus('摄像头已启动（点击视频手动播放）', 'active');
                                            // 添加点击播放
                                            video.addEventListener('click', () => {
                                                video.play().catch(e => console.error('手动播放失败:', e));
                                            }, { once: true });
                                            resolve();
                                        });
                                    }, 500);
                                }, 100);
                            } catch (forceErr) {
                                console.error('❌ 强制初始化失败:', forceErr);
                                // 即使失败也继续，至少让游戏可以运行
                                canvas.width = 640;
                                canvas.height = 480;
                                updateStatus('摄像头已启动（可能无法显示画面）', 'active');
                                resolve();
                            }
                        } else {
                            resolved = true;
                            if (checkInterval) clearInterval(checkInterval);
                            reject(new Error('视频加载超时，视频轨道状态: ' + (videoTrack?.readyState || 'unknown') + '，视频readyState: ' + video.readyState));
                        }
                    }
                }
            }, 15000); // 15秒超时
            
            // 清理定时器
            const originalResolve = resolve;
            const originalReject = reject;
            resolve = (...args) => {
                if (checkInterval) clearInterval(checkInterval);
                clearTimeout(timeout);
                originalResolve(...args);
            };
            reject = (...args) => {
                if (checkInterval) clearInterval(checkInterval);
                clearTimeout(timeout);
                originalReject(...args);
            };
            
            // 监听错误
            video.onerror = (err) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    if (checkInterval) clearInterval(checkInterval);
                    console.error('视频加载错误:', err, video.error);
                    reject(new Error('视频加载错误: ' + (video.error?.message || '未知错误')));
                }
            };
        });
        
        // 启动MediaPipe处理
        if (typeof Camera !== 'undefined') {
            const camera = new Camera(video, {
                onFrame: async () => {
                    if (hands) {
                        await hands.send({ image: video });
                    }
                },
                width: 640,
                height: 480
            });
            
            camera.start();
            console.log('MediaPipe Camera启动成功');
        } else {
            console.warn('Camera类未定义，使用备用方案');
            // 备用方案：手动处理视频帧
            const processFrame = () => {
                if (hands && video.readyState === video.HAVE_ENOUGH_DATA) {
                    hands.send({ image: video });
                }
                requestAnimationFrame(processFrame);
            };
            processFrame();
        }
        
        console.log('摄像头启动成功');
        return true;
    } catch (error) {
        console.error('启动摄像头失败:', error);
        let errorMsg = '无法访问摄像头';
        let solution = '';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMsg = '摄像头权限被拒绝';
            solution = '\n\n解决方案：\n1. 点击浏览器地址栏左侧的摄像头图标\n2. 选择"允许"或"始终允许"\n3. 如果看不到图标，请前往：\n   - Chrome/Edge: 设置 > 隐私和安全 > 网站设置 > 摄像头\n   - Safari: 系统偏好设置 > 安全性与隐私 > 摄像头\n4. 确保浏览器在允许列表中';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMsg = '未找到摄像头设备';
            solution = '\n\n解决方案：\n1. 检查摄像头是否已连接\n2. 检查摄像头是否被其他应用占用\n3. 尝试重启浏览器';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMsg = '摄像头被其他应用占用';
            solution = '\n\n解决方案：\n1. 关闭其他正在使用摄像头的应用（如Zoom、Skype等）\n2. 重启浏览器\n3. 检查系统设置中的摄像头权限';
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
            errorMsg = '摄像头不支持请求的设置';
            solution = '\n\n解决方案：\n1. 尝试使用其他浏览器\n2. 检查摄像头驱动是否最新';
        } else if (error.name === 'NotSupportedError') {
            errorMsg = '浏览器不支持摄像头访问';
            solution = '\n\n解决方案：\n1. 使用Chrome、Edge或Firefox浏览器\n2. 确保使用HTTPS或localhost';
        } else {
            solution = '\n\n错误详情: ' + error.message + '\n\n请尝试：\n1. 刷新页面\n2. 检查浏览器控制台（F12）查看详细错误\n3. 尝试使用其他浏览器';
        }
        
        alert(errorMsg + solution);
        updateStatus('摄像头启动失败', '');
        return false;
    }
}

// 开始游戏
async function startGame() {
    if (gameState.isRunning) {
        // 停止游戏
        gameState.isRunning = false;
        if (gameState.gameInterval) {
            clearInterval(gameState.gameInterval);
            gameState.gameInterval = null;
        }
        startBtn.textContent = '开始游戏';
        updateStatus('游戏已停止', '');
        return;
    }
    
    // 启动摄像头
    const cameraStarted = await startCamera();
    if (!cameraStarted) {
        return;
    }
    
    // 开始游戏
    gameState.isRunning = true;
    gameState.currentRound = 0; // 重置局数
    gameState.playerScore = 0;
    gameState.aiScore = 0;
    gameState.drawScore = 0;
    updateScores();
    updateRoundsProgress();
    startBtn.textContent = '停止游戏';
    updateStatus('游戏进行中...', 'active');
    resultMessage.textContent = '等待识别手势...';
    resultMessage.className = 'result-message';
    
    // 每3秒进行一局
    gameState.gameInterval = setInterval(() => {
        playRound();
    }, 3000);
    
    // 立即进行第一局（延迟1秒给用户准备时间）
    setTimeout(() => {
        playRound();
    }, 1000);
}

// 重置分数
function resetScores() {
    gameState.playerScore = 0;
    gameState.aiScore = 0;
    gameState.drawScore = 0;
    gameState.currentRound = 0;
    updateScores();
    updateRoundsProgress();
    resultMessage.textContent = '分数已重置';
    resultMessage.className = 'result-message';
    playerChoice.textContent = '-';
    aiChoice.textContent = '-';
}

// 难度选择功能
function setupDifficultySelector() {
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    
    difficultyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除所有活动状态
            difficultyButtons.forEach(b => b.classList.remove('active'));
            // 添加活动状态到当前按钮
            btn.classList.add('active');
            // 更新难度
            gameState.difficulty = btn.dataset.difficulty;
            console.log('难度已切换为:', gameState.difficulty);
        });
    });
}

// 局数调节功能
function setupRoundsSelector() {
    decreaseRoundsBtn.addEventListener('click', () => {
        if (gameState.maxRounds > 1) {
            gameState.maxRounds--;
            roundsValue.textContent = gameState.maxRounds;
            updateRoundsProgress();
        }
    });
    
    increaseRoundsBtn.addEventListener('click', () => {
        if (gameState.maxRounds < 10) {
            gameState.maxRounds++;
            roundsValue.textContent = gameState.maxRounds;
            updateRoundsProgress();
        }
    });
}

// 事件监听
startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetScores);
playAgainBtn.addEventListener('click', playAgain);
closeResultBtn.addEventListener('click', closeResultScreen);

// 点击遮罩关闭结算画面
resultOverlay.addEventListener('click', (e) => {
    if (e.target === resultOverlay) {
        closeResultScreen();
    }
});

// 初始化
updateScores();
updateRoundsProgress();
setupDifficultySelector();
setupRoundsSelector();

